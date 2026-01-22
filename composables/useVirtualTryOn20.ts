import { ref, shallowRef, type Ref, onUnmounted } from "vue";
import * as cam from "@mediapipe/camera_utils";
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface Landmark {
  x: number;
  y: number;
  z: number;
}

const BRIDGE_OFFSET = new THREE.Vector3(0, 1.01, 0.05);
const SMOOTHING = 0.25;

const GLTF_TEMPLE_LEFT_NAME = "Temple_L_End";
const GLTF_TEMPLE_RIGHT_NAME = "Temple_R_End";

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

  const _pos = new THREE.Vector3();
  const _quat = new THREE.Quaternion();
  const _scale = new THREE.Vector3();
  const _targetPos = new THREE.Vector3();
  const _targetQuat = new THREE.Quaternion();
  const _targetScale = new THREE.Vector3();

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera3d: THREE.PerspectiveCamera | null = null;
  let rafId = 0;
  let faceLandmarker: FaceLandmarker | null = null;

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

  const waitForRefs = async (maxMs = 1200) => {
    const start = performance.now();
    while (performance.now() - start < maxMs) {
      if (videoRef.value && canvasRef.value) return true;
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }
    return false;
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

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(viewW, viewH, false);

    camera3d.aspect = viewW / viewH;
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
    camera3d = new THREE.PerspectiveCamera(63, w / h, 0.1, 1000);
    camera3d.position.set(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(0, 2, 5);
    scene.add(dir);

    const loader = new GLTFLoader();
    loader.load(glassesModelSrc, (gltf) => {
      const model = gltf.scene;
      model.rotation.set(Math.PI, 0, Math.PI);
      model.position.add(BRIDGE_OFFSET);

      const container = new THREE.Group() as THREE.Group & {
        userData: GlassesUserData;
      };
      container.userData = {};
      container.add(model);
      container.matrixAutoUpdate = false;
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

  const onResults = (results: FaceLandmarkerResult) => {
    const videoEl = videoRef.value;
    const obj = glassesContainer.value;
    if (!obj || !videoEl) return;

    if (
      !results.faceLandmarks?.[0] ||
      !results.facialTransformationMatrixes?.[0]
    ) {
      obj.visible = false;
      return;
    }

    syncLayout(false);

    const matrixData = results.facialTransformationMatrixes[0].data;
    const targetMatrix = new THREE.Matrix4().fromArray(matrixData);

    // 1. Handedness Correction (MediaPipe -> Three.js)
    // MediaPipe uses a right-handed system with Z forward, Three.js uses Z back.
    const flipZ = new THREE.Matrix4().makeScale(1, 1, -1);
    targetMatrix.multiply(flipZ);

    // 2. Decompose the incoming target matrix
    targetMatrix.decompose(_targetPos, _targetQuat, _targetScale);

    // 3. Eyeglasses frame width adjustment
    // Using a base scale multiplier to match the previous system's feel
    _targetScale.multiplyScalar(frameWidth.value * 1.0);

    if (!obj.userData.prev) {
      // First frame: apply immediately
      obj.userData.prev = {
        pos: _targetPos.clone(),
        quat: _targetQuat.clone(),
        scale: _targetScale.x, // Assuming uniform scale
      };
      obj.matrix.compose(_targetPos, _targetQuat, _targetScale);
      obj.updateMatrixWorld(true);
    } else {
      const prev = obj.userData.prev;

      // 4. Interpolate components for smoothing
      _pos.lerpVectors(prev.pos, _targetPos, 1 - SMOOTHING);
      _quat.slerpQuaternions(prev.quat, _targetQuat, 1 - SMOOTHING);

      // Scale: Using the x component for uniform scaling
      const s = prev.scale * SMOOTHING + _targetScale.x * (1 - SMOOTHING);
      _scale.setScalar(s);

      // 5. Recompose into the object's matrix
      obj.matrix.compose(_pos, _quat, _scale);
      obj.updateMatrixWorld(true);

      // Save state for the next frame
      prev.pos.copy(_pos);
      prev.quat.copy(_quat);
      prev.scale = s;
    }

    obj.visible = true;
  };

  const startCamera = async () => {
    if (import.meta.server) return;
    lastError.value = null;

    try {
      const ok = await waitForRefs();
      if (!ok) throw new Error("Video/Canvas refs not ready");

      const videoEl = videoRef.value!;
      ensureOverlayStyles();

      if (!renderer) await initThree();

      const prevStream = videoEl.srcObject as MediaStream | null;
      prevStream?.getTracks().forEach((t) => t.stop());

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
          : videoEl.addEventListener("loadedmetadata", () => r(), {
              once: true,
            }),
      );

      syncLayout(true);

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
      );
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU",
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.6,
        minFacePresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      cameraRef.value = new cam.Camera(videoEl, {
        onFrame: async () => {
          if (faceLandmarker && videoEl.readyState >= 2) {
            const results = faceLandmarker.detectForVideo(
              videoEl,
              performance.now(),
            );
            onResults(results);
          }
        },
        width: videoEl.videoWidth,
        height: videoEl.videoHeight,
      });

      cameraRef.value.start();
    } catch (e: any) {
      console.error("[useVirtualTryOn11] startCamera failed:", e);
      lastError.value = e?.message ?? String(e);
      stopCamera();
    }
  };

  const stopCamera = () => {
    cameraRef.value?.stop();
    cameraRef.value = null;

    const stream = videoRef.value?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.value) videoRef.value.srcObject = null;

    glassesContainer.value && (glassesContainer.value.visible = false);
    faceLandmarker?.close?.();
    faceLandmarker = null;
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
