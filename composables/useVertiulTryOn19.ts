import { useWindowSize } from "@vueuse/core";
import { watch } from "vue";
import { ref, shallowRef, type Ref, onUnmounted } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
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
  // Use VueUse for reactive window size
  const { width: winW, height: winH } = useWindowSize();

  // Reactive Three.js core objects
  const renderer = shallowRef<THREE.WebGLRenderer | null>(null);
  const scene = shallowRef<THREE.Scene | null>(null);
  const camera3d = shallowRef<THREE.PerspectiveCamera | null>(null);
  const videoPlane = shallowRef<THREE.Mesh | null>(null);
  const glassesContainer = shallowRef<
    (THREE.Group & { userData: GlassesUserData }) | null
  >(null);

  // Reactive Video metadata
  const videoMetadata = ref({ width: 0, height: 0 });

  let faceLandmarker: FaceLandmarker | null = null;
  let rafId = 0;
  const DEPTH_OFFSET = -4.5;
  const VIDEO_PLANE_Z = -100;

  const isModelReady = ref(false);

  // 1. Initialize Face Landmarker
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

  const syncLayout = () => {
    if (!videoRef.value || !renderer.value || !camera3d.value) return;

    // Use client dimensions for the renderer to match the layout
    const w = videoRef.value.clientWidth;
    const h = videoRef.value.clientHeight;
    if (!w || !h) return;

    renderer.value.setSize(w, h, false);

    camera3d.value.aspect = w / h;
    camera3d.value.updateProjectionMatrix();

    resizeVideoPlane();
  };

  const resizeVideoPlane = () => {
    if (!videoPlane.value || !camera3d.value || !videoRef.value) return;

    const { width: videoWidth, height: videoHeight } = videoMetadata.value;
    if (!videoWidth || !videoHeight) return;

    const cam = camera3d.value;
    const distance = Math.abs(cam.position.z - VIDEO_PLANE_Z);
    const vFov = THREE.MathUtils.degToRad(cam.fov);
    const planeHeight = 2 * Math.tan(vFov / 2) * distance;
    const planeWidth = planeHeight * cam.aspect;

    videoPlane.value.scale.set(planeWidth, planeHeight, 1);

    // Apply object-fit: cover logic to the texture
    const videoAspect = videoWidth / videoHeight;
    const canvasAspect = cam.aspect;
    const texture = (videoPlane.value.material as THREE.MeshBasicMaterial).map;

    if (texture) {
      texture.matrixAutoUpdate = false;
      if (videoAspect > canvasAspect) {
        // Video is wider than canvas
        const repeatX = canvasAspect / videoAspect;
        texture.repeat.set(repeatX, 1);
        texture.offset.set((1 - repeatX) / 2, 0);
      } else {
        // Video is taller than canvas
        const repeatY = videoAspect / canvasAspect;
        texture.repeat.set(1, repeatY);
        texture.offset.set(0, (1 - repeatY) / 2);
      }
      texture.updateMatrix();
    }
  };

  // 2. Initialize Three.js
  const initThree = async () => {
    const canvas = canvasRef.value!;
    const r = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.value = r;

    const s = new THREE.Scene();
    scene.value = s;

    const cam = new THREE.PerspectiveCamera(
      63,
      canvas.clientWidth / (canvas.clientHeight || 1),
      0.1,
      1000,
    );
    camera3d.value = cam;

    const setupVideoPlane = () => {
      const videoEl = videoRef.value;
      if (!videoEl || !scene.value || !camera3d.value) return;

      const videoTexture = new THREE.VideoTexture(videoEl);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.colorSpace = THREE.SRGBColorSpace;

      const videoMaterial = new THREE.MeshBasicMaterial({
        map: videoTexture,
        depthWrite: false,
      });

      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        videoMaterial,
      );
      plane.position.z = VIDEO_PLANE_Z;
      plane.renderOrder = 0;

      scene.value.add(plane);
      videoPlane.value = plane;
    };

    s.add(new THREE.AmbientLight(0xffffff, 1.5));

    const loader = new GLTFLoader();
    loader.load(glassesModelSrc, (gltf) => {
      const model = gltf.scene;
      model.rotation.set(Math.PI, 0, Math.PI);
      model.position.add(BRIDGE_OFFSET);

      const container = new THREE.Group() as any;
      container.add(model);
      container.matrixAutoUpdate = false;
      s.add(container);
      glassesContainer.value = container;
      isModelReady.value = true;
      setupVideoPlane();
    });
  };

  // Watch for changes in layout dependencies to sync deterministically
  watch(
    [winW, winH, videoMetadata, renderer, camera3d, videoPlane],
    () => {
      if (
        videoMetadata.value.width > 0 &&
        renderer.value &&
        camera3d.value &&
        videoPlane.value &&
        videoRef.value?.clientWidth
      ) {
        syncLayout();
      }
    },
    { flush: "post", immediate: true },
  );

  // 3. Main Processing Loop
  const renderLoop = () => {
    if (videoRef.value && faceLandmarker && videoRef.value.readyState >= 2) {
      const results = faceLandmarker.detectForVideo(
        videoRef.value,
        performance.now(),
      );
      updateScene(results);
    }
    if (renderer.value && scene.value && camera3d.value) {
      renderer.value.render(scene.value, camera3d.value);
    }
    rafId = requestAnimationFrame(renderLoop);
  };

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

    const flipZ = new THREE.Matrix4().makeScale(1, 1, -1);
    targetMatrix.multiply(flipZ);

    targetMatrix.decompose(_targetPos, _targetQuat, _targetScale);
    _targetPos.add(
      new THREE.Vector3(0, 0, DEPTH_OFFSET).applyQuaternion(_targetQuat),
    );
    _targetScale.multiplyScalar(frameWidth.value);

    if (!obj.userData.lastMatrix) {
      obj.matrix.copy(targetMatrix);
      obj.userData.lastMatrix = targetMatrix.clone();
    } else {
      obj.userData.lastMatrix.decompose(_pos, _quat, _scale);
      _pos.lerp(_targetPos, 1 - SMOOTHING);
      _quat.slerp(_targetQuat, 1 - SMOOTHING);
      _scale.lerp(_targetScale, 1 - SMOOTHING);
      obj.matrix.compose(_pos, _quat, _scale);
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

    // Setup metadata tracking
    const updateMetadata = () => {
      if (videoRef.value) {
        videoMetadata.value = {
          width: videoRef.value.videoWidth,
          height: videoRef.value.videoHeight,
        };
      }
    };

    videoRef.value.addEventListener("loadedmetadata", updateMetadata);
    // Initial check if already loaded
    if (videoRef.value.videoWidth) updateMetadata();

    renderLoop();
  };

  const stopCamera = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }

    const videoEl = videoRef.value;
    if (videoEl?.srcObject) {
      const stream = videoEl.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    }

    if (glassesContainer.value) {
      glassesContainer.value.visible = false;
      glassesContainer.value.userData.lastMatrix = undefined;
    }

    faceLandmarker?.close();
    faceLandmarker = null;
  };

  onUnmounted(() => {
    stopCamera();
    renderer.value?.dispose();
    faceLandmarker?.close();
  });

  return { startCamera, isModelReady, stopCamera };
}
