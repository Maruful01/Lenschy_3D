<script setup lang="ts">
import {
  ref,
  defineProps,
  onBeforeUnmount,
  computed, // ✅ 1. Import 'computed' from Vue
} from "vue";
import { navigateTo } from "#app";
import { slugify } from "~/constants";
import { useVirtualTryOn } from "@/composables/useVrTryon";

// --- TresJS and Three.js Imports ---
import { TresCanvas } from "@tresjs/core";
// ❌ We will no longer use the Cientos helper for this
// import { useVideoTexture } from "@tresjs/cientos";
import { VideoTexture } from "three"; // ✅ 2. Import VideoTexture directly from Three.js

// --- Props (unchanged) ---
const props = defineProps({
  // ... your props
});

// --- Component State (unchanged) ---
const isOpen = ref(false);
const frameWidth = ref<number>(1.64);

// --- Virtual Try-On Setup ---
const { webcamRef, glassesModel, isModelReady, startCamera, stopCamera } =
  useVirtualTryOn("/try_on_eyeglass1.glb");

// ✅ 3. Create a reactive video texture with a computed property
const videoTexture = computed(() => {
  // Only create the texture if the webcamRef is mounted and the video is ready to play
  if (webcamRef.value && webcamRef.value.readyState >= 3) {
    return new VideoTexture(webcamRef.value);
  }
  return null; // Return null if the video isn't ready
});

// --- Modal Controls (unchanged) ---
const openModal = async () => {
  isOpen.value = true;
  await startCamera();
};

const closeModal = () => {
  isOpen.value = false;
  stopCamera();
};

// --- Lifecycle (unchanged) ---
onBeforeUnmount(() => {
  if (isOpen.value) {
    stopCamera();
  }
});
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 ... z-50">
    <div class="bg-white ... relative flex flex-col">
      <div class="try-on-container ...">
        <TresCanvas clear-color="#000000" alpha>
          <TresPerspectiveCamera :position="[0, 0, 5]" :fov="45" />
          <TresScene>
            <TresMesh :scale-x="-1" :position="[0, 0, -5]">
              <TresPlaneGeometry :args="[16, 9]" />
              <TresMeshBasicMaterial :map="videoTexture" />
            </TresMesh>

            <primitive v-if="isModelReady" :object="glassesModel!" />

            <TresAmbientLight :intensity="1" />
            <TresDirectionalLight :position="[0, 2, 5]" :intensity="1.5" />
          </TresScene>
        </TresCanvas>
      </div>

      <video
        ref="webcamRef"
        autoplay
        playsinline
        muted
        class="hidden-video"
      ></video>
    </div>
  </div>
</template>

<style scoped>
/* ... your existing styles ... */
</style>
