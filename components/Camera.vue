<template>
  <div class="flex flex-col items-center justify-center min-h-screen">
    <!-- Open Camera Button -->
    <UButton
      @click="openModal"
      class="bg-blue-500 text-white px-4 py-2 rounded-md shadow-md hover:bg-blue-600"
    >
      Open Camera
    </UButton>

    <!-- Camera Modal -->
    <div
      v-if="isOpen"
      class="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50"
    >
      <div
        class="bg-white w-[700px] h-[700px] p-6 rounded-lg shadow-lg relative flex flex-col justify-between"
      >
        <!-- Close Button -->
        <UButton
          @click="closeModal"
          class="absolute top-3 right-3 text-gray-600 hover:text-red-500"
        >
          ✖
        </UButton>

        <h2 class="text-xl font-semibold text-center">Virtual Try-On</h2>

        <!-- Webcam & Canvas Container -->
        <div
          class="relative w-full h-[550px] bg-gray-200 flex justify-center items-center rounded-md overflow-hidden"
        >
          <!-- Video element for webcam -->
          <video
            ref="webcamRef"
            class="absolute w-full h-full object-cover"
            autoplay
            playsinline
          ></video>

          <!-- Canvas overlays the video -->
          <canvas ref="canvasRef" class="absolute w-full h-full"></canvas>
        </div>

        <!-- Buttons -->
        <div class="flex justify-between mt-4">
          <UButton
            @click="closeModal"
            class="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
            >Go Back</UButton
          >
          <UButton
            @click="takePhoto"
            class="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600"
            >Take Photo</UButton
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, onBeforeUnmount, nextTick } from "vue";
import faceMeshModule from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import Chosma1 from "@/public/chosma.1.png";

interface Landmark {
  x: number;
  y: number;
  z: number;
}

const {
  FaceMesh,
}: { FaceMesh: typeof import("@mediapipe/face_mesh").FaceMesh } =
  faceMeshModule as any;

export default {
  setup() {
    const isOpen = ref(false);
    const webcamRef = ref<HTMLVideoElement | null>(null);
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const glassesImg = ref<HTMLImageElement | null>(null);
    const cameraRef = ref<cam.Camera | null>(null);

    // Store original glasses size
    const glassesOriginalWidth = ref(0);
    const glassesOriginalHeight = ref(0);

    // Open Camera Modal & Start Camera
    const openModal = async () => {
      isOpen.value = true;
      await nextTick();
      setTimeout(startCamera, 500);
    };

    // Close Camera Modal & Stop Camera
    const closeModal = () => {
      isOpen.value = false;
      stopCamera();
    };

    // Function to draw glasses on detected face
    const drawGlasses = (
      ctx: CanvasRenderingContext2D,
      landmarks: Landmark[],
      videoWidth: number,
      videoHeight: number
    ) => {
      if (!glassesImg.value) return;

      const leftEye = landmarks[33]; // Left eye center
      const rightEye = landmarks[263]; // Right eye center
      const noseBridge = landmarks[6]; // Nose bridge

      // Convert to pixel coordinates
      const leftEyeX = leftEye.x * videoWidth;
      const leftEyeY = leftEye.y * videoHeight;
      const rightEyeX = rightEye.x * videoWidth;
      const rightEyeY = rightEye.y * videoHeight;
      const noseX = noseBridge.x * videoWidth;
      const noseY = noseBridge.y * videoHeight;

      // Compute center position using nose bridge
      const centerX = (leftEyeX + rightEyeX) / 2;
      const centerY = noseY;

      // Calculate rotation angle
      const angle = Math.atan2(rightEyeY - leftEyeY, rightEyeX - leftEyeX);

      // Calculate glasses width dynamically based on eye distance
      const eyeDistance = Math.hypot(
        rightEyeX - leftEyeX,
        rightEyeY - leftEyeY
      );
      const glassesWidth = eyeDistance * 2.3;
      const glassesHeight =
        glassesWidth *
        (glassesOriginalHeight.value / glassesOriginalWidth.value); // Keep aspect ratio

      if (glassesWidth > 0 && glassesHeight > 0) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);

        // Offset adjustments for a natural fit
        const offsetX = -glassesWidth / 2;
        const offsetY = -glassesHeight * 0.5;

        // Draw the scaled glasses
        ctx.drawImage(
          glassesImg.value,
          offsetX,
          offsetY,
          glassesWidth,
          glassesHeight
        );
        ctx.restore();
      }
    };

    // Process FaceMesh results
    const onResults = (results: any) => {
      if (!webcamRef.value || !canvasRef.value) return;

      const video = webcamRef.value;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // Set canvas size
      canvasRef.value.width = videoWidth;
      canvasRef.value.height = videoHeight;

      const ctx = canvasRef.value.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, videoWidth, videoHeight);
      ctx.drawImage(results.image, 0, 0, videoWidth, videoHeight);

      if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
          drawGlasses(ctx, landmarks, videoWidth, videoHeight);
        }
      }
    };

    // Start Camera with MediaPipe
    const startCamera = async () => {
      const img = new Image();
      img.src = Chosma1;
      img.onload = () => {
        glassesImg.value = img;
        glassesOriginalWidth.value = img.width;
        glassesOriginalHeight.value = img.height;
      };

      const faceMesh = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults(onResults);

      if (webcamRef.value) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        webcamRef.value.srcObject = stream;

        cameraRef.value = new cam.Camera(webcamRef.value, {
          onFrame: async () => {
            if (webcamRef.value) {
              await faceMesh.send({ image: webcamRef.value });
            }
          },
          width: 640,
          height: 480,
        });
        cameraRef.value.start();
      }
    };

    // Stop Camera
    const stopCamera = () => {
      if (cameraRef.value) {
        cameraRef.value.stop();
        cameraRef.value = null;
      }
    };

    // Take Photo (Capture Image from Canvas)
    const takePhoto = () => {
      if (!canvasRef.value) return;
      const dataUrl = canvasRef.value.toDataURL("image/png");
      console.log("Captured Image: ", dataUrl);
    };

    // Cleanup when unmounting
    onBeforeUnmount(() => {
      stopCamera();
    });

    return {
      isOpen,
      webcamRef,
      canvasRef,
      openModal,
      closeModal,
      takePhoto,
    };
  },
};
</script>

<style scoped>
.webcam {
  position: absolute;
  opacity: 0;
}
</style>
