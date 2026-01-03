import { ref, shallowRef, type Ref, onUnmounted } from "vue";
import * as cam from "@mediapipe/camera_utils";
import faceMeshModule from "@mediapipe/face_mesh";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VideoTexture } from "three";

interface Landmark {
  x: number;
  y: number;
  z: number;
}

// We treat FaceMesh as any here to keep the composable simple
const { FaceMesh } = faceMeshModule as any;

/**
 * useVirtualTryOn
 * -------------------------------------------------
 * - Uses a **single HTML canvas** for everything (video + 3D).
 * - No <video> element is needed in your template.
 * - Internally creates a hidden HTMLVideoElement for:
 *    - MediaPipe FaceMesh input
 *    - Three.js VideoTexture background
 */
export function useVirtualTryOn(
  glassesModelSrc: string,
  frameWidth: Ref<number>,
  canvasRef: Ref<HTMLCanvasElement | null>
) {
  // MediaPipe camera helper
  const cameraRef = ref<cam.Camera | null>(null);

  // Hidden <video> element used only in JS (not in template)
  let videoEl: HTMLVideoElement | null = null;

  // Three.js objects
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;

  const glassesContainer = shallowRef<THREE.Group | null>(null);
  const isModelReady = ref(false);

  // Scene constants
  const PLANE_WIDTH = 16;
  const PLANE_HEIGHT = 9;
  const SMOOTHING = 0.5;

  const BRIDGE_OFFSET = new THREE.Vector3(0, -1, 0); // small offset so frame sits on nose
  const BASE_Z = -5; // base Z for face plane
  const DEPTH_SCALE = 40; // how much mediapipe z affects world z
  const Z_OFFSET = 1; // glasses offset toward camera from BASE_Z

  // ---------- Helper functions ----------

  // Convert normalized landmark to pixel coordinates
  const toPx = (L: Landmark[], i: number, vw: number, vh: number) =>
    new THREE.Vector3(L[i].x * vw, L[i].y * vh, L[i].z);

  // Map pixel coords to world coords on a logical plane
  const pxToWorld = (xPx: number, yPx: number, vw: number, vh: number) => {
    const x = (xPx / vw - 0.5) * PLANE_WIDTH;
    const y = (0.5 - yPx / vh) * PLANE_HEIGHT;
    return new THREE.Vector3(x, y, 0);
  };

  const toWorld3D = (
    ptPx: THREE.Vector3,
    vw: number,
    vh: number,
    zScale = -0.6
  ) => {
    const xy = pxToWorld(ptPx.x, ptPx.y, vw, vh);
    const z = ptPx.z * PLANE_WIDTH * zScale;
    return new THREE.Vector3(xy.x, xy.y, z);
  };

  const onResize = () => {
    if (!canvasRef.value || !renderer || !camera) return;
    const canvas = canvasRef.value;
    const w = Math.max(1, canvas.clientWidth || canvas.width || 800);
    const h = Math.max(1, canvas.clientHeight || canvas.height || 600);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  // ---------- Three.js initialization on the single canvas ----------

  const initThree = async () => {
    if (!canvasRef.value) return;
    const canvas = canvasRef.value;

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(
      canvas.clientWidth || 800,
      canvas.clientHeight || 600,
      false
    );
    renderer.autoClear = true;

    scene = new THREE.Scene();

    const aspect = (canvas.clientWidth || 800) / (canvas.clientHeight || 600);
    camera = new THREE.PerspectiveCamera(45, aspect, 0.01, 1000);
    camera.position.set(0, 0, 5);

    // Lighting
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(0, 2, 5);
    scene.add(dir);

    // --- Video background plane (on same canvas) ---
    if (videoEl) {
      const videoTex = new VideoTexture(videoEl);
      videoTex.minFilter = THREE.LinearFilter;
      videoTex.magFilter = THREE.LinearFilter;
      videoTex.format = THREE.RGBAFormat;

      const planeGeo = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT);

      // const planeGeo = new THREE.BoxGeometry(1, 1, 1);
      const planeMat = new THREE.MeshBasicMaterial({ map: videoTex });
      const plane = new THREE.Mesh(planeGeo, planeMat);

      // Put plane slightly behind the face depth
      plane.position.set(0, 0, BASE_Z - 1);
      plane.renderOrder = 0;

      // IMPORTANT: plane is just background, never occludes glasses
      plane.material.depthWrite = true;
      plane.material.depthTest = true;

      scene.add(plane);
    }

    // --- Load GLTF glasses ---
    const loader = new GLTFLoader();
    loader.load(
      glassesModelSrc,
      (gltf) => {
        const model = gltf.scene;
        model.rotation.set(0, 0, 0);
        model.position.add(BRIDGE_OFFSET);

        const container = new THREE.Group();
        container.add(model);
        container.visible = false; // wait for first face results
        container.renderOrder = 10;

        // Keep normal depth behavior for glasses
        model.traverse((node: any) => {
          if (!(node instanceof THREE.Mesh)) return;
          node.frustumCulled = false;
          if (Array.isArray(node.material)) {
            node.material.forEach((m: any) => {
              m.depthTest = false;
              m.depthWrite = true;
              ("/");
            });
          } else if (node.material) {
            node.material.depthTest = false;
            node.material.depthWrite = true;
          }
        });

        scene!.add(container);
        glassesContainer.value = container;
        isModelReady.value = true;
      },
      undefined,
      (err) => {
        console.error("GLTF load error", err);
      }
    );

    // Render loop (keeps scene updated)
    const animate = () => {
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
      requestAnimationFrame(animate);
    };
    animate();

    window.addEventListener("resize", onResize);
  };

  // ---------- MediaPipe FaceMesh results -> pose the glasses ----------

  const onResults = (results: any) => {
    const obj = glassesContainer.value;
    if (!obj || !videoEl || !camera || !scene || !renderer) return;

    const faces = results?.multiFaceLandmarks as Landmark[][] | undefined;
    if (!faces || faces.length === 0) {
      obj.visible = false;
      return;
    }

    const L = faces[0];
    const vw = videoEl.videoWidth || videoEl.clientWidth || 1280;
    const vh = videoEl.videoHeight || videoEl.clientHeight || 720;

    // Key landmarks
    const leftEyeOuter = toPx(L, 263, vw, vh);
    const rightEyeOuter = toPx(L, 33, vw, vh);
    const noseBridge = toPx(L, 168, vw, vh);
    const forehead = toPx(L, 10, vw, vh);
    const leftEarOuter = toPx(L, 234, vw, vh);
    const rightEarOuter = toPx(L, 454, vw, vh);

    // Position (centered at nose bridge)
    const bridgeWorld = pxToWorld(noseBridge.x, noseBridge.y, vw, vh);
    const positionZ = BASE_Z - Z_OFFSET + noseBridge.z * DEPTH_SCALE;
    const targetPos = new THREE.Vector3(
      bridgeWorld.x,
      bridgeWorld.y,
      positionZ
    );

    // Scale from eye distance
    const dx = rightEyeOuter.x - leftEyeOuter.x;
    const dy = rightEyeOuter.y - leftEyeOuter.y;
    const eyeDistPx = Math.hypot(dx, dy);
    const pxToWorldScale = (PLANE_WIDTH / vw) * 0.2;
    const desiredScale = Math.max(
      0.0001,
      eyeDistPx * pxToWorldScale * frameWidth.value
    );

    // Orientation using ears (X) and forehead-nose (Y)
    const pLEar = toWorld3D(leftEarOuter, vw, vh);
    const pREar = toWorld3D(rightEarOuter, vw, vh);
    const pF = toWorld3D(forehead, vw, vh);
    const pN = toWorld3D(noseBridge, vw, vh);

    const earVec = new THREE.Vector3().subVectors(pREar, pLEar).normalize();
    const upVec = new THREE.Vector3().subVectors(pF, pN).normalize();
    const forward = new THREE.Vector3().crossVectors(earVec, upVec).normalize();

    const xAxis = earVec.clone();
    const zAxis = forward.clone();
    const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();

    const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    const headQuat = new THREE.Quaternion().setFromRotationMatrix(basis);

    const offsetQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, 0)
    );
    const targetQuat = headQuat.multiply(offsetQuat);

    // Smooth transform
    if (!obj.userData.prev) {
      obj.userData.prev = {
        pos: targetPos.clone(),
        quat: targetQuat.clone(),
        scale: desiredScale,
      };
      obj.position.copy(targetPos);
      obj.quaternion.copy(targetQuat);
      obj.scale.setScalar(desiredScale);
    } else {
      const prev = obj.userData.prev;
      obj.position.lerpVectors(prev.pos, targetPos, 1 - SMOOTHING);
      obj.quaternion.slerpQuaternions(prev.quat, targetQuat, 1 - SMOOTHING);
      const s = prev.scale * SMOOTHING + desiredScale * (1 - SMOOTHING);
      obj.scale.setScalar(s);
      prev.pos.copy(obj.position);
      prev.quat.copy(obj.quaternion);
      prev.scale = s;
    }

    obj.visible = true;
  };

  // ---------- Start / stop camera & FaceMesh ----------
  const startCamera = async () => {
    if (!canvasRef.value) return;

    // Create hidden video element once
    if (!videoEl) {
      videoEl = document.createElement("video");
      videoEl.autoplay = true;
      videoEl.muted = true;
      (videoEl as any).playsInline = true;
      videoEl.style.display = "none"; // not added to DOM
    }

    // Init Three.js once (uses videoEl as texture source)
    if (!renderer) {
      await initThree();
    }

    // Get webcam stream
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: "user" },
    });
    videoEl.srcObject = stream;

    await videoEl.play();

    // Setup MediaPipe FaceMesh
    const faceMesh = new FaceMesh({
      locateFile: (f: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });
    faceMesh.onResults(onResults);

    cameraRef.value = new cam.Camera(videoEl, {
      onFrame: async () => {
        await faceMesh.send({ image: videoEl! });
      },
      width: 1280,
      height: 720,
    });

    cameraRef.value.start();
  };

  const stopCamera = () => {
    if (cameraRef.value) {
      cameraRef.value.stop();
      cameraRef.value = null;
    }

    if (videoEl && videoEl.srcObject) {
      const stream = videoEl.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    }

    if (glassesContainer.value) {
      glassesContainer.value.visible = false;
    }

    if (renderer) {
      renderer.clear();
    }

    window.removeEventListener("resize", onResize);
  };

  onUnmounted(() => stopCamera());

  return {
    canvasRef,
    glassesContainer,
    isModelReady,
    startCamera,
    stopCamera,
  };
}
