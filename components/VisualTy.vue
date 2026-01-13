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
      >
        ✖
      </UButton>

      <h2 class="text-xl font-semibold text-center mb-2">Virtual Try-On</h2>

      <div class="relative flex-1 overflow-hidden rounded-md">
        <TresCanvas window-size class="absolute inset-0">
          <TresPerspectiveCamera :position="[0, 0, 5]" :fov="45" />

          <TresScene>
            <!-- webcam background -->
            <TresMesh :position="[0, 0, -5]">
              <TresPlaneGeometry :args="[16, 9]" />
              <TresMeshBasicMaterial :map="videoTexture" />
            </TresMesh>

            <!-- glasses -->
            <primitive
              v-if="isModelReady && glassesObject"
              :object="glassesObject"
            />

            <TresAmbientLight :intensity="1" />
            <TresDirectionalLight :position="[0, 2, 5]" :intensity="1.5" />
          </TresScene>
        </TresCanvas>

        <!-- hidden live video -->
        <video ref="webcamRef" autoplay playsinline muted class="hidden" />
      </div>

      <a-slider
        v-model:value="frameWidth"
        :min="1.5"
        :max="1.8"
        :step="0.01"
        class="mt-3"
      />
    </div>
  </div>

  <button class="camera-button" @click="openModal">Start Try-On</button>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted } from "vue";
import { VideoTexture } from "three";
import { useVirtualTryOn } from "@/composables/useVirtualTryOn11";

const isOpen = ref(false);
const frameWidth = ref(1.64);

const webcamRef = ref<HTMLVideoElement | null>(null);

const { glassesObject, isModelReady, startCamera, stopCamera } =
  useVirtualTryOn("/Ray Ban RB8352.glb", frameWidth, webcamRef);

const videoTexture = computed(() =>
  webcamRef.value ? new VideoTexture(webcamRef.value) : null
);

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
