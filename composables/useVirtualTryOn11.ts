import { ref, shallowRef, type Ref, onUnmounted } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import faceMeshModule from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";

// MediaPipe landmark indices
const LEFT_EYE = 33;
const RIGHT_EYE = 263;
const NOSE = 168;

export function useVirtualTryOn(
  modelSrc: string,
  frameWidth: Ref<number>,
  videoRef: Ref<HTMLVideoElement | null>
) {
  const glassesObject = shallowRef<THREE.Group | null>(null);
  const isModelReady = ref(false);

  let camera: cam.Camera | null = null;
  let faceMesh: any = null;

  // -----------------------------
  // Load GLB model (same behavior as old version)
  // -----------------------------
  const loader = new GLTFLoader();
  loader.load(modelSrc, (gltf) => {
    const model = gltf.scene;

    // Ensure predictable transforms (matches old behavior)
    model.traverse((obj: any) => {
      if (obj.isMesh) {
        obj.frustumCulled = false;
      }
    });

    model.rotation.set(0, 0, 0);
    model.position.set(0, 0, -1.5);
    model.scale.setScalar(1);

    glassesObject.value = model;
    isModelReady.value = true;
  });

  // -----------------------------
  // FaceMesh setup (same tracking logic as previous version)
  // -----------------------------
  const initFaceMesh = () => {
    faceMesh = new faceMeshModule.FaceMesh({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);
  };

  // -----------------------------
  // Core tracking math (ported from old composable)
  // -----------------------------
  const onResults = (results: any) => {
    if (!glassesObject.value) return;
    if (!results.multiFaceLandmarks?.length) return;

    const lm = results.multiFaceLandmarks[0];

    const leftEye = lm[LEFT_EYE];
    const rightEye = lm[RIGHT_EYE];
    const nose = lm[NOSE];

    // Position (normalized → world)
    const x = (nose.x - 0.5) * 2;
    const y = -(nose.y - 0.5) * 2;

    // Eye distance (scale reference)
    const dx = rightEye.x - leftEye.x;
    const dy = rightEye.y - leftEye.y;
    const eyeDistance = Math.sqrt(dx * dx + dy * dy);

    const scale = eyeDistance * frameWidth.value;

    // Rotation (roll)
    const rotZ = Math.atan2(dy, dx);

    // Depth stabilization (same visual depth as old version)
    const z = THREE.MathUtils.lerp(-1.2, -2.0, eyeDistance);

    glassesObject.value.position.set(x, y, z);
    glassesObject.value.scale.setScalar(scale);
    glassesObject.value.rotation.set(0, 0, rotZ);
  };

  // -----------------------------
  // Camera control (HTML video only)
  // -----------------------------
  const startCamera = async () => {
    if (!videoRef.value) return;

    initFaceMesh();

    camera = new cam.Camera(videoRef.value, {
      onFrame: async () => {
        if (!faceMesh || !videoRef.value) return;
        await faceMesh.send({ image: videoRef.value });
      },
      width: 640,
      height: 480,
    });

    await camera.start();
  };

  const stopCamera = () => {
    camera?.stop();
    camera = null;

    faceMesh?.close?.();
    faceMesh = null;
  };

  onUnmounted(() => {
    stopCamera();
  });

  return {
    glassesObject,
    isModelReady,
    startCamera,
    stopCamera,
  };
}
