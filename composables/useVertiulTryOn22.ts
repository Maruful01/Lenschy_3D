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
import { FACE_TRIANGULATION_INDICES } from "../constants/faceTriangulation";

// Constants for model adjustment
const BRIDGE_OFFSET = new THREE.Vector3(0, 2, 0.05); // Adjust glasses fit on nose (units: cm)
const SMOOTHING = 0.4; // 0 = no smoothing, 0.9 = heavy smoothing

const GLTF_TEMPLE_LEFT_NAME = "Temple_L_End";
const GLTF_TEMPLE_RIGHT_NAME = "Temple_R_End";

type GlassesUserData = {
  lastMatrix?: THREE.Matrix4;
  templeL?: THREE.Object3D | null;
  templeR?: THREE.Object3D | null;
  initialTempleLPos?: THREE.Vector3;
  initialTempleRPos?: THREE.Vector3;
  canonicalTempleLPos?: THREE.Vector3;
  canonicalTempleRPos?: THREE.Vector3;
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
  const faceOccluder = shallowRef<THREE.Mesh | null>(null);
  const glassesContainer = shallowRef<
    (THREE.Group & { userData: GlassesUserData }) | null
  >(null);

  // Reactive Video metadata
  const videoMetadata = ref({ width: 0, height: 0 });

  let faceLandmarker: FaceLandmarker | null = null;
  let rafId = 0;
  const DEPTH_OFFSET = -5.5;
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
      outputFaceWorldLandmarks: true,
      numFaces: 1,
    } as any);
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

    // Initialize Face Occluder
    const faceGeometry = new THREE.BufferGeometry();
    faceGeometry.setIndex(FACE_TRIANGULATION_INDICES);
    faceGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(468 * 3), 3),
    );
    const faceMaterial = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
    });
    const occluder = new THREE.Mesh(faceGeometry, faceMaterial);
    occluder.renderOrder = 1;
    faceOccluder.value = occluder;

    const loader = new GLTFLoader();
    loader.load(glassesModelSrc, (gltf) => {
      const model = gltf.scene;
      model.rotation.set(Math.PI, 0, Math.PI);
      model.position.add(BRIDGE_OFFSET);

      const container = new THREE.Group() as any as THREE.Group & {
        userData: GlassesUserData;
      };
      container.userData = {};
      container.add(model);
      container.matrixAutoUpdate = false;

      let templeL: any = null;
      let templeR: any = null;

      model.traverse((node: any) => {
        if (node.isMesh) {
          node.renderOrder = 5;
          node.material.depthWrite = true;
          node.material.depthTest = true;
        }
        if (node.name.includes(GLTF_TEMPLE_LEFT_NAME)) templeL = node;
        if (node.name.includes(GLTF_TEMPLE_RIGHT_NAME)) templeR = node;
      });

      container.userData.templeL = templeL;
      container.userData.templeR = templeR;

      if (templeL) {
        container.userData.initialTempleLPos = (
          templeL as any
        ).position.clone();
        model.updateMatrixWorld(true);
        const pos = new THREE.Vector3();
        (templeL as any).getWorldPosition(pos);
        container.worldToLocal(pos);
        container.userData.canonicalTempleLPos = pos;
      }
      if (templeR) {
        container.userData.initialTempleRPos = (
          templeR as any
        ).position.clone();
        model.updateMatrixWorld(true);
        const pos = new THREE.Vector3();
        (templeR as any).getWorldPosition(pos);
        container.worldToLocal(pos);
        container.userData.canonicalTempleRPos = pos;
      }

      container.renderOrder = 2;
      // Add occluder to container so it follows head pose & smoothing
      if (faceOccluder.value) {
        container.add(faceOccluder.value);
      }
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

  // Scratch vectors and state for dynamic temple constraints
  const _v1 = new THREE.Vector3();
  const _v2 = new THREE.Vector3();
  const _yAxis = new THREE.Vector3(0, 1, 0);
  let _smoothedYaw = 0;
  const _smoothedLandmarks = new Float32Array(468 * 3);
  let _hasSmoothedLandmarks = false;

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
    obj.updateMatrixWorld(true);

    obj.visible = true;

    // 3.5. Update Face Occluder
    const worldLandmarks = (results as any).faceWorldLandmarks?.[0];
    const occluder = faceOccluder.value;
    if (worldLandmarks && occluder) {
      const posAttr = occluder.geometry.attributes.position;
      const positions = posAttr.array as Float32Array;

      for (let i = 0; i < 468; i++) {
        const lm = worldLandmarks[i];
        if (!lm) continue;

        // Transform to Three.js coordinates (scale by 100)
        // Note: MediaPipe faceWorldLandmarks are in meters, centered at head origin.
        // Coordinate system: +X right, +Y up, +Z forward (towards camera).
        // Since we are child of glassesContainer (already flipped Z), we match Three.js.
        const tx = lm.x * 100;
        const ty = lm.y * 100;
        const tz = lm.z * 100;

        const idx = i * 3;
        if (!_hasSmoothedLandmarks) {
          _smoothedLandmarks[idx] = tx;
          _smoothedLandmarks[idx + 1] = ty;
          _smoothedLandmarks[idx + 2] = tz;
        } else {
          _smoothedLandmarks[idx] = THREE.MathUtils.lerp(
            _smoothedLandmarks[idx],
            tx,
            1 - SMOOTHING,
          );
          _smoothedLandmarks[idx + 1] = THREE.MathUtils.lerp(
            _smoothedLandmarks[idx + 1],
            ty,
            1 - SMOOTHING,
          );
          _smoothedLandmarks[idx + 2] = THREE.MathUtils.lerp(
            _smoothedLandmarks[idx + 2],
            tz,
            1 - SMOOTHING,
          );
        }
        positions[idx] = _smoothedLandmarks[idx];
        positions[idx + 1] = _smoothedLandmarks[idx + 1];
        positions[idx + 2] = _smoothedLandmarks[idx + 2];
      }
      _hasSmoothedLandmarks = true;
      posAttr.needsUpdate = true;
      occluder.visible = true;
    } else if (occluder) {
      occluder.visible = false;
    }

    // 4. Implement Landmark-Driven Constraint System (Temples)
    if (
      worldLandmarks &&
      obj.userData.templeL &&
      obj.userData.templeR &&
      obj.userData.canonicalTempleLPos &&
      obj.userData.canonicalTempleRPos
    ) {
      const bridgeLM = worldLandmarks[168];
      const leftEarLM = worldLandmarks[234];
      const rightEarLM = worldLandmarks[454];

      if (bridgeLM && leftEarLM && rightEarLM) {
        const tL = obj.userData.templeL;
        const tR = obj.userData.templeR;
        const canonL = obj.userData.canonicalTempleLPos;
        const canonR = obj.userData.canonicalTempleRPos;

        // Target positions in face-local space (cm), bridge is origin
        const targetL = new THREE.Vector3(
          (leftEarLM.x - bridgeLM.x) * 100,
          -(leftEarLM.y - bridgeLM.y) * 100,
          -(leftEarLM.z - bridgeLM.z) * 100,
        );
        const targetR = new THREE.Vector3(
          (rightEarLM.x - bridgeLM.x) * 100,
          -(rightEarLM.y - bridgeLM.y) * 100,
          -(rightEarLM.z - bridgeLM.z) * 100,
        );

        // 1. Head Yaw Calculation (from landmarks)
        const dx = targetR.x - targetL.x;
        const dz = targetR.z - targetL.z;
        const rawYaw = Math.atan2(dz, dx);

        // Apply temporal smoothing to yaw to prevent jitter
        _smoothedYaw = THREE.MathUtils.lerp(
          _smoothedYaw,
          rawYaw,
          1 - SMOOTHING,
        );

        // 2. Rotate Canonical Positions by Smoothed Yaw
        // Optimization: Use scratch vectors _v1, _v2
        const rotatedL = _v1
          .copy(canonL)
          .sub(BRIDGE_OFFSET)
          .applyAxisAngle(_yAxis, _smoothedYaw);
        const rotatedR = _v2
          .copy(canonR)
          .sub(BRIDGE_OFFSET)
          .applyAxisAngle(_yAxis, _smoothedYaw);

        // 3. Lateral Constraint (Green Line Rule)
        // Left Temple constraint (handles side-crossing via rotatedL.x sign)
        if (rotatedL.x < 0) {
          if (targetL.x > rotatedL.x) targetL.x = rotatedL.x;
        } else {
          if (targetL.x < rotatedL.x) targetL.x = rotatedL.x;
        }

        // Right Temple constraint
        if (rotatedR.x > 0) {
          if (targetR.x < rotatedR.x) targetR.x = rotatedR.x;
        } else {
          if (targetR.x > rotatedR.x) targetR.x = rotatedR.x;
        }

        // Red Line Constraint (Vertical): Tie to ear height
        // (Handled by using targetL.y and targetR.y directly)

        // Project targets into parent local space
        // We update model world matrix once to ensure accuracy for coordinate conversion
        obj.children[0].updateMatrixWorld(true);

        // Map targets back from bridge-relative to face-center-relative space
        const worldTargetL = obj.localToWorld(targetL.add(BRIDGE_OFFSET));
        const localTargetL = tL.parent!.worldToLocal(worldTargetL);
        tL.position.lerp(localTargetL, 1 - SMOOTHING);

        const worldTargetR = obj.localToWorld(targetR.add(BRIDGE_OFFSET));
        const localTargetR = tR.parent!.worldToLocal(worldTargetR);
        tR.position.lerp(localTargetR, 1 - SMOOTHING);
      }
    }
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
