import { ref, shallowRef, type Ref, onUnmounted } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult, // Add 'type' here
} from "@mediapipe/tasks-vision";

// Constants for model adjustment
const BRIDGE_OFFSET = new THREE.Vector3(0, 1.01, 0.05); // Adjust glasses fit on nose
const SMOOTHING = 0.2; // 0 = no smoothing, 0.9 = heavy smoothing

type GlassesUserData = {
  lastMatrix?: THREE.Matrix4;
  templeL?: THREE.Object3D;
  templeR?: THREE.Object3D;
  defaultTempleDistance?: number;
};

export function useVirtualTryOn(
  glassesModelSrc: string,
  videoRef: Ref<HTMLVideoElement | null>,
  canvasRef: Ref<HTMLCanvasElement | null>,
  frameWidth: Ref<number>,
) {
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera3d: THREE.PerspectiveCamera | null = null;
  let faceLandmarker: FaceLandmarker | null = null;
  let rafId = 0;

  const isModelReady = ref(false);
  const glassesContainer = shallowRef<
    (THREE.Group & { userData: GlassesUserData }) | null
  >(null);

  // 1. Initialize LiteRT Face Landmarker
  const initFaceLandmarker = async () => {
    const fileset = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      outputFacialTransformationMatrixes: true,
      numFaces: 1,
    });
  };

  // 2. Initialize Three.js
  const initThree = async () => {
    const canvas = canvasRef.value!;
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    scene = new THREE.Scene();

    // Perspective camera fov should ideally match the webcam's physical properties
    camera3d = new THREE.PerspectiveCamera(
      63,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000,
    );

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const loader = new GLTFLoader();
    loader.load(glassesModelSrc, (gltf) => {
      const model = gltf.scene;

      // Identify temple nodes
      let templeL: THREE.Object3D | undefined;
      let templeR: THREE.Object3D | undefined;

      model.traverse((child) => {
        if (child.name === "Temple_L_End") templeL = child;
        if (child.name === "Temple_R_End") templeR = child;
      });

      model.rotation.set(
        Math.PI, // flip upside-down if needed
        0,
        Math.PI, // face forward instead of backward
      );
      model.position.add(BRIDGE_OFFSET); // Fine-tune model placement

      const container = new THREE.Group() as THREE.Group & {
        userData: GlassesUserData;
      };
      container.add(model);
      container.matrixAutoUpdate = false; // We will use the MediaPipe matrix directly

      if (templeL && templeR) {
        container.userData.templeL = templeL;
        container.userData.templeR = templeR;

        // Ensure matrices are updated to get accurate world positions
        model.updateMatrixWorld(true);

        // Calculate default distance between temples in model space
        const posL = new THREE.Vector3();
        const posR = new THREE.Vector3();
        templeL.getWorldPosition(posL);
        templeR.getWorldPosition(posR);
        container.userData.defaultTempleDistance = posL.distanceTo(posR);
      }

      scene!.add(container);
      glassesContainer.value = container;
      isModelReady.value = true;
    });
  };

  // 3. Main Processing Loop
  const renderLoop = () => {
    if (videoRef.value && faceLandmarker && videoRef.value.readyState >= 2) {
      const results = faceLandmarker.detectForVideo(
        videoRef.value,
        performance.now(),
      );
      updateScene(results);
    }
    if (renderer && scene && camera3d) {
      renderer.render(scene, camera3d);
    }
    rafId = requestAnimationFrame(renderLoop);
  };

  // Add these helper variables outside the function to avoid re-allocating memory every frame
  const _pos = new THREE.Vector3();
  const _quat = new THREE.Quaternion();
  const _scale = new THREE.Vector3();

  const _targetPos = new THREE.Vector3();
  const _targetQuat = new THREE.Quaternion();
  const _targetScale = new THREE.Vector3();

  const updateScene = (results: FaceLandmarkerResult) => {
    const obj = glassesContainer.value;
    if (
      !obj ||
      !results.facialTransformationMatrixes?.length ||
      !results.faceWorldLandmarks?.length
    ) {
      if (obj) obj.visible = false;
      return;
    }

    const matrixData = results.facialTransformationMatrixes[0].data;
    const targetMatrix = new THREE.Matrix4().fromArray(matrixData);

    // 1. Handedness Correction (MediaPipe -> Three.js)
    const flipZ = new THREE.Matrix4().makeScale(1, 1, -1);
    targetMatrix.multiply(flipZ);

    // 2. Precise Landmark Tracking (Nose Bridge: 168, Ears: 234, 454)
    const worldLandmarks = results.faceWorldLandmarks[0];
    const p168_raw = worldLandmarks[168];
    const p234_raw = worldLandmarks[234];
    const p454_raw = worldLandmarks[454];

    // Convert from meters to centimeters and transform to scene space
    const p168 = new THREE.Vector3(p168_raw.x, p168_raw.y, p168_raw.z)
      .multiplyScalar(100)
      .applyMatrix4(targetMatrix);
    const p234 = new THREE.Vector3(p234_raw.x, p234_raw.y, p234_raw.z)
      .multiplyScalar(100)
      .applyMatrix4(targetMatrix);
    const p454 = new THREE.Vector3(p454_raw.x, p454_raw.y, p454_raw.z)
      .multiplyScalar(100)
      .applyMatrix4(targetMatrix);

    // 3. Calculate Target Position (Lock to Nose Bridge)
    _targetPos.copy(p168);

    // 4. Calculate Target Rotation (Align Temples with Ears)
    const midEar = new THREE.Vector3()
      .addVectors(p234, p454)
      .multiplyScalar(0.5);
    const forward = new THREE.Vector3().subVectors(p168, midEar).normalize();
    const right = new THREE.Vector3().subVectors(p454, p234).normalize();
    const up = new THREE.Vector3().crossVectors(forward, right).normalize();
    const orthogonalRight = new THREE.Vector3().crossVectors(up, forward);

    // Construct basis: X=Right, Y=Up, Z=Backward (Three.js looks down -Z, so Backward is +Z)
    const rotMat = new THREE.Matrix4().makeBasis(
      orthogonalRight,
      up,
      forward.clone().negate(),
    );
    _targetQuat.setFromRotationMatrix(rotMat);

    // 5. Calculate Target Scale (Adjust to User's Head Size)
    const currentEarDist = p454.distanceTo(p234);
    const defaultDist = obj.userData.defaultTempleDistance || 12; // Typical width ~12cm if not found
    const scaleFactor = (currentEarDist / defaultDist) * frameWidth.value;
    _targetScale.setScalar(scaleFactor);

    if (!obj.userData.lastMatrix) {
      // First frame: apply immediately
      obj.matrix.compose(_targetPos, _targetQuat, _targetScale);
      obj.userData.lastMatrix = obj.matrix.clone();
    } else {
      // 3. Decompose the current/last matrix
      obj.userData.lastMatrix.decompose(_pos, _quat, _scale);

      // 4. Interpolate components
      // Position: Linear Interpolation (lerp)
      _pos.lerp(_targetPos, 1 - SMOOTHING);

      // Rotation: Spherical Linear Interpolation (slerp) for smooth turning
      _quat.slerp(_targetQuat, 1 - SMOOTHING);

      // Scale: Linear Interpolation
      _scale.lerp(_targetScale, 1 - SMOOTHING);

      // 5. Recompose into the object's matrix
      obj.matrix.compose(_pos, _quat, _scale);

      // Save state for the next frame
      obj.userData.lastMatrix.copy(obj.matrix);
    }

    obj.visible = true;
  };
  const startCamera = async () => {
    if (!videoRef.value || !canvasRef.value) return;

    await initFaceLandmarker();
    await initThree();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 640, height: 480 },
    });

    videoRef.value.srcObject = stream;
    videoRef.value.play();

    // Sync canvas size
    videoRef.value.onloadedmetadata = () => {
      const { clientWidth, clientHeight } = videoRef.value!;
      renderer?.setSize(clientWidth, clientHeight, false);
      if (camera3d) {
        camera3d.aspect = clientWidth / clientHeight;
        camera3d.updateProjectionMatrix();
      }
    };

    renderLoop();
  };

  const stopCamera = () => {
    // Stop render loop
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }

    // Stop webcam stream
    const videoEl = videoRef.value;
    if (videoEl?.srcObject) {
      const stream = videoEl.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    }

    // Hide glasses
    if (glassesContainer.value) {
      glassesContainer.value.visible = false;
      glassesContainer.value.userData.lastMatrix = undefined;
    }

    // Close MediaPipe landmarker
    faceLandmarker?.close();
    faceLandmarker = null;
  };

  onUnmounted(() => {
    stopCamera();
    renderer?.dispose();
    cancelAnimationFrame(rafId);
    faceLandmarker?.close();
    renderer?.dispose();
    const stream = videoRef.value?.srcObject as MediaStream;
    stream?.getTracks().forEach((t) => t.stop());
  });

  return { startCamera, isModelReady, stopCamera };
}
