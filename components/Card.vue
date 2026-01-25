<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount } from "vue";
import { navigateTo } from "#app";
import { getAppwriteGLBBlobURL, getAppwriteGLBURL, slugify } from "~/constants"; // Using namespace import for SSR safety
import { VideoTexture } from "three";
// import { useVirtualTryOn } from "@/composables/virtualGlasses";
// import { useVirtualTryOn } from "@/composables/useVrTryon";
import { useVirtualTryOn } from "@/composables/useVertiulTryOn24";
// import { useVirtualTryOn } from "@/composables/useVirtualTryOn7.client";

// import { useVirtualTryOn } from "@/composables/useVirtualTryOn20";
// import { TresCanvas } from "@tresjs/core";
import * as THREE from "three";
// import { useGLTF } from "@tresjs/cientos";

// --- Props (unchanged) ---
const props = defineProps({
  image1: String,
  image2: String,
  title: String,
  size: String,
  rating: Number,
  reviews: Number,
  discountedPrice: Number,
  originalPrice: Number,
  discount: Number,
  colors: Array,
  moreColors: Number,
});

const isOpen = ref(false);
const directionalRef = ref();

let animationFrameId: number;

let renderer: THREE.WebGLRenderer;

// Path to your 3D eyeglass model
// const modelSrc = "/titanium_frame_glass.glb";
// const modelSrc = "/TryOn_Eyeglasses.glb";
const modelSrc = "/Ray Ban RB8352.glb";
// const modelSrc = "/RB4287_TRYON11.glb";
// const modelSrc = "/RB4287_TRYON.glb";

// const modelSrc = "/scene.gltf";
// const modelSrc = "/eyeglass (1).glb";

// const modelSrc = "/try_on_eyeglass1.glb";
// const { nodes } = await useGLTF("/titanium_frame_glass.glb", { draco: true });
let frameWidth = ref<number>(1.15);

const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const cfg = useRuntimeConfig();

const objectUrl = ref<string>("");

let startCameraFn: (() => Promise<void>) | null = null;
let stopCameraFn: (() => void) | null = null;

const openModal = async () => {
  isOpen.value = true;
  await nextTick();

  objectUrl.value = await getAppwriteGLBBlobURL(
    cfg.public.APPWRITE_ENDPOINT,
    cfg.public.APPWRITE_PROJECT_ID,
    "696e6ee3002f63b9b2cb",
    "6975d8c000120ef699f2",
  );
  //  6975d3260002a6f10fa0

  const { startCamera, stopCamera, isModelReady } = useVirtualTryOn(
    objectUrl.value,
    frameWidth,
    videoRef,
    canvasRef,
  );
  startCameraFn = startCamera;
  stopCameraFn = stopCamera;

  setTimeout(() => startCameraFn?.(), 200);
};

const closeModal = () => {
  stopCameraFn?.();

  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value);
  objectUrl.value = "";

  isOpen.value = false;
};

onBeforeUnmount(() => stopCameraFn?.());

// const { startCamera, stopCamera, isModelReady } = useVirtualTryOn(
//   modelSrc,
//   frameWidth
// );

// const { startCamera, stopCamera, isModelReady } = useVirtualTryOn(
//   modelSrc,
//   frameWidth,
//   canvasRef,
// );
// const { webcamRef, glassesModel, isModelReady, startCamera, stopCamera } =
//   useVirtualTryOn(modelSrc, frameWidth);

// const videoTexture = computed(() => {
//   if (webcamRef.value) {
//     return new VideoTexture(webcamRef.value);
//   }
//   return null;
// });

// const openModal = async () => {
//   isOpen.value = true;
//   await nextTick();
//   setTimeout(startCamera, 700);
//   startCamera();
// };

// const openModal = async () => {
//   isOpen.value = true;
//   await nextTick();
//   setTimeout(() => startCamera(), 200);
// };

// const closeModal = () => {
//   isOpen.value = false;
//   stopCamera();
// };

// onBeforeUnmount(() => stopCamera());

const goToProductPage = () => {
  if (props.title) navigateTo(`/products/${slugify(props.title)}`);
};
</script>

<template>
  <div class="relative bg-[#F8F8FF] overflow-hidden w-full pt-[100%]">
    <!-- Product image -->
    <img
      v-if="props.image1"
      @click="goToProductPage"
      :src="props.image1"
      alt="Eyewear"
      class="absolute z-0 top-0 left-0 object-cover w-full h-full transition-all duration-300 group-hover:scale-125"
    />

    <!-- 🕶 Try On Button -->
    <div
      class="absolute bottom-2 left-1/2 -translate-x-1/2 transform z-10 cursor-pointer"
      @click.stop="openModal"
    >
      <a-button type="dashed" class="text-gray-600 font-semibold">
        🕶 Try On
      </a-button>
    </div>
  </div>

  <!-- Product info -->
  <div
    class="flex items-start justify-between mt-4 space-x-4 cursor-pointer"
    @click="goToProductPage"
  >
    <div>
      <h3 class="text-xs font-bold text-gray-900 sm:text-sm md:text-base">
        <a title="">
          {{ title }}
          <span class="absolute inset-0" aria-hidden="true"></span>
        </a>
      </h3>
      <!-- Assumes a Rating component exists -->
      <!-- <Rating :rate="rating!" /> -->
    </div>

    <div class="text-right">
      <p class="text-xs font-bold text-gray-900 sm:text-sm md:text-base">
        ৳{{ originalPrice }}
      </p>
      <p class="text-xs text-gray-400 line-through">৳{{ discountedPrice }}</p>
    </div>
  </div>

  <!-- 🎥 Try-on modal -->
  <div
    v-if="isOpen"
    class="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-20"
  >
    <div
      class="bg-white m-4 w-[700px] h-[610px] md:h-[700px] p-3 md:p-6 rounded-md md:rounded-lg shadow-lg relative flex flex-col justify-between"
    >
      <UButton
        @click="closeModal"
        class="absolute top-3 right-3 text-white hover:text-red-500 bg-teal-500 hover:bg-teal-400"
      >
        ✖
      </UButton>

      <h2
        class="text-xl font-semibold text-center text-gray-800 cursor-pointer"
      >
        Virtual Try-On
      </h2>
      <div
        class="relative w-full h-[550px] flex justify-center items-center rounded-md aspect-video overflow-hidden"
      >
        <video
          ref="videoRef"
          class="absolute inset-0 w-full h-full object-cover"
        ></video>
        <canvas ref="canvasRef" class="absolute inset-0 w-full h-full"></canvas>
      </div>
      <a-slider v-model:value="frameWidth" :min="1.1" :max="1.2" :step="0.01" />
      <div class="flex justify-between mt-2">
        <UButton
          @click="closeModal"
          class="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          <ArrowLeftOutlined />Go Back
        </UButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.try-on-container {
  width: 100%;
  height: 80vh;
  position: relative;
}

.hidden-video {
  display: none; /* Keeps webcam feed active but invisible */
}

.camera-button {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background-color: #007bff;
  color: white;
  cursor: pointer;
}

.camera-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1); /* Mirror the webcam feed */
}

.three-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Allows clicks to go through to elements behind if needed */
}

canvas.absolute {
  background: transparent !important;
  pointer-events: none;
}

.try-on-container {
  position: relative;
  width: 100%;
  max-width: 640px;
  margin: auto;
  aspect-ratio: 4 / 3;
}

.viewport {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;
  border-radius: 12px;
}

/* Ensure video and canvas stack perfectly */
video,
canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

canvas {
  pointer-events: none; /* Let clicks pass through to video if needed */
  z-index: 2;
}

.loader {
  position: absolute;
  z-index: 10;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  color: white;
}
</style>
