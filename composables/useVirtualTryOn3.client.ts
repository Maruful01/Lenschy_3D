import { ref, shallowRef, type Ref, onUnmounted } from "vue";
import * as cam from "@mediapipe/camera_utils";
import faceMeshModule from "@mediapipe/face_mesh";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface Landmark {
  x: number;
  y: number;
  z: number;
}

// MediaPipe FaceMesh type (kept as any for simplicity)
const { FaceMesh } = faceMeshModule as any;

/**
 * useVirtualTryOn
 * -------------------------------------------------
 * - Uses an HTML <video> element for the webcam (videoRef)
 * - Uses an HTML <canvas> element with a transparent WebGL renderer (canvasRef)
 * - Draws ONLY the 3D eyeglass model on the canvas, over the live video
 * - NO PlaneGeometry / VideoTexture → nothing can hide the temples
 *
 * You should pass from Card.vue: const modelSrc = "RB4306_TRYON.gltf";
 */
export function useVirtualTryOn(
  glassesModelSrc: string, // e.g. "RB4306_TRYON.gltf" or GLB
  frameWidth: Ref<number>, // slider [0.4..0.6]
  videoRef: Ref<HTMLVideoElement | null>,
  canvasRef: Ref<HTMLCanvasElement | null>
) {
  // MediaPipe camera helper
  const cameraRef = ref<cam.Camera | null>(null);

  // Three.js core objects
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;

  // Single eyeglass container
  const glassesContainer = shallowRef<THREE.Group | null>(null);
  const isModelReady = ref(false);

  // ---------- Tuning constants (copied from the working version) ----------

  // Virtual plane used only for coordinates (we DO NOT render this plane)
  const PLANE_WIDTH = 16;
  const PLANE_HEIGHT = 9;
  const PLANE_Z = -5; // where the virtual face plane lives

  const SCALE_K = ref(0.2); // base scale from eye distance → model size
  const DEPTH_SCALE = ref(25); // mediapipe z → world z strength
  const BASE_Z = ref(1); // extra forward offset
  const zOffset = ref(0.6); // tweak so bridge sits correctly on nose
  const Z_WORLD_K = ref(-0.6); // z scale for toWorld3D
  const MODEL_Z_SHIFT = ref(-10.0);

  const SMOOTHING = 0.25; // 0 = no smoothing, higher = smoother

  // Model fine‑tune
  const BRIDGE_OFFSET = new THREE.Vector3(0, -1, 0); // small offset so frame sits on nose

  // Optional user offsets (degrees) if you ever want to tweak
  const rollOffsetDeg = ref(0);
  const yawOffsetDeg = ref(0);
  const pitchOffsetDeg = ref(0);
  const baseRollDeg = ref(0); // IMPORTANT: 0, not 180

  // ---------- Helper functions ----------

  const toPx = (L: Landmark[], i: number, vw: number, vh: number) =>
    new THREE.Vector3(L[i].x * vw, L[i].y * vh, L[i].z);

  const pxToWorld = (xPx: number, yPx: number, vw: number, vh: number) => {
    const x = (xPx / vw - 0.5) * PLANE_WIDTH;
    const y = (0.5 - yPx / vh) * PLANE_HEIGHT;
    return new THREE.Vector3(x, y, 0);
  };

  const toWorld3D = (ptPx: THREE.Vector3, vw: number, vh: number) => {
    const xy = pxToWorld(ptPx.x, ptPx.y, vw, vh);
    const z = ptPx.z * PLANE_WIDTH * Z_WORLD_K.value;
    return new THREE.Vector3(xy.x, xy.y, z);
  };

  const onResize = () => {
    if (!canvasRef.value || !renderer || !camera) return;
    const canvas = canvasRef.value;
    const w = Math.max(1, canvas.clientWidth || canvas.width || 800);
    const h = Math.max(1, canvas.clientHeight || canvas.height || 600);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  // ---------- Three.js initialization on the transparent canvas ----------

  const initThree = (videoWidth: number, videoHeight: number) => {
    if (!canvasRef.value) return;
    const canvas = canvasRef.value;

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(videoWidth, videoHeight, false);
    renderer.setClearColor(0x000000, 0); // fully transparent → video shows behind

    // Fix GLB/GLTF appearing black in some setups
    (renderer as any).outputEncoding = (THREE as any).sRGBEncoding;
    (renderer as any).physicallyCorrectLights = true;

    scene = new THREE.Scene();

    // Camera looking at the virtual plane (z = PLANE_Z)
    const fov = 45;
    const aspect = videoWidth / videoHeight;
    camera = new THREE.PerspectiveCamera(fov, aspect, 0.01, 1000);
    camera.position.set(0, 0, 5);
    camera.lookAt(new THREE.Vector3(0, 0, PLANE_Z));

    // Lights so the model keeps its original materials (no solid black)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.9);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(0, 2, 5);
    scene.add(dir);
    const back = new THREE.DirectionalLight(0xffffff, 0.6);
    back.position.set(-2, -1, -4);
    scene.add(back);

    const camLight = new THREE.PointLight(0xffffff, 0.5);
    camera.add(camLight);
    scene.add(camera);

    window.addEventListener("resize", onResize);
  };

  // ---------- Load GLTF / GLB glasses model ----------

  const loadGlassesModel = async () => {
    if (isModelReady.value || !scene) return;

    return new Promise<void>((resolve, reject) => {
      const loader = new GLTFLoader();

      let src = glassesModelSrc;
      if (!/^https?:\/\//.test(src) && !src.startsWith("/")) {
        src = "/" + src;
      }
      console.log("Loading glasses model from", src);

      loader.load(
        src,
        (gltf) => {
          const model = gltf.scene;

          // Keep original orientation, only add bridge offset
          model.rotation.y = Math.PI;
          model.position.add(BRIDGE_OFFSET);

          const container = new THREE.Group();
          container.add(model);
          container.visible = false; // until first face

          // Ensure each mesh is rendered & lit normally
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
              m.transparent = m.transparent ?? false;
            });
          });

          scene!.add(container);
          glassesContainer.value = container;
          isModelReady.value = true;

          resolve();
        },
        undefined,
        (err) => {
          console.error("GLTF/GLB load error", err);
          reject(err);
        }
      );
    });
  };

  // ---------- MediaPipe FaceMesh results → pose the glasses ----------

  const onResults = (results: any) => {
    const obj = glassesContainer.value;
    if (!obj || !videoRef.value || !renderer || !scene || !camera) return;

    const faces = results?.multiFaceLandmarks as Landmark[][] | undefined;
    if (!faces || faces.length === 0) {
      obj.visible = false;
      renderer.render(scene, camera);
      return;
    }

    const L = faces[0];
    const video = videoRef.value;
    const vw = video.videoWidth || video.clientWidth || 1280;
    const vh = video.videoHeight || video.clientHeight || 720;

    // === 1. Extract landmarks as in the older working version ===
    const leftEyeOuter = toPx(L, 263, vw, vh);
    const rightEyeOuter = toPx(L, 33, vw, vh);
    const noseBridge = toPx(L, 168, vw, vh);
    const forehead = toPx(L, 10, vw, vh);

    // === 2. Position at virtual nose bridge ===
    const bridgeWorld = pxToWorld(noseBridge.x, noseBridge.y, vw, vh);
    const positionZ =
      PLANE_Z +
      0.08 +
      BASE_Z.value +
      zOffset.value +
      noseBridge.z * DEPTH_SCALE.value +
      MODEL_Z_SHIFT.value;

    const targetPos = new THREE.Vector3(
      bridgeWorld.x,
      bridgeWorld.y,
      positionZ
    );

    // === 3. Scale from eye distance (same logic as before) ===
    const dx = rightEyeOuter.x - leftEyeOuter.x;
    const dy = rightEyeOuter.y - leftEyeOuter.y;
    const eyeDistPx = Math.hypot(dx, dy);
    const pxToWorldScale = (PLANE_WIDTH / vw) * SCALE_K.value;
    const targetScale = Math.max(
      0.0001,
      eyeDistPx * pxToWorldScale * frameWidth.value
    );

    // === 4. Orientation from four landmarks (ears+forehead) ===
    const pL = toWorld3D(leftEyeOuter, vw, vh);
    const pR = toWorld3D(rightEyeOuter, vw, vh);
    const pN = toWorld3D(noseBridge, vw, vh);
    const pF = toWorld3D(forehead, vw, vh);

    const xAxis = new THREE.Vector3().subVectors(pR, pL).normalize();
    const yAxis = new THREE.Vector3().subVectors(pF, pN).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();

    // soften y/z a bit as in your previous code
    zAxis.multiplyScalar(0.9);
    yAxis.multiplyScalar(0.9);
    xAxis.crossVectors(yAxis, zAxis).normalize();
    yAxis.crossVectors(zAxis, xAxis).normalize();

    const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    const headQuat = new THREE.Quaternion().setFromRotationMatrix(basis);

    const rollOff = THREE.MathUtils.degToRad(rollOffsetDeg.value);
    const yawOff = THREE.MathUtils.degToRad(yawOffsetDeg.value);
    const pitchOff = THREE.MathUtils.degToRad(pitchOffsetDeg.value);
    const baseRoll = THREE.MathUtils.degToRad(baseRollDeg.value);

    const offsetQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(pitchOff, yawOff, rollOff + baseRoll)
    );
    const targetQuat = headQuat.multiply(offsetQuat);

    // === 5. Smooth transform exactly like old version ===
    type PrevState = {
      pos: THREE.Vector3;
      quat: THREE.Quaternion;
      scale: number;
    };

    if (!obj.userData.prev) {
      const prev: PrevState = {
        pos: targetPos.clone(),
        quat: targetQuat.clone(),
        scale: targetScale,
      };
      obj.userData.prev = prev;
      obj.position.copy(targetPos);
      obj.quaternion.copy(targetQuat);
      obj.scale.setScalar(targetScale);
    } else {
      const prev = obj.userData.prev as PrevState;
      obj.position.lerpVectors(prev.pos, targetPos, 1 - SMOOTHING);
      obj.quaternion.slerpQuaternions(prev.quat, targetQuat, 1 - SMOOTHING);
      const s = prev.scale * SMOOTHING + targetScale * (1 - SMOOTHING);
      obj.scale.setScalar(s);
      prev.pos.copy(obj.position);
      prev.quat.copy(obj.quaternion);
      prev.scale = s;
    }

    obj.visible = true;
    renderer.render(scene, camera);
  };

  // ---------- Start / stop camera & FaceMesh ----------

  const startCamera = async () => {
    if (!videoRef.value || !canvasRef.value) return;

    const video = videoRef.value;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: "user" },
    });
    video.srcObject = stream;

    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve();
    });

    await video.play();

    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;

    if (!renderer) {
      initThree(vw, vh);
      await loadGlassesModel();
    }

    // MediaPipe FaceMesh setup
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

    cameraRef.value = new cam.Camera(video, {
      onFrame: async () => {
        await faceMesh.send({ image: video });
      },
      width: vw,
      height: vh,
    });

    cameraRef.value.start();
  };

  const stopCamera = () => {
    if (cameraRef.value) {
      cameraRef.value.stop();
      cameraRef.value = null;
    }

    const video = videoRef.value;
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }

    if (glassesContainer.value) {
      glassesContainer.value.visible = false;
    }

    if (renderer && scene && camera) {
      renderer.clear();
    }

    window.removeEventListener("resize", onResize);
  };

  onUnmounted(() => stopCamera());

  return {
    videoRef,
    canvasRef,
    glassesContainer,
    isModelReady,
    startCamera,
    stopCamera,
  };
}
