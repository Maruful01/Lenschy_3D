<template>
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
        class="relative w-full h-[550px] flex justify-center items-center rounded-md overflow-hidden"
      >
        <TresCanvas class="absolute object-cover rounded-md">
          <TresPerspectiveCamera :position="[0, 0, 5]" :fov="45" />
          <TresScene>
            <!-- Display webcam feed as background on 3D plane -->
            <TresMesh :position="[0, 0, -5]">
              <TresPlaneGeometry :args="[16, 9]" />
              <TresMeshBasicMaterial :map="videoTexture" />
            </TresMesh>
            <!-- 3D eyeglass model -->
            <!-- Tells TresJS to render the 3D model stored in the glassesModel variable. -->
            <!-- <primitive v-if="isModelReady" :object="glassesModel!" /> -->
            <TresAmbientLight :intensity="1" />
            <TresDirectionalLight :position="[0, 2, 5]" :intensity="1.5" />
          </TresScene>
        </TresCanvas>
      </div>
      <a-slider v-model:value="frameWidth" :min="1.5" :max="1.8" :step="0.01" />
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

  <!-- Control button -->
  <button @click="openModal" class="camera-button">Start Try-On</button>
</template>

<script setup lang="ts">
import { ref, onUnmounted, computed } from "vue";
import { TresCanvas } from "@tresjs/core";
import { VideoTexture } from "three";
import * as THREE from "three";
import { useVirtualTryOn } from "@/composables/useVirtualTryOn";

// Path to your 3D eyeglass model
const modelSrc = "/titanium_frame_glass.glb";
let frameWidth = ref<number>(1.64);
let animationFrameId: number;

let renderer: THREE.WebGLRenderer;


const isCameraOn = ref(false);
const isOpen = ref(false);

const videoTexture = computed(() => {
  if (webcamRef.value) {
    return new VideoTexture(webcamRef.value);
  }
  return null;
});

const openModal = async () => {
  isOpen.value = true;
  await nextTick();
  setTimeout(startCamera, 500);
  startCamera();
};

const closeModal = () => {
  isOpen.value = false;
  stopCamera();
};

const toggleCamera = () => {
  openModal();
  if (isCameraOn.value) {
    stopCamera();
  } else {
    startCamera();
  }
  isCameraOn.value = !isCameraOn.value;
};

onUnmounted(() => {
  if (isCameraOn.value) stopCamera();
});
</script>

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
</style>
