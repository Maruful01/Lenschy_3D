// composables/mediaPipe.ts
import { ref } from "vue";
import * as cam from "@mediapipe/camera_utils";
import faceMeshModule from "@mediapipe/face_mesh";
const {
  FaceMesh,
}: { FaceMesh: typeof import("@mediapipe/face_mesh").FaceMesh } =
  faceMeshModule as any;

interface Landmark {
  x: number;
  y: number;
  z: number;
}

export function useMediaPipe(
  glassesImgSrc: string,
  frameWidth: Ref<number, number>
) {
  const webcamRef = ref<HTMLVideoElement | null>(null);
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const cameraRef = ref<cam.Camera | null>(null);
  const glassesImg = ref<HTMLImageElement | null>(null);
  const glassesOriginalWidth = ref(0);
  const glassesOriginalHeight = ref(0);
  

  // Load Glasses Image from Parameter
  const loadGlassesImage = () => {
    const img = new Image();
    img.src = glassesImgSrc;
    img.onload = () => {
      glassesImg.value = img;
      glassesOriginalWidth.value = img.width;
      glassesOriginalHeight.value = img.height;
    };
  };

  // Function to Start Camera
  const startCamera = async () => {
    loadGlassesImage();

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

  // Function to Stop Camera
  const stopCamera = () => {
    if (cameraRef.value) {
      cameraRef.value.stop();
      cameraRef.value = null;
    }
  };

  // Function to Draw Glasses
  const drawGlasses = (
    ctx: CanvasRenderingContext2D,
    landmarks: Landmark[],
    videoWidth: number,
    videoHeight: number
  ) => {
    if (!glassesImg.value) return;

    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const noseBridge = landmarks[6];

    const leftEyeX = leftEye.x * videoWidth;
    const leftEyeY = leftEye.y * videoHeight;
    const rightEyeX = rightEye.x * videoWidth;
    const rightEyeY = rightEye.y * videoHeight;
    const noseX = noseBridge.x * videoWidth;
    const noseY = noseBridge.y * videoHeight;

    const centerX = (leftEyeX + rightEyeX) / 2;
    const centerY = noseY;
    const angle = Math.atan2(rightEyeY - leftEyeY, rightEyeX - leftEyeX);
    const eyeDistance = Math.hypot(rightEyeX - leftEyeX, rightEyeY - leftEyeY);
    const glassesWidth = eyeDistance * frameWidth.value;
    const glassesHeight =
      glassesWidth * (glassesOriginalHeight.value / glassesOriginalWidth.value);

    if (glassesWidth > 0 && glassesHeight > 0) {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      ctx.drawImage(
        glassesImg.value,
        -glassesWidth / 2,
        -glassesHeight * 0.5,
        glassesWidth,
        glassesHeight
      );
      ctx.restore();
    }
  };

  // Process FaceMesh Results
  const onResults = (results: any) => {
    if (!webcamRef.value || !canvasRef.value) return;

    const video = webcamRef.value;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

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

  return {
    webcamRef,
    canvasRef,
    startCamera,
    stopCamera,
  };
}
