<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50"
  >
    <div
      class="bg-white m-4 w-[700px] h-[610px] md:h-[700px] p-3 md:p-6 rounded-md md:rounded-lg shadow-lg relative flex flex-col justify-between"
    >
      <UButton
        @click="closeModal"
        class="absolute top-3 right-3 text-white bg-red-500 hover:bg-red-700"
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
          v-show="!capturedImage"
          ref="webcamRef"
          class="absolute object-cover rounded-md"
          autoplay
          playsinline
          style="visibility: hidden"
        ></video>
        <canvas
          v-if="!capturedImage"
          ref="canvasRef"
          class="absolute w-full h-full object-cover"
        ></canvas>

        <img
          v-if="imagePreviewUrl"
          :src="imagePreviewUrl"
          alt="Captured Photo"
          class="absolute w-full h-full object-cover rounded-lg"
        />
      </div>

      <div class="flex justify-between mt-2">
        <UButton
          v-if="!capturedImage"
          @click="closeModal"
          class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 font-bold"
          >Close</UButton
        >
        <UButton
          v-if="!capturedImage"
          @click="takePhoto"
          class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 font-bold"
        >
          Take Photo
        </UButton>

        <UButton
          v-if="capturedImage"
          @click="takeNewImage"
          class="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600 font-bold"
        >
          Take a new image
        </UButton>

        <UButton
          v-if="capturedImage && isSignedIn"
          @click="handleUseImage"
          :disabled="!capturedImage || loading"
          class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 font-bold"
        >
          <span v-if="loading">Analyzing image...</span>
          <span v-else class="flex items-center justify-center ml-4">
            <RobotOutlined class="mr-2" /> Use this image
          </span>
        </UButton>

        <UButton
          v-if="capturedImage && !isSignedIn"
          class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 font-bold"
        >
          <ClientOnly>
            <SignedIn>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <SignInButton> Login </SignInButton>
            </SignedOut>
          </ClientOnly>
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount, computed, watch } from "vue";
import { useCamera } from "@/composables/useCamera";
import * as cam from "@mediapipe/camera_utils";
import pkg_drawing_utils from "@mediapipe/drawing_utils";
const { drawConnectors, drawLandmarks } = pkg_drawing_utils;
import pkg_face_mesh from "@mediapipe/face_mesh";

// --- Clerk and other component imports ---
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/vue";
import { RobotOutlined } from "@ant-design/icons-vue";

const {
  FaceMesh,
  FACEMESH_TESSELATION,
  FACEMESH_RIGHT_EYE,
  FACEMESH_LEFT_EYE,
  FACEMESH_RIGHT_EYEBROW,
  FACEMESH_LEFT_EYEBROW,
  FACEMESH_FACE_OVAL,
  FACEMESH_LIPS,
} = pkg_face_mesh;

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true,
  },
  loading: {
    type: Boolean,
    required: true,
  },
  isSignedIn: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(["update:isOpen", "photo-captured", "use-image"]);

// Reactive state for the component's UI and internal logic
const capturedImage = ref<File | null>(null);
const webcamRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
let faceMeshInstance: any | null = null;
let cameraInstance: cam.Camera | null = null;

const imagePreviewUrl = computed(() =>
  capturedImage.value ? URL.createObjectURL(capturedImage.value) : null
);

// Use Camera composable to manage camera stream
const { startCamera, stopCamera } = useCamera();

const startFaceMesh = async () => {
  await nextTick();
  // Initialize MediaPipe FaceMesh
  faceMeshInstance = new FaceMesh({
    locateFile: (moduleFile) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${moduleFile}`;
    },
  });

  faceMeshInstance.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  faceMeshInstance.onResults(onResults);

  // Initialize MediaPipe Camera
  if (webcamRef.value) {
    cameraInstance = new cam.Camera(webcamRef.value, {
      onFrame: async () => {
        if (webcamRef.value) {
          await faceMeshInstance?.send({ image: webcamRef.value });
        }
      },
      width: 640,
      height: 480,
    });
    cameraInstance.start();
  }
};

const stopFaceMesh = () => {
  stopCamera();
  if (cameraInstance) {
    cameraInstance.stop();
    cameraInstance = null;
  }
  if (faceMeshInstance) {
    faceMeshInstance.close();
    faceMeshInstance = null;
  }
};

const closeModal = () => {
  stopFaceMesh();
  capturedImage.value = null; // Clear the image on close
  emit("update:isOpen", false);
};

const takePhoto = () => {
  if (!canvasRef.value) return;

  // Capture the canvas with the mesh overlay
  const canvas = canvasRef.value;
  canvas.toBlob((blob) => {
    if (blob) {
      const file = new File([blob], "face-analysis-capture.png", {
        type: "image/png",
      });
      capturedImage.value = file;
      emit("photo-captured", file);
    }
  }, "image/png");
};

const takeNewImage = () => {
  capturedImage.value = null;
  emit("photo-captured", null);
};

const handleUseImage = () => {
  if (capturedImage.value) {
    emit("use-image", capturedImage.value);
  }
};

// --- MediaPipe Drawing Callback ---
function onResults(results: any) {
  if (!canvasRef.value || !webcamRef.value) return;

  const videoWidth = webcamRef.value.videoWidth;
  const videoHeight = webcamRef.value.videoHeight;

  canvasRef.value.width = videoWidth;
  canvasRef.value.height = videoHeight;

  const canvasCtx = canvasRef.value.getContext("2d");
  if (!canvasCtx) return;

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, videoWidth, videoHeight);

  // Flip the canvas horizontally to create a mirror effect
  canvasCtx.translate(videoWidth, 0);
  canvasCtx.scale(-1, 1);

  // Draw the video frame
  canvasCtx.drawImage(results.image, 0, 0, videoWidth, videoHeight);

  // Draw the face mesh if landmarks are detected
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    for (const landmarks of results.multiFaceLandmarks) {
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, {
        color: "#00FF00",
        lineWidth: 0.1,
      });
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW, {
        color: "#00FFFF",
        lineWidth: 1,
      });
      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, {
        color: "#00FF00",
        lineWidth: 0.1,
      });
      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW, {
        color: "#00FFFF",
        lineWidth: 1,
      });
      drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {
        color: "#00FFFF",
        lineWidth: 0.08,
      });

      // drawLandmarks(canvasCtx, landmarks, {
      //   color: "#00FF00",
      //   radius: 0.1,
      // });
    }
  }
  canvasCtx.restore();
}

// Watcher to start/stop camera when the modal opens/closes
watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      startFaceMesh();
    } else {
      stopFaceMesh();
    }
  }
);

onBeforeUnmount(() => {
  stopFaceMesh();
});
</script>

<style lang="css">
@media (max-width: 600px) {
  .ant-tour-inner {
    width: 90vw !important;
    max-width: 90vw !important;
    padding: 1rem !important;
    font-size: 0.875rem;
  }
  .ant-tour-title {
    font-size: 1rem !important;
  }
  .ant-tour-description {
    font-size: 0.875rem !important;
  }
}
</style>
