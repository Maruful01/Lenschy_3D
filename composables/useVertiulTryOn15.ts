import { ref, shallowRef, type Ref, onUnmounted } from "vue";
import * as cam from "@mediapipe/camera_utils";
import faceMeshModule from "@mediapipe/face_mesh";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import * as MP from "@mediapipe/tasks-vision";
console.log(MP);

interface Landmark {
  x: number;
  y: number;
  z: number;
}

const { FaceMesh } = faceMeshModule as any;

const LANDMARKS = {
  NOSE_BRIDGE: 168,
  FOREHEAD: 10,
  LEFT_EAR: 234,
  RIGHT_EAR: 454,
  LEFT_EYE_OUTER: 263,
  RIGHT_EYE_OUTER: 33,
};

const PLANE_WIDTH = 16;
const PLANE_Z = -5;

const DEPTH_SCALE_BASE = 40;
const MODEL_Z_SHIFT_BASE = -0.9;

const SCALE_FROM_EAR_K = 0.23;
const SCALE_FROM_EYE_K = 0.2;

const BRIDGE_OFFSET = new THREE.Vector3(0, -1, 0);
const SMOOTHING = 0.25;

const GLTF_TEMPLE_LEFT_NAME = "Temple_L_End";
const GLTF_TEMPLE_RIGHT_NAME = "Temple_R_End";

const DEPTH_REF_FALLBACK = 0.12;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type GlassesUserData = {
  prev?: { pos: THREE.Vector3; quat: THREE.Quaternion; scale: number };
  templeL?: THREE.Object3D | null;
  templeR?: THREE.Object3D | null;
};

export function useVirtualTryOn(
  glassesModelSrc: string,
  frameWidth: Ref<number>,
  videoRef: Ref<HTMLVideoElement | null>,
  canvasRef: Ref<HTMLCanvasElement | null>,
) {
  const cameraRef = ref<cam.Camera | null>(null);
  const lastError = ref<string | null>(null);

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera3d: THREE.PerspectiveCamera | null = null;
  let rafId = 0;
  let faceMesh: any | null = null;

  let depthRefRuntime = DEPTH_REF_FALLBACK;
  let depthRefReady = false;

  let planeH = 9;
  let cropX0 = 0,
    cropY0 = 0,
    cropW = 1,
    cropH = 1;

  const glassesContainer = shallowRef<
    (THREE.Group & { userData: GlassesUserData }) | null
  >(null);
  const isModelReady = ref(false);

  const getHost = (): HTMLElement | null =>
    (canvasRef.value?.parentElement as HTMLElement | null) ?? null;

  const getHostRect = () => {
    const host = getHost();
    const r = host?.getBoundingClientRect();
    return {
      w: Math.max(1, r?.width ?? host?.clientWidth ?? 1),
      h: Math.max(1, r?.height ?? host?.clientHeight ?? 1),
    };
  };

  const getSizeT = () => {
    const { w } = getHostRect();
    return clamp((w - 360) / (900 - 360), 0, 1);
  };

  const getDepthScale = (depthNorm: number) => {
    const t = getSizeT();
    const base = DEPTH_SCALE_BASE * (0.72 + 0.28 * t);
    return base / depthNorm;
  };

  const getModelZShift = () => {
    const t = getSizeT();
    return MODEL_Z_SHIFT_BASE - (1 - t) * 0.25;
  };

  const getYawBoostMax = () => {
    const t = getSizeT();
    return 0.12 + 0.13 * t;
  };

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const waitForRefs = async (maxMs = 1200) => {
    const start = performance.now();
    while (performance.now() - start < maxMs) {
      if (videoRef.value && canvasRef.value) return true;
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }
    return false;
  };

  let faceLandmarker: FaceLandmarker | null = null;

  const initFaceLandmarker = async () => {
    const fileset = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
        delegate: "GPU", // WebGPU when available, WASM fallback otherwise
      },
      runningMode: "VIDEO",
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true,
      numFaces: 1,
    });
  };

  let lastVideoTime = -1;

  const processVideoFrame = async () => {
    if (!videoRef.value || !faceLandmarker) return;

    const now = performance.now();
    if (videoRef.value.currentTime === lastVideoTime) return;

    lastVideoTime = videoRef.value.currentTime;

    const results = faceLandmarker.detectForVideo(videoRef.value, now);
    onResults(results);

    requestAnimationFrame(processVideoFrame);
  };

  const ensureOverlayStyles = () => {
    const v = videoRef.value;
    const c = canvasRef.value;
    const host = getHost();

    if (host) {
      const cs = getComputedStyle(host);
      if (cs.position === "static") host.style.position = "relative";
      host.style.overflow = host.style.overflow || "hidden";
    }

    if (v) {
      v.style.position = "absolute";
      v.style.inset = "0";
      v.style.width = "100%";
      v.style.height = "100%";
      v.style.objectFit = "cover";
      v.style.zIndex = "1";
      v.muted = true;
      v.autoplay = true;
      (v as any).playsInline = true;
    }

    if (c) {
      c.style.position = "absolute";
      c.style.inset = "0";
      c.style.width = "100%";
      c.style.height = "100%";
      c.style.pointerEvents = "none";
      c.style.zIndex = "2";
    }
  };

  const toPx = (L: Landmark[], i: number, vw: number, vh: number) =>
    new THREE.Vector3(L[i].x * vw, L[i].y * vh, L[i].z);

  const pxToWorld = (xPx: number, yPx: number) => {
    const x = ((xPx - cropX0) / cropW - 0.5) * PLANE_WIDTH;
    const y = (0.5 - (yPx - cropY0) / cropH) * planeH;
    return new THREE.Vector3(x, y, 0);
  };

  const toWorld3D = (ptPx: THREE.Vector3) => {
    const xy = pxToWorld(ptPx.x, ptPx.y);
    const z = ptPx.z * PLANE_WIDTH * -0.6;
    return new THREE.Vector3(xy.x, xy.y, z);
  };

  let lastLayoutSync = 0;
  const syncLayout = (force = false) => {
    const now = performance.now();
    if (!force && now - lastLayoutSync < 120) return;
    lastLayoutSync = now;

    const videoEl = videoRef.value;
    if (!videoEl || !renderer || !camera3d) return;

    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    if (!vw || !vh) return;

    const { w: viewW, h: viewH } = getHostRect();
    const Ac = viewW / viewH;
    const Av = vw / vh;

    planeH = PLANE_WIDTH / Ac;

    if (Av > Ac) {
      const rx = Ac / Av;
      cropX0 = (vw - vw * rx) / 2;
      cropY0 = 0;
      cropW = vw * rx;
      cropH = vh;
    } else {
      const ry = Av / Ac;
      cropX0 = 0;
      cropY0 = (vh - vh * ry) / 2;
      cropW = vw;
      cropH = vh * ry;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(viewW, viewH, false);

    camera3d.aspect = viewW / viewH;
    const t = getSizeT();
    camera3d.fov = 52 - 7 * t;
    camera3d.updateProjectionMatrix();
  };

  const onResize = () => syncLayout(true);
  const onOrientation = () => setTimeout(() => syncLayout(true), 250);

  const initThree = async () => {
    const canvas = canvasRef.value;
    if (!canvas) throw new Error("Canvas not found");

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    scene = new THREE.Scene();

    const { w, h } = getHostRect();
    camera3d = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
    camera3d.position.set(0, 0, 5);
    camera3d.lookAt(new THREE.Vector3(0, 0, PLANE_Z));

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(0, 2, 5);
    scene.add(dir);

    const loader = new GLTFLoader();
    loader.load(glassesModelSrc, (gltf) => {
      const model = gltf.scene;
      model.position.add(BRIDGE_OFFSET);

      const container = new THREE.Group() as THREE.Group & {
        userData: GlassesUserData;
      };
      container.userData = {};
      container.add(model);
      container.visible = false;

      let templeL: THREE.Object3D | null = null;
      let templeR: THREE.Object3D | null = null;

      model.traverse((node: any) => {
        if (!(node instanceof THREE.Mesh)) return;
        node.frustumCulled = false;
        const name = (node.name || "").toLowerCase();
        if (!templeL && name.includes(GLTF_TEMPLE_LEFT_NAME.toLowerCase()))
          templeL = node;
        if (!templeR && name.includes(GLTF_TEMPLE_RIGHT_NAME.toLowerCase()))
          templeR = node;
      });

      container.userData.templeL = templeL;
      container.userData.templeR = templeR;

      scene!.add(container);
      glassesContainer.value = container;
      isModelReady.value = true;
    });

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientation);

    const tick = () => {
      if (renderer && scene && camera3d) renderer.render(scene, camera3d);
      rafId = requestAnimationFrame(tick);
    };
    tick();

    syncLayout(true);
  };

  const onResults = (results: any) => {
    const videoEl = videoRef.value;
    const obj = glassesContainer.value;
    if (!videoEl || !obj) return;
    const matrixData = results.facialTransformationMatrixes?.[0]?.data;
    if (!matrixData) {
      obj.visible = false;
      return;
    }
    const threeMatrix = new THREE.Matrix4().fromArray(matrixData);
    const correctionMatrix = new THREE.Matrix4().makeScale(1, 1, -1);

    obj.matrixAutoUpdate = false;
    obj.matrix.copy(threeMatrix);
    obj.matrix.multiply(correctionMatrix);
    // obj.matrix.multiply(new THREE.Matrix4().makeTranslation(0, -0.01, 0.02));

    obj.visible = true;

    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    if (!vw || !vh) return;

    const faces = results?.multiFaceLandmarks;
    if (!faces?.[0]) {
      obj.visible = false;
      return;
    }
    if (!vw || !vh) return;

    syncLayout(false);

    const L = faces[0];

    const leftEyeOuter = toPx(L, LANDMARKS.LEFT_EYE_OUTER, vw, vh);
    const rightEyeOuter = toPx(L, LANDMARKS.RIGHT_EYE_OUTER, vw, vh);
    const noseBridge = toPx(L, LANDMARKS.NOSE_BRIDGE, vw, vh);
    const forehead = toPx(L, LANDMARKS.FOREHEAD, vw, vh);
    const leftEar = toPx(L, LANDMARKS.LEFT_EAR, vw, vh);
    const rightEar = toPx(L, LANDMARKS.RIGHT_EAR, vw, vh);

    const earDistPx = Math.hypot(
      rightEar.x - leftEar.x,
      rightEar.y - leftEar.y,
    );
    const eyeDistPx = Math.hypot(
      rightEyeOuter.x - leftEyeOuter.x,
      rightEyeOuter.y - leftEyeOuter.y,
    );

    const faceDepth = Math.abs(
      L[LANDMARKS.NOSE_BRIDGE].z - L[LANDMARKS.FOREHEAD].z,
    );
    if (!depthRefReady && faceDepth > 0.0001) {
      depthRefRuntime = faceDepth;
      depthRefReady = true;
    } else if (faceDepth > 0.0001) {
      depthRefRuntime = depthRefRuntime * 0.98 + faceDepth * 0.02;
    }

    const depthRef = clamp(depthRefRuntime, 0.06, 0.22);
    const depthNorm = clamp(faceDepth / depthRef, 0.75, 1.35);

    const pxToWorldEar = (PLANE_WIDTH / vw) * SCALE_FROM_EAR_K;
    const pxToWorldEye = (PLANE_WIDTH / vw) * SCALE_FROM_EYE_K;
    const combinedDist = earDistPx * 0.7 + eyeDistPx * 0.3;

    const baseScale =
      combinedDist *
      (pxToWorldEar * 0.7 + pxToWorldEye * 0.3) *
      frameWidth.value;

    const desiredScale = baseScale / depthNorm;

    const pLEar = toWorld3D(leftEar);
    const pREar = toWorld3D(rightEar);
    const pF = toWorld3D(forehead);
    const pN = toWorld3D(noseBridge);

    const xAxis = new THREE.Vector3().subVectors(pREar, pLEar).normalize();
    const yAxis = new THREE.Vector3().subVectors(pF, pN).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();

    const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(basis);

    const yawBoostMax = getYawBoostMax();
    const yawRad = Math.atan2(pREar.z - pLEar.z, pREar.x - pLEar.x);
    const yawAbs = Math.min(Math.abs(yawRad), Math.PI / 4);
    const yawFactor = 1 + yawBoostMax * (yawAbs / (Math.PI / 4));

    const finalScale = desiredScale * yawFactor;

    const bridgeWorld = pxToWorld(noseBridge.x, noseBridge.y);
    const depthScale = getDepthScale(depthNorm);
    const positionZ = PLANE_Z + getModelZShift() + noseBridge.z * depthScale;

    const targetPos = new THREE.Vector3(
      bridgeWorld.x,
      bridgeWorld.y,
      positionZ,
    );

    if (!obj.userData.prev) {
      obj.userData.prev = {
        pos: targetPos.clone(),
        quat: targetQuat.clone(),
        scale: finalScale,
      };
      obj.position.copy(targetPos);
      obj.quaternion.copy(targetQuat);
      obj.scale.setScalar(finalScale);
    } else {
      const prev = obj.userData.prev;
      obj.position.lerpVectors(prev.pos, targetPos, 1 - SMOOTHING);
      obj.quaternion.slerpQuaternions(prev.quat, targetQuat, 1 - SMOOTHING);
      const s = prev.scale * SMOOTHING + finalScale * (1 - SMOOTHING);
      obj.scale.setScalar(s);
      prev.pos.copy(obj.position);
      prev.quat.copy(obj.quaternion);
      prev.scale = s;
    }

    obj.visible = true;
  };

  const startCamera = async () => {
    if (import.meta.server) return;
    lastError.value = null;

    const ok = await waitForRefs();
    if (!ok) return;

    const videoEl = videoRef.value!;
    ensureOverlayStyles();

    if (!renderer) await initThree();

    const prevStream = videoEl.srcObject as MediaStream | null;
    prevStream?.getTracks().forEach((t) => t.stop());

    depthRefRuntime = DEPTH_REF_FALLBACK;
    depthRefReady = false;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    });

    videoEl.srcObject = stream;
    await videoEl.play();

    await new Promise<void>((r) =>
      videoEl.videoWidth
        ? r()
        : videoEl.addEventListener("loadedmetadata", () => r(), { once: true }),
    );

    syncLayout(true);

    faceMesh = new FaceMesh({
      locateFile: (f: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    faceMesh.onResults(onResults);

    cameraRef.value = new cam.Camera(videoEl, {
      onFrame: async () => faceMesh && faceMesh.send({ image: videoEl }),
      width: videoEl.videoWidth,
      height: videoEl.videoHeight,
    });

    cameraRef.value.start();
  };

  const stopCamera = () => {
    cameraRef.value?.stop();
    cameraRef.value = null;

    const stream = videoRef.value?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.value) videoRef.value.srcObject = null;

    glassesContainer.value && (glassesContainer.value.visible = false);
    faceMesh?.close?.();
    faceMesh = null;
  };

  onUnmounted(() => {
    stopCamera();
    rafId && cancelAnimationFrame(rafId);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("orientationchange", onOrientation);
    renderer?.dispose?.();
  });

  return {
    isModelReady,
    glassesContainer,
    lastError,
    startCamera,
    stopCamera,
  };
}
