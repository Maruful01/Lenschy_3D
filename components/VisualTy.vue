<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-20 flex items-center justify-center bg-black/50"
  >
    <div
      class="relative w-[700px] h-[700px] bg-white rounded-lg shadow p-4 flex flex-col"
    >
      <UButton
        class="absolute top-3 right-3 bg-teal-500 text-white"
        @click="closeModal"
        >✖</UButton
      >

      <h2 class="text-xl font-semibold text-center mb-2">Virtual Try-On</h2>

      <div class="relative flex-1 overflow-hidden rounded-md">
        <!-- HTML canvas used for Three.js rendering (device-consistent) -->
        <canvas ref="canvasRef" class="absolute inset-0" />

        <!-- Hidden live webcam (tracking only) -->
        <video ref="webcamRef" autoplay playsinline muted class="hidden" />
      </div>

      <a-slider
        v-model:value="frameWidth"
        :min="1.4"
        :max="1.9"
        :step="0.01"
        class="mt-3"
      />
    </div>
  </div>

  <button class="camera-button" @click="openModal">Start Try-On</button>
</template>

<script setup lang="ts">
import { ref, shallowRef, nextTick, onUnmounted } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import faceMeshModule from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";

/* ================== STATE ================== */
const isOpen = ref(false);
const frameWidth = ref(1.64); // device-independent scaling factor

const webcamRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const glassesObject = shallowRef<THREE.Group | null>(null);

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera3D: THREE.PerspectiveCamera | null = null;
let mpCamera: cam.Camera | null = null;
let faceMesh: any = null;
let rafId = 0;

/* ================== THREE SETUP ================== */
const initThree = () => {
  if (!canvasRef.value) return;

  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    alpha: true,
    antialias: true,
  });

  const { clientWidth, clientHeight } = canvasRef.value;
  renderer.setSize(clientWidth, clientHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene = new THREE.Scene();

  camera3D = new THREE.PerspectiveCamera(
    45,
    clientWidth / clientHeight,
    0.1,
    100
  );
  camera3D.position.set(0, 0, 5);

  scene.add(new THREE.AmbientLight(0xffffff, 1));

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(0, 2, 5);
  scene.add(dir);
};

/* ================== LOAD GLB ================== */
const loadModel = () => {
  const loader = new GLTFLoader();
  loader.load("/Ray Ban RB8352.glb", (gltf) => {
    const model = gltf.scene;

    model.traverse((o: any) => {
      if (o.isMesh) o.frustumCulled = false;
    });

    model.rotation.set(0, 0, 0);
    model.position.set(0, 0, -1.5);
    model.scale.setScalar(1);

    glassesObject.value = model;
    scene?.add(model);
  });
};

/* ================== MEDIAPIPE ================== */
const LEFT_EYE = 33;
const RIGHT_EYE = 263;
const NOSE = 168;

const initFaceMesh = () => {
  faceMesh = new faceMeshModule.FaceMesh({
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
};

/* ================== CORE TRACKING (MATCHES OLD BEHAVIOR) ================== */
const onResults = (results: any) => {
  if (!glassesObject.value) return;
  if (!results.multiFaceLandmarks?.length) return;

  const lm = results.multiFaceLandmarks[0];

  const l = lm[LEFT_EYE];
  const r = lm[RIGHT_EYE];
  const n = lm[NOSE];

  // Position (normalized → world)
  const x = (n.x - 0.5) * 2;
  const y = -(n.y - 0.5) * 2;

  // Scale via eye distance (device independent)
  const dx = r.x - l.x;
  const dy = r.y - l.y;
  const eyeDist = Math.sqrt(dx * dx + dy * dy);
  const scale = eyeDist * frameWidth.value;

  // Rotation (roll)
  const rotZ = Math.atan2(dy, dx);

  // Depth stabilization
  const z = THREE.MathUtils.lerp(-1.1, -2.1, eyeDist);

  glassesObject.value.position.set(x, y, z);
  glassesObject.value.scale.setScalar(scale);
  glassesObject.value.rotation.set(0, 0, rotZ);
};

/* ================== RENDER LOOP ================== */
/* ================== RENDER LOOP (VIDEO + 3D CANVAS) ================== */
const ctx2d = ref<CanvasRenderingContext2D | null>(null);

const render = () => {
  if (!canvasRef.value || !webcamRef.value) return;

  // 1️⃣ Draw video frame to canvas (device-consistent background)
  if (!ctx2d.value) {
    ctx2d.value = canvasRef.value.getContext("2d");
  }

  const ctx = ctx2d.value;
  const video = webcamRef.value;

  if (ctx && video.videoWidth > 0) {
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
    ctx.drawImage(video, 0, 0, canvasRef.value.width, canvasRef.value.height);
  }

  // 2️⃣ Render Three.js glasses on top
  if (renderer && scene && camera3D) {
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(scene, camera3D);
  }

  rafId = requestAnimationFrame(render);
};

/* ================== CAMERA CONTROL ================== */
const startCamera = async () => {
  if (!webcamRef.value) return;

  initThree();
  loadModel();
  initFaceMesh();

  mpCamera = new cam.Camera(webcamRef.value, {
    onFrame: async () => {
      await faceMesh.send({ image: webcamRef.value! });
    },
    width: 640,
    height: 480,
  });

  await mpCamera.start();
  render();
};

const stopCamera = () => {
  cancelAnimationFrame(rafId);

  mpCamera?.stop();
  mpCamera = null;

  faceMesh?.close?.();
  faceMesh = null;

  renderer?.dispose();
  renderer = null;
};

/* ================== UI ================== */
const openModal = async () => {
  isOpen.value = true;
  await nextTick();
  await startCamera();
};

const closeModal = () => {
  isOpen.value = false;
  stopCamera();
};

onUnmounted(stopCamera);
</script>

<style scoped>
.camera-button {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #2563eb;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
}
</style>
