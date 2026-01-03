<template>
  <div
    class="bg-white m-4 w-[700px] h-[610px] md:h-[700px] p-3 md:p-6 rounded-md md:rounded-lg shadow-lg relative flex flex-col justify-between"
  >
    <UButton
      @click="closeModal"
      class="absolute top-3 right-3 text-white hover:text-red-500 bg-teal-500 hover:bg-teal-400"
    >
      ✖
    </UButton>

    <h2 class="text-xl font-semibold text-center text-gray-800">
      Virtual Try-On
    </h2>

    <div
      class="relative w-full h-[550px] flex justify-center items-center rounded-md overflow-hidden z-40"
    >
      <video
        ref="webcamRef"
        class="absolute object-cover rounded-md"
        autoplay
        playsinline
      ></video>
      <canvas ref="canvasRef" class="absolute rounded-md"></canvas>
    </div>

    <div class="flex justify-between mt-2">
      <UButton
        @click="closeModal"
        class="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
      >
        <ArrowLeftOutlined />Go Back
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ArrowLeftOutlined } from "@ant-design/icons-vue";

const emit = defineEmits(["close", "capture"]);

const webcamRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const closeModal = () => {
  stopCamera();
  emit("close");
};

const captureImage = () => {
  if (canvasRef.value) {
    const dataUrl = canvasRef.value.toDataURL("image/png");
    emit("capture", dataUrl);
  }
};

// Example camera functions (you can implement these or pass them as props)
const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (webcamRef.value) {
      webcamRef.value.srcObject = stream;
    }
  } catch (err) {
    console.error("Error accessing camera:", err);
  }
};

const stopCamera = () => {
  if (webcamRef.value && webcamRef.value.srcObject) {
    const stream = webcamRef.value.srcObject as MediaStream;
    stream.getTracks().forEach((track) => track.stop());
  }
};

// Expose methods if needed
defineExpose({
  startCamera,
  stopCamera,
  captureImage,
});
</script>
