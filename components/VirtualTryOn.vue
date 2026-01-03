<template>
  <div class="try-on-container">
    <TresCanvas window-size>
      <TresPerspectiveCamera :position="[0, 0, 5]" :fov="45" />
      <TresScene>
        <!-- Display webcam feed as background on 3D plane -->
        <TresMesh :position="[0, 0, -5]">
          <TresPlaneGeometry :args="[16, 9]" />
          <TresMeshBasicMaterial :map="videoTexture" />
        </TresMesh>
        <!-- 3D eyeglass model -->
        <!-- Tells TresJS to render the 3D model stored in the glassesModel variable. -->
        <primitive v-if="isModelReady" :object="glassesModel!" />
        <TresAmbientLight :intensity="1" />
        <TresDirectionalLight :position="[0, 2, 5]" :intensity="1.5" />
      </TresScene>
    </TresCanvas>

    <!-- Hidden video element (keeps webcam feed alive) -->
    <video
      ref="webcamRef"
      autoplay
      playsinline
      muted
      class="hidden-video"
    ></video>

    <!-- Control button -->
    <button @click="toggleCamera" class="camera-button">
      {{ isCameraOn ? "Stop Camera" : "Start Try-On" }}
    </button>
  </div>
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

const { webcamRef, glassesModel, isModelReady, startCamera, stopCamera } =
  useVirtualTryOn(modelSrc);

const isCameraOn = ref(false);
const isOpen = ref(false);

const videoTexture = computed(() => {
  if (webcamRef.value) {
    return new VideoTexture(webcamRef.value);
  }
  return null;
});

const closeModal = () => {
  isOpen.value = false;
  stopCamera();
};

const toggleCamera = () => {
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
</style>
