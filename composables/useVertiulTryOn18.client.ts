import { ref, shallowRef, type Ref, onUnmounted } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult, // Add 'type' here
} from "@mediapipe/tasks-vision";

// Constants for model adjustment
const BRIDGE_OFFSET = new THREE.Vector3(0, 1.5, 0.05); // Adjust glasses fit on nose
const SMOOTHING = 0.2; // 0 = no smoothing, 0.9 = heavy smoothing

type GlassesUserData = {
  lastMatrix?: THREE.Matrix4;
};

export function useVirtualTryOn(
  glassesModelSrc: string,
  frameWidth: Ref<number>,
  videoRef: Ref<HTMLVideoElement | null>,
  canvasRef: Ref<HTMLCanvasElement | null>,
) {
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera3d: THREE.PerspectiveCamera | null = null;
  let faceLandmarker: FaceLandmarker | null = null;
  let rafId = 0;
  const DEPTH_OFFSET = -4.5;

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
      model.rotation.set(
        Math.PI, // flip upside-down if needed
        0,
        Math.PI, // face forward instead of backward
      );
      model.position.add(BRIDGE_OFFSET); // Fine-tune model placement
      // model.scale.setScalar(1.0);
      const container = new THREE.Group() as any;
      container.add(model);
      container.matrixAutoUpdate = false; // We will use the MediaPipe matrix directly
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
    if (!obj || !results.facialTransformationMatrixes?.length) {
      if (obj) obj.visible = false;
      return;
    }

    const matrixData = results.facialTransformationMatrixes[0].data;
    const targetMatrix = new THREE.Matrix4().fromArray(matrixData);

    // 1. Handedness Correction (MediaPipe -> Three.js)
    const flipZ = new THREE.Matrix4().makeScale(1, 1, -1);
    targetMatrix.multiply(flipZ);

    // 2. Decompose the incoming target matrix
    targetMatrix.decompose(_targetPos, _targetQuat, _targetScale);
    _targetPos.add(
      new THREE.Vector3(0, 0, DEPTH_OFFSET).applyQuaternion(_targetQuat),
    );
    // Eyeglasses frame width adjustment
    _targetScale.multiplyScalar(frameWidth.value);

    if (!obj.userData.lastMatrix) {
      // First frame: apply immediately
      obj.matrix.copy(targetMatrix);
      obj.userData.lastMatrix = targetMatrix.clone();
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
