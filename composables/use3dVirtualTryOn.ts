import { ref, shallowRef, type Ref, onUnmounted, unref, watch } from "vue";
import { useWindowSize } from "@vueuse/core";
import * as cam from "@mediapipe/camera_utils";
import faceMeshModule from "@mediapipe/face_mesh";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VideoTexture } from "three";

interface Landmark {
  x: number;
  y: number;
  z: number;
}

const { FaceMesh } = faceMeshModule as any;
const { width: winW, height: winH } = useWindowSize();

// ---------------- CONFIG ----------------

const LANDMARKS = {
  NOSE_BRIDGE: 168,
  FOREHEAD: 10,
  LEFT_EAR: 234,
  RIGHT_EAR: 454,
  LEFT_EYE_OUTER: 263,
  RIGHT_EYE_OUTER: 33,
} as const;

const PLANE_WIDTH = 16;
const PLANE_HEIGHT = 9;
const PLANE_Z = -5;

const DEPTH_SCALE = 40;

const SCALE_FROM_EAR_K = 0.26;
const SCALE_FROM_EYE_K = 0.2;

const MODEL_Z_SHIFT = -0.1;
const BRIDGE_OFFSET = new THREE.Vector3(0, -1, 0);

const SMOOTHING = 0.65;

const GLTF_TEMPLE_LEFT_NAME = "Temple_L_End";
const GLTF_TEMPLE_RIGHT_NAME = "Temple_R_End";

type GlassesUserData = {
  prev?: {
    pos: THREE.Vector3;
    quat: THREE.Quaternion;
    scale: number;
  };
  templeL?: THREE.Object3D | null;
  templeR?: THREE.Object3D | null;
};

export function useVirtualTryOn(
  glassesModelSrc: string | Ref<string>,
  frameWidth: Ref<number>,
  canvasRef: Ref<HTMLCanvasElement | null>
) {
  const cameraRef = ref<cam.Camera | null>(null);

  let videoEl: HTMLVideoElement | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let rafId = 0;

  const glassesContainer = shallowRef<THREE.Group | null>(null);
  const isModelReady = ref(false);

  // ---------- Helpers ----------

  const toPx = (L: Landmark[], i: number, vw: number, vh: number) =>
    new THREE.Vector3(L[i].x * vw, L[i].y * vh, L[i].z);

  const pxToWorld = (xPx: number, yPx: number, vw: number, vh: number) => {
    const x = (xPx / vw - 0.5) * PLANE_WIDTH;
    const y = (0.5 - yPx / vh) * PLANE_HEIGHT;
    return new THREE.Vector3(x, y, 0);
  };

  const toWorld3D = (ptPx: THREE.Vector3, vw: number, vh: number) => {
    const xy = pxToWorld(ptPx.x, ptPx.y, vw, vh);
    const z = ptPx.z * PLANE_WIDTH * -0.6;
    return new THREE.Vector3(xy.x, xy.y, z);
  };

  const getCanvasSize = () => {
    const canvas = canvasRef.value;
    if (!canvas) return { w: 800, h: 600 };

    // Prefer actual displayed size; fall back to window size (vueuse) if needed.

    const w = Math.max(1, Math.floor(winW.value));
    const h = Math.max(1, Math.floor(winH.value));
    return { w, h };
  };

  const onResize = () => {
    if (!canvasRef.value || !renderer || !camera) return;
    const w = winW.value;
    const h = winH.value;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  // ---------- Three.js init ----------

  const initThree = async () => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    const { w, h } = getCanvasSize();
    renderer.setSize(w, h, false);
    renderer.autoClear = true;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
    camera.position.set(0, 0, 5);
    camera.lookAt(new THREE.Vector3(0, 0, PLANE_Z));

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 3.5);
    dir.position.set(2, 3, 5);
    scene.add(dir);
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    // Video background plane (never occludes glasses)
    if (videoEl) {
      const videoTex = new VideoTexture(videoEl);
      videoTex.minFilter = THREE.LinearFilter;
      videoTex.magFilter = THREE.LinearFilter;
      videoTex.format = THREE.RGBAFormat;

      const planeGeo = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT);
      const planeMat = new THREE.MeshBasicMaterial({ map: videoTex });
      const plane = new THREE.Mesh(planeGeo, planeMat);

      plane.position.set(0, 0, PLANE_Z - 1);
      plane.renderOrder = 0;

      plane.material.depthWrite = false;
      plane.material.depthTest = true;

      scene.add(plane);
    }

    // GLTF load
    const src = unref(glassesModelSrc);
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        const model = gltf.scene;
        model.rotation.set(0, 0, 0);
        model.position.add(BRIDGE_OFFSET);

        const container = new THREE.Group() as THREE.Group & {
          userData: GlassesUserData;
        };
        container.userData = {};
        container.add(model);
        container.visible = false;
        container.renderOrder = 10;

        let templeL: THREE.Object3D | null = null;
        let templeR: THREE.Object3D | null = null;

        model.traverse((node: any) => {
          if (!(node instanceof THREE.Mesh)) return;
          node.frustumCulled = false;

          const mats = Array.isArray(node.material)
            ? node.material
            : [node.material];
          mats.forEach((m: any) => {
            if (!m) return;
            m.depthTest = true;
            m.depthWrite = true;
          });

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
      },
      undefined,
      (err) => console.error("GLTF load error", err)
    );

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (renderer && scene && camera) renderer.render(scene, camera);
    };
    animate();

    // Keep old resize listener + additionally react to vueuse window size.
    window.addEventListener("resize", onResize);
    onResize();
  };

  // ---------- MediaPipe results → pose glasses ----------

  const onResults = (results: any) => {
    const obj = glassesContainer.value as
      | (THREE.Group & { userData: GlassesUserData })
      | null;
    if (!obj || !videoEl || !camera || !scene || !renderer) return;

    const faces = results?.multiFaceLandmarks as Landmark[][] | undefined;
    if (!faces || faces.length === 0) {
      obj.visible = false;
      return;
    }

    const L = faces[0];
    const vw = videoEl.videoWidth || videoEl.clientWidth || 1280;
    const vh = videoEl.videoHeight || videoEl.clientHeight || 720;

    const leftEyeOuter = toPx(L, LANDMARKS.LEFT_EYE_OUTER, vw, vh);
    const rightEyeOuter = toPx(L, LANDMARKS.RIGHT_EYE_OUTER, vw, vh);
    const noseBridge = toPx(L, LANDMARKS.NOSE_BRIDGE, vw, vh);
    const forehead = toPx(L, LANDMARKS.FOREHEAD, vw, vh);
    const leftEar = toPx(L, LANDMARKS.LEFT_EAR, vw, vh);
    const rightEar = toPx(L, LANDMARKS.RIGHT_EAR, vw, vh);

    const bridgeWorld = pxToWorld(noseBridge.x, noseBridge.y, vw, vh);

    const earDistPx = Math.hypot(
      rightEar.x - leftEar.x,
      rightEar.y - leftEar.y
    );
    const eyeDistPx = Math.hypot(
      rightEyeOuter.x - leftEyeOuter.x,
      rightEyeOuter.y - leftEyeOuter.y
    );

    const pxToWorldEar = (PLANE_WIDTH / vw) * SCALE_FROM_EAR_K;
    const pxToWorldEye = (PLANE_WIDTH / vw) * SCALE_FROM_EYE_K;

    const combinedDist = earDistPx * 0.7 + eyeDistPx * 0.3;

    const fw = Number.isFinite(frameWidth.value) ? frameWidth.value : 1;
    const baseScale = Math.max(
      0.0001,
      combinedDist * (pxToWorldEar * 0.7 + pxToWorldEye * 0.3) * fw
    );

    const pLEar = toWorld3D(leftEar, vw, vh);
    const pREar = toWorld3D(rightEar, vw, vh);
    const pF = toWorld3D(forehead, vw, vh);
    const pN = toWorld3D(noseBridge, vw, vh);

    const yawRad = Math.atan2(pREar.z - pLEar.z, pREar.x - pLEar.x);
    const yawClamped = Math.min(Math.abs(yawRad), Math.PI / 4);
    const yaw01 = yawClamped / (Math.PI / 4);

    const yawScaleFactor = 1 + 0.1 * yaw01; // 1.0 → 1.1
    const desiredScale = baseScale * yawScaleFactor;

    const positionZ = PLANE_Z + MODEL_Z_SHIFT + noseBridge.z * DEPTH_SCALE;

    const targetPos = new THREE.Vector3(
      bridgeWorld.x,
      bridgeWorld.y,
      positionZ
    );

    const xAxis = new THREE.Vector3().subVectors(pREar, pLEar).normalize();
    const yAxis = new THREE.Vector3().subVectors(pF, pN).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();

    const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(basis);

    if (!obj.userData.prev) {
      obj.userData.prev = {
        pos: targetPos.clone(),
        quat: targetQuat.clone(),
        scale: desiredScale,
      };
      obj.position.copy(targetPos);
      obj.quaternion.copy(targetQuat);
      obj.scale.setScalar(desiredScale);
    } else {
      const prev = obj.userData.prev;
      obj.position.lerpVectors(prev.pos, targetPos, 1 - SMOOTHING);
      obj.quaternion.slerpQuaternions(prev.quat, targetQuat, 1 - SMOOTHING);
      const s = prev.scale * SMOOTHING + desiredScale * (1 - SMOOTHING);
      obj.scale.setScalar(s);
      prev.pos.copy(obj.position);
      prev.quat.copy(obj.quaternion);
      prev.scale = s;
    }

    obj.visible = true;
  };

  // ---------- Start / stop camera ----------

  const startCamera = async () => {
    if (!canvasRef.value) return;

    if (!videoEl) {
      videoEl = document.createElement("video");
      videoEl.autoplay = true;
      videoEl.muted = true;
      (videoEl as any).playsInline = true;
      videoEl.style.display = "none";
    }

    if (!renderer) await initThree();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 420, facingMode: "user" },
      audio: false,
    });

    videoEl.srcObject = stream;
    await videoEl.play();

    const faceMesh = new FaceMesh({
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
      onFrame: async () => {
        await faceMesh.send({ image: videoEl! });
      },
      width: 640,
      height: 420,
    });

    cameraRef.value.start();
    onResize();
  };

  const stopCamera = () => {
    if (cameraRef.value) {
      cameraRef.value.stop();
      cameraRef.value = null;
    }

    if (videoEl?.srcObject) {
      const stream = videoEl.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    }

    if (glassesContainer.value) glassesContainer.value.visible = false;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;

    window.removeEventListener("resize", onResize);
  };

  // React to window size changes (vueuse)
  watch([winW, winH], () => onResize());

  onUnmounted(() => stopCamera());

  return {
    canvasRef,
    glassesContainer,
    isModelReady,
    startCamera,
    stopCamera,
  };
}
