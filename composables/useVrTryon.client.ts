import { ref, shallowRef, type Ref } from "vue";
import * as cam from "@mediapipe/camera_utils";
import faceMeshModule from "@mediapipe/face_mesh";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface Landmark {
  x: number;
  y: number;
  z: number;
}

const {
  FaceMesh,
}: { FaceMesh: typeof import("@mediapipe/face_mesh").FaceMesh } =
  faceMeshModule as any;

export function useVirtualTryOn(
  glassesModelSrc: string,
  frameWidth: Ref<number>
) {
  // DOM
  const webcamRef = ref<HTMLVideoElement | null>(null);
  const cameraRef = ref<cam.Camera | null>(null);

  // 3D
  const glassesModel = shallowRef<THREE.Object3D | null>(null);
  const isModelReady = ref(false);

  // Scene params
  const PLANE_WIDTH = ref(16);
  const PLANE_HEIGHT = ref(9);
  const PLANE_Z = ref(-5);

  // Calibration knobs
  const SCALE_K = ref(0.2);
  const DEPTH_SCALE = ref(25);
  const BASE_Z = ref(0.3);
  const zOffset = ref(0.6);
  const Z_WORLD_K = ref(-0.6);

  // Smoothness
  const SMOOTHING = 0.25;

  // Model fine-tune
  const BRIDGE_OFFSET = new THREE.Vector3(0, -0.03, 0); // down a bit to sit on nose

  // IMPORTANT: default baseRollDeg changed to 0 (was 180 and caused upside-down)
  const baseRollDeg = ref(0);

  // Optional user offsets
  const rollOffsetDeg = ref(0);
  const yawOffsetDeg = ref(0);
  const pitchOffsetDeg = ref(0);

  // Utils (unchanged)
  const toPx = (L: Landmark[], i: number, vw: number, vh: number) =>
    new THREE.Vector3(L[i].x * vw, L[i].y * vh, L[i].z);

  const pxToWorld = (xPx: number, yPx: number, vw: number, vh: number) => {
    const x = (xPx / vw - 0.5) * PLANE_WIDTH.value;
    const y = (0.5 - yPx / vh) * PLANE_HEIGHT.value;
    return new THREE.Vector3(x, y, 0);
  };

  const toWorld3D = (ptPx: THREE.Vector3, vw: number, vh: number) => {
    const xy = pxToWorld(ptPx.x, ptPx.y, vw, vh);
    const z = ptPx.z * PLANE_WIDTH.value * Z_WORLD_K.value;
    // const z = ptPx.z * DEPTH_SCALE.value * Z_WORLD_K.value;
    return new THREE.Vector3(xy.x, xy.y, z);
  };

  // Load model (simplified & deterministic local orientation)
  const loadGlassesModel = () => {
    const loader = new GLTFLoader();
    loader.load(glassesModelSrc, (gltf) => {
      const model = gltf.scene as THREE.Object3D;

      // Reset local rotation and set a stable local orientation for the glasses.
      // Many GLTF models are modeled facing +Z or -Z; experiment with these two lines if needed:
      model.rotation.set(0, Math.PI, 0); // flip to face camera if model was backwards
      // model.rotateX(Math.PI); // use only if model is upside-down after the Y flip

      // small manual offset so the bridge sits better on nose
      model.position.add(BRIDGE_OFFSET);

      // Parent container receives head pose; child keeps local model orientation
      const container = new THREE.Group();
      container.add(model);

      // hide until first results
      container.visible = false;

      glassesModel.value = container;
      isModelReady.value = true;
    });
  };

  // FaceMesh handler (unchanged logic, uses container = obj)
  const onResults = (results: any) => {
    const obj = glassesModel.value;
    if (!obj) return;
    const v = webcamRef.value;
    const faces = results.multiFaceLandmarks as Landmark[][] | undefined;
    if (!v || !v.videoWidth || !v.videoHeight || !faces || faces.length === 0) {
      obj.visible = false;
      return;
    }

    const L = faces[0];
    const vw = v.videoWidth;
    const vh = v.videoHeight;

    const leftEyeOuter = toPx(L, 263, vw, vh);
    const rightEyeOuter = toPx(L, 33, vw, vh);
    const noseBridge = toPx(L, 168, vw, vh);
    const forehead = toPx(L, 10, vw, vh);

    const bridgeWorld = pxToWorld(noseBridge.x, noseBridge.y, vw, vh);
    const positionZ =
      PLANE_Z.value +
      0.08 +
      BASE_Z.value +
      zOffset.value +
      noseBridge.z * DEPTH_SCALE.value;
    const targetPos = new THREE.Vector3(
      bridgeWorld.x,
      bridgeWorld.y,
      positionZ
    );

    const dx = rightEyeOuter.x - leftEyeOuter.x;
    const dy = rightEyeOuter.y - leftEyeOuter.y;
    const eyeDistPx = Math.hypot(dx, dy);
    const pxToWorldScale = (PLANE_WIDTH.value / vw) * SCALE_K.value;
    const desiredScale = Math.max(
      0.0001,
      eyeDistPx * pxToWorldScale * frameWidth.value
    );

    const pL = toWorld3D(leftEyeOuter, vw, vh);
    const pR = toWorld3D(rightEyeOuter, vw, vh);
    const pN = toWorld3D(noseBridge, vw, vh);
    const pF = toWorld3D(forehead, vw, vh);

    const xAxis = new THREE.Vector3().subVectors(pR, pL).normalize();
    const yAxis = new THREE.Vector3().subVectors(pF, pN).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();

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

    // Smooth
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

  // Start camera (unchanged)
  const startCamera = async () => {
    if (!isModelReady.value) loadGlassesModel();
    if (!webcamRef.value) return;

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

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: "user" },
    });
    const video = webcamRef.value!;
    video.srcObject = stream;

    await new Promise<void>((res) => {
      if (video.readyState >= 1 && video.videoWidth && video.videoHeight) res();
      else video.onloadedmetadata = () => res();
    });
    try {
      await video.play();
    } catch {}

    cameraRef.value = new cam.Camera(video, {
      onFrame: async () => {
        await faceMesh.send({ image: video });
      },
      width: video.videoWidth,
      height: video.videoHeight,
    });

    cameraRef.value.start();
  };

  const stopCamera = () => {
    if (cameraRef.value) {
      cameraRef.value.stop();
      cameraRef.value = null;
    }
    const stream = webcamRef.value?.srcObject as MediaStream | undefined;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (glassesModel.value) glassesModel.value.visible = false;
  };

  return {
    webcamRef,
    glassesModel,
    isModelReady,
    startCamera,
    stopCamera,
    PLANE_WIDTH,
    PLANE_HEIGHT,
    PLANE_Z,
    SCALE_K,
    DEPTH_SCALE,
    BASE_Z,
    zOffset,
    Z_WORLD_K,
    rollOffsetDeg,
    yawOffsetDeg,
    pitchOffsetDeg,
    baseRollDeg,
  };
}
