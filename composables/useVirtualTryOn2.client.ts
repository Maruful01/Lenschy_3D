import { ref, shallowRef, type Ref, onUnmounted } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface Landmark {
  x: number;
  y: number;
  z: number;
}

/** ---- Tuning constants ---- **/
const SMOOTHING = 0.25; // 0 = no smoothing
const SCALE_K = 1.0; // extra multiplier for scale
const X_OFFSET_PIXELS = 0; // move frame left/right
const Y_OFFSET_PIXELS = 0; // move frame up/down (negative = up)
const DEPTH_Z_SCALE = 60; // how strongly landmark.z affects depth
const Z_EXTRA_OFFSET = 0; // extra depth offset if needed

// landmark indices
const LEFT_EYE = 33;
const RIGHT_EYE = 263;
const NOSE_BRIDGE = 168;
const FOREHEAD = 10;

export function useVirtualTryOn(
  glassesModelSrc: string, // e.g. "RB4306_TRYON.gltf"
  frameWidth: Ref<number>, // slider (0.4 – 0.6)
  videoRef: Ref<HTMLVideoElement | null>,
  canvasRef: Ref<HTMLCanvasElement | null>
) {
  const cameraRef = ref<any | null>(null);

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;

  const glassesContainer = shallowRef<THREE.Group | null>(null);
  const isModelReady = ref(false);

  // optional manual tweaks
  const rollOffsetDeg = ref(0);
  const yawOffsetDeg = ref(0);
  const pitchOffsetDeg = ref(0);
  const baseRollDeg = ref(0);

  /* ----------------- helpers: coordinate conversions ----------------- */

  // FaceMesh landmark -> pixel space
  const toPx = (L: Landmark[], i: number, vw: number, vh: number) =>
    new THREE.Vector3(L[i].x * vw, L[i].y * vh, L[i].z);

  // pixel -> world (world units == pixels, Y flipped so up is +)
  const pxToWorld = (xPx: number, yPx: number) => {
    return new THREE.Vector3(
      xPx + X_OFFSET_PIXELS,
      -(yPx + Y_OFFSET_PIXELS),
      0
    );
  };

  const toWorld3D = (ptPx: THREE.Vector3) => {
    return new THREE.Vector3(
      ptPx.x + X_OFFSET_PIXELS,
      -(ptPx.y + Y_OFFSET_PIXELS),
      0
    );
  };

  /* ----------------- Three.js setup ----------------- */

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
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();

    const fov = 45;
    const aspect = videoWidth / videoHeight;
    camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 4000);

    // camera sits “in front” of the plane z=0, looking at the center
    const camZ = videoHeight;
    camera.position.set(videoWidth / 2, -videoHeight / 2, camZ);
    camera.lookAt(videoWidth / 2, -videoHeight / 2, 0);

    // lights
    const frontLight = new THREE.SpotLight(0xffffff, 1.5);
    frontLight.position.set(0, 0, camZ * 0.6);
    scene.add(frontLight);

    const backLight = new THREE.SpotLight(0xffffff, 0.6);
    backLight.position.set(0, 0, -camZ * 0.6);
    scene.add(backLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const camLight = new THREE.PointLight(0xffffff, 0.6);
    camera.add(camLight);
    scene.add(camera);

    console.log("[VTO] Three.js init", { videoWidth, videoHeight, camZ });
  };

  const loadGlassesModel = async (vw: number, vh: number) => {
    if (isModelReady.value || !scene) return;

    return new Promise<void>((resolve, reject) => {
      const loader = new GLTFLoader();

      let src = glassesModelSrc;
      if (!/^https?:\/\//.test(src) && !src.startsWith("/")) {
        src = "/" + src; // Nuxt public/
      }
      console.log("[VTO] Loading GLTF from", src);

      loader.load(
        src,
        (gltf) => {
          console.log("[VTO] GLTF loaded", gltf);
          const model = gltf.scene;

          // compute bounding box
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          const center = new THREE.Vector3();
          box.getCenter(center);

          // center model at origin
          model.position.sub(center);

          // scale so width ≈ 40% of screen width
          const desiredWidth = vw * 0.4;
          const s = (desiredWidth / (size.x || 1)) * SCALE_K;
          model.scale.setScalar(s);

          // group that we will move/rotate based on face
          const container = new THREE.Group();
          container.add(model);

          // initial position: middle of screen, z=0
          container.position.set(vw / 2, -vh / 2, 0);
          container.visible = true;

          // avoid culling issues
          model.traverse((node: any) => {
            if (node instanceof THREE.Mesh) {
              node.frustumCulled = false;
            }
          });

          scene!.add(container);
          glassesContainer.value = container;
          isModelReady.value = true;

          // render once so you can see glasses even if FaceMesh fails
          if (renderer && camera) {
            renderer.render(scene!, camera);
          }

          resolve();
        },
        undefined,
        (err) => {
          console.error("[VTO] GLTF load error", err);
          reject(err);
        }
      );
    });
  };

  /* ----------------- FaceMesh results → pose glasses ----------------- */

  const onResults = (results: any) => {
    const obj = glassesContainer.value;
    if (!obj || !videoRef.value || !renderer || !scene || !camera) return;

    const faces = results?.multiFaceLandmarks as Landmark[][] | undefined;
    if (!faces || faces.length === 0) {
      // keep glasses visible at last pose so you can still see them
      renderer.render(scene, camera);
      return;
    }

    const L = faces[0];
    const video = videoRef.value;
    const vw = video.videoWidth || video.clientWidth || 1280;
    const vh = video.videoHeight || video.clientHeight || 720;

    const leftEyeOuter = toPx(L, RIGHT_EYE, vw, vh); // mirrored
    const rightEyeOuter = toPx(L, LEFT_EYE, vw, vh);
    const noseBridge = toPx(L, NOSE_BRIDGE, vw, vh);
    const forehead = toPx(L, FOREHEAD, vw, vh);

    // position (around nose bridge)
    const bridgeWorld = pxToWorld(noseBridge.x, noseBridge.y);
    const positionZ = 0 + noseBridge.z * DEPTH_Z_SCALE + Z_EXTRA_OFFSET;

    const targetPos = new THREE.Vector3(
      bridgeWorld.x,
      bridgeWorld.y,
      positionZ
    );

    // scale depending on eye distance (in pixels)
    const dx = rightEyeOuter.x - leftEyeOuter.x;
    const dy = rightEyeOuter.y - leftEyeOuter.y;
    const eyeDistPx = Math.hypot(dx, dy);

    // generic mapping: eye distance (px) -> world width (also px)
    const desiredWidth = eyeDistPx * 1.4 * frameWidth.value;
    const currentWidth = 1; // we baked width into model scale already,
    // so treat this as a multiplier only
    const targetScale = Math.max(0.0001, (desiredWidth / currentWidth) * 0.001);

    // orientation using four landmarks
    const pL = toWorld3D(leftEyeOuter);
    const pR = toWorld3D(rightEyeOuter);
    const pN = toWorld3D(noseBridge);
    const pF = toWorld3D(forehead);

    const xAxis = new THREE.Vector3().subVectors(pR, pL).normalize();
    const yAxis = new THREE.Vector3().subVectors(pF, pN).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();

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

  /* ----------------- start / stop camera ----------------- */

  const startCamera = async () => {
    if (!videoRef.value || !canvasRef.value) return;
    if (typeof window === "undefined") return;

    const video = videoRef.value;

    // 1) webcam
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

    // 2) three + GLB
    initThree(vw, vh);
    await loadGlassesModel(vw, vh);

    // 3) dynamic MediaPipe imports (Nuxt-safe)
    const [{ FaceMesh }, camUtils] = await Promise.all([
      import("@mediapipe/face_mesh"),
      import("@mediapipe/camera_utils"),
    ]);
    const { Camera } = camUtils as any;

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

    cameraRef.value = new Camera(video, {
      onFrame: async () => {
        await faceMesh.send({ image: video });
      },
      width: vw,
      height: vh,
    });

    console.log("[VTO] starting MP camera", vw, vh);
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
