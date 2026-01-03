import { ref } from "vue";
import * as cam from "@mediapipe/camera_utils";

export function useCamera() {
  const webcamRef = ref<HTMLVideoElement | null>(null);
  const cameraRef = ref<cam.Camera | null>(null);

  // Start the camera
  const startCamera = async () => {
    if (!webcamRef.value) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
    });

    webcamRef.value.srcObject = stream;

    cameraRef.value = new cam.Camera(webcamRef.value, {
      onFrame: async () => {
        // No processing, just running the camera
      },
      width: 640,
      height: 480,
    });

    cameraRef.value.start();
  };

  // Stop the camera
  const stopCamera = () => {
    if (cameraRef.value) {
      cameraRef.value.stop();
      cameraRef.value = null;
    }
  };

  return {
    webcamRef,
    startCamera,
    stopCamera,
  };
}
