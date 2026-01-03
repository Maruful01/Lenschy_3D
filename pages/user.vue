<template>
    <div class="flex items-center justify-center min-h-screen relative">
      <!-- Webcam Video -->
      <video ref="webcamRef" class="absolute w-[640px] h-[480px] object-cover"></video>
  
      <!-- Canvas for Drawing FaceMesh -->
      <canvas ref="canvasRef" class="absolute w-[640px] h-[480px]"></canvas>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onBeforeUnmount } from "vue";
  import { FaceMesh } from "@mediapipe/face_mesh";
  import * as cam from "@mediapipe/camera_utils";
  
  const webcamRef = ref(null);
  const canvasRef = ref(null);
  let camera = null;
  
  // Function to draw face landmarks and lines
  const onResults = (results) => {
    if (!webcamRef.value || !canvasRef.value) return;
  
    const video = webcamRef.value;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
  
    // Set canvas size
    canvasRef.value.width = videoWidth;
    canvasRef.value.height = videoHeight;
  
    const ctx = canvasRef.value.getContext("2d");
    ctx.save();
    ctx.clearRect(0, 0, videoWidth, videoHeight);
    ctx.drawImage(results.image, 0, 0, videoWidth, videoHeight);
  
    if (results.multiFaceLandmarks) {
      for (const landmarks of results.multiFaceLandmarks) {
        drawFaceMesh(ctx, landmarks, videoWidth, videoHeight);
      }
    }
    ctx.restore();
  };
  
  // Function to draw facial landmark connections
  const drawFaceMesh = (ctx, landmarks, videoWidth, videoHeight) => {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
  
    // 1️⃣ Draw **Pupillary Distance (PD) Line** between both pupils (landmarks 468 → 473)
    drawLine(ctx, landmarks[468], landmarks[473], videoWidth, videoHeight, "blue");
  
    // 2️⃣ Draw **Ear-to-Ear Line** (bottom of each ear, landmarks 234 → 454)
    drawLine(ctx, landmarks[234], landmarks[454], videoWidth, videoHeight, "green");
  
    // 3️⃣ Draw a **rounded face outline** for better visibility
    drawFaceOutline(ctx, landmarks, videoWidth, videoHeight);
  };
  
  // Function to draw a single line between two landmarks
  const drawLine = (ctx, point1, point2, videoWidth, videoHeight, color = "red") => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.moveTo(point1.x * videoWidth, point1.y * videoHeight);
    ctx.lineTo(point2.x * videoWidth, point2.y * videoHeight);
    ctx.stroke();
  };
  
  // Function to draw a rounded face outline
  const drawFaceOutline = (ctx, landmarks, videoWidth, videoHeight) => {
    ctx.beginPath();
    ctx.strokeStyle = "yellow"; // Yellow outline for face
    ctx.lineWidth = 1;
  
    for (let i = 0; i < landmarks.length; i += 5) {
      const x = landmarks[i].x * videoWidth;
      const y = landmarks[i].y * videoHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  };
  
  // Start Camera & FaceMesh
  const startCamera = async () => {
    if (!webcamRef.value) return;
  
    // Get User Media (Webcam)
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    webcamRef.value.srcObject = stream;
  
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
  
    faceMesh.setOptions({
      maxNumFaces: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  
    faceMesh.onResults(onResults);
  
    camera = new cam.Camera(webcamRef.value, {
      onFrame: async () => {
        await faceMesh.send({ image: webcamRef.value });
      },
      width: 640,
      height: 480,
    });
  
    camera.start();
  };
  
  // Stop Camera
  const stopCamera = () => {
    if (camera) {
      camera.stop();
      camera = null;
    }
  };
  
  // Lifecycle Hooks
  onMounted(() => {
    startCamera();
  });
  
  onBeforeUnmount(() => {
    stopCamera();
  });
  </script>
  
  <style scoped>
  video,
  canvas {
    position: absolute;
    z-index: 1;
    width: 640px;
    height: 480px;
  }
  </style>
  