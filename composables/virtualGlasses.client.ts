import { ref, shallowRef, type Ref, onUnmounted } from "vue";
import * as cam from "@mediapipe/camera_utils";
import faceMeshModule from "@mediapipe/face_mesh";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface Landmark {
  x: number;
  y: number;
  z: number;
}

// MediaPipe FaceMesh is not strongly typed in the package surface.
const { FaceMesh } = faceMeshModule as any as { FaceMesh: any };

/**
 * Nuxt/Vue composable: webcam + FaceMesh + Three.js GLB glasses.
 *
 * Design rules enforced:
 * - Glasses stay LEVEL (roll = 0 always)
 * - Only YAW is allowed dynamically (pitch disabled)
 * - No mirror/converse: mirror is handled explicitly and yaw sign is compensated.
 * - Webcam is rendered inside the same WebGL canvas (prevents overlay drift/stretch).
 */
export function useVirtualTryOn(
  glassesModelSrc: string,
  frameWidth: Ref<number>,
  videoRef: Ref<HTMLVideoElement | null>,
  canvasRef: Ref<HTMLCanvasElement | null>
) {
  // MediaPipe camera helper
  const cameraRef = ref<cam.Camera | null>(null);

  // Three.js objects
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let rafId = 0;

  // Video plane rendered inside the SAME Three.js canvas
  let videoPlane: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshBasicMaterial
  > | null = null;
  let videoTexture: THREE.VideoTexture | null = null;

  // Size of the webcam plane in world units (computed from camera frustum & video aspect)
  let planeW = 16;
  let planeH = 9;

  const glassesContainer = shallowRef<THREE.Group | null>(null);
  const isModelReady = ref(false);

  // ----------------------------- CONFIG -----------------------------

  /**
   * MIRROR_VIDEO
   * - false (recommended): real-world (no flipped text)
   * - true: selfie mirror
   *
   * IMPORTANT: If you mirror your DOM <video> with CSS (scaleX(-1)), remove that CSS.
   * Mirror only here to keep landmarks and yaw consistent.
   */
  const MIRROR_VIDEO = false;

  /**
   * VIDEO_FIT
   * - "contain": natural webcam proportions (no stretching). May letterbox.
   * - "cover": fills the view but crops.
   */
  type VideoFitMode = "contain" | "cover";
  // Use `let` (not `const`) so TypeScript does not over-narrow this to only "contain".
  // (You can still treat it as a constant; we never reassign it.)
  let VIDEO_FIT: VideoFitMode = "contain";

  // Depth mapping (your required values)
  const BASE_Z = -8;
  const DEPTH_SCALE = 60;
  const Z_OFFSET = 7.9;

  // Smoothing (mandatory)
  const POSITION_SMOOTHING = 0.18; // higher = smoother but more lag
  const YAW_SMOOTHING = 0.72; // higher = smoother yaw
  const SCALE_SMOOTHING = 0.75;

  // Fit offsets (world units)
  const HORIZONTAL_OFFSET = 0.0;
  const VERTICAL_OFFSET = -0.06;

  // Closeness to face (negative pushes toward face)
  const DEPTH_OFFSET = -0.18;

  // Small extra offset applied along yaw-forward direction (helps side-view temples)
  const DEPTH_OFFSET_ALONG_YAW = -0.06;

  // Scale blending for temple realism
  const EAR_SCALE_WEIGHT = 0.14;

  // 0.0 = no turning, 1.0 = same as head, 0.6 = 40% less turning
  const YAW_GAIN = -0.1;

  // GLB fixed orientation (applied to the GLB model itself)
  // NOTE: Your current symptom is “back side appears in front” => Y must be 180.
  const MODEL_ROTATION_OFFSET_DEG = {
    // Toggle X between 0 and 180 if upside-down.
    x: 0,
    // Toggle Y between 0 and 180 if front/back is reversed.
    y: 0,
    // Keep 0 permanently (roll must remain locked).
    z: 0,
  } as const;

  // Optional yaw trim for your model
  const YAW_OFFSET_DEG = 1;

  // Debug
  const DEBUG_MODE = false;

  // Stable anchors (explicit)
  const IDX_LEFT_EYE_OUTER = 263;
  const IDX_RIGHT_EYE_OUTER = 33;
  const IDX_NOSE_BRIDGE = 168;
  const IDX_LEFT_EAR = 234;
  const IDX_RIGHT_EAR = 454;

  // --------------------------- helpers ---------------------------

  const normalizeAngle = (a: number) => {
    let x = a;
    while (x > Math.PI) x -= Math.PI * 2;
    while (x < -Math.PI) x += Math.PI * 2;
    return x;
  };

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const lerpAngle = (a: number, b: number, t: number) => {
    const da = normalizeAngle(b - a);
    return normalizeAngle(a + da * t);
  };

  const toPx = (L: Landmark[], i: number, vw: number, vh: number) =>
    new THREE.Vector3(L[i].x * vw, L[i].y * vh, L[i].z);

  const onResize = () => {
    if (!canvasRef.value || !renderer || !camera) return;
    const canvas = canvasRef.value;
    const w = Math.max(1, canvas.clientWidth || canvas.width || 800);
    const h = Math.max(1, canvas.clientHeight || canvas.height || 600);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  /** Keep webcam plane proportions natural (no stretching). */
  const updatePlaneDims = (vw: number, vh: number) => {
    if (!camera) {
      planeW = 16;
      planeH = 9;
      return;
    }

    // Camera frustum slice at Z = BASE_Z
    const dist = Math.abs(camera.position.z - BASE_Z);
    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const frustumH = 2 * Math.tan(fovRad / 2) * dist;
    const frustumW = frustumH * camera.aspect;

    const sx = frustumW / vw;
    const sy = frustumH / vh;
    const s = VIDEO_FIT === "cover" ? Math.max(sx, sy) : Math.min(sx, sy);

    planeW = vw * s;
    planeH = vh * s;
  };

  /** Map a pixel to world XY on the webcam plane (Z=BASE_Z), with explicit mirroring support. */
  const pxToWorldOnVideoPlane = (
    xPx: number,
    yPx: number,
    vw: number,
    vh: number
  ) => {
    updatePlaneDims(vw, vh);

    const xPxFixed = MIRROR_VIDEO ? vw - xPx : xPx;

    const x = (xPxFixed / vw - 0.5) * planeW;
    const y = (0.5 - yPx / vh) * planeH;
    return new THREE.Vector3(x, y, BASE_Z);
  };

  /** Perspective-correct projection from video plane to any Z plane. */
  const projectFromPlaneToZ = (pOnPlane: THREE.Vector3, targetZ: number) => {
    if (!camera) return pOnPlane;

    const camPos = camera.position;
    const dir = new THREE.Vector3().subVectors(pOnPlane, camPos);
    if (Math.abs(dir.z) < 1e-6) return pOnPlane;

    const t = (targetZ - camPos.z) / dir.z;
    return new THREE.Vector3(
      camPos.x + dir.x * t,
      camPos.y + dir.y * t,
      targetZ
    );
  };

  /** Consistent landmark mapping into 3D using your depth settings. */
  const toWorld3D = (ptPx: THREE.Vector3, vw: number, vh: number) => {
    const pPlane = pxToWorldOnVideoPlane(ptPx.x, ptPx.y, vw, vh);
    const z = BASE_Z - Z_OFFSET + ptPx.z * DEPTH_SCALE;
    return projectFromPlaneToZ(pPlane, z);
  };

  /** Render webcam inside Three.js canvas (always behind GLB). */
  const attachVideoPlane = (
    video: HTMLVideoElement,
    vw: number,
    vh: number
  ) => {
    if (!scene) return;

    updatePlaneDims(vw, vh);

    if (!videoTexture) {
      videoTexture = new THREE.VideoTexture(video);
      // @ts-ignore
      if ("colorSpace" in videoTexture)
        (videoTexture as any).colorSpace = THREE.SRGBColorSpace;
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.generateMipmaps = false;
    }

    if (!videoPlane) {
      const geo = new THREE.PlaneGeometry(planeW, planeH);
      const mat = new THREE.MeshBasicMaterial({
        map: videoTexture,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      videoPlane = new THREE.Mesh(geo, mat);
      videoPlane.position.set(0, 0, BASE_Z);
      videoPlane.scale.x = MIRROR_VIDEO ? -1 : 1;
      videoPlane.renderOrder = 0;
      scene.add(videoPlane);
    } else {
      const geo = videoPlane.geometry;
      if (
        Math.abs((geo.parameters.width ?? planeW) - planeW) > 1e-6 ||
        Math.abs((geo.parameters.height ?? planeH) - planeH) > 1e-6
      ) {
        videoPlane.geometry.dispose();
        videoPlane.geometry = new THREE.PlaneGeometry(planeW, planeH);
      }
      videoPlane.position.set(0, 0, BASE_Z);
      videoPlane.scale.x = MIRROR_VIDEO ? -1 : 1;
      videoPlane.material.map = videoTexture;
      videoPlane.material.needsUpdate = true;
    }
  };

  // --------------------------- init three ---------------------------

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

    // lighting
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(0, 2, 5);
    scene.add(dir);

    // load GLB
    const loader = new GLTFLoader();
    loader.load(
      glassesModelSrc,
      (gltf) => {
        const model = gltf.scene;

        // bake model orientation fixes here
        model.rotation.set(
          THREE.MathUtils.degToRad(MODEL_ROTATION_OFFSET_DEG.x),
          THREE.MathUtils.degToRad(MODEL_ROTATION_OFFSET_DEG.y),
          THREE.MathUtils.degToRad(MODEL_ROTATION_OFFSET_DEG.z)
        );

        const container = new THREE.Group();
        container.add(model);
        container.visible = false;
        container.renderOrder = 10;

        // Make sure temples don't disappear via culling; keep depth correct.
        model.traverse((node: any) => {
          if (!(node instanceof THREE.Mesh)) return;
          node.frustumCulled = false;

          if (Array.isArray(node.material)) {
            node.material.forEach((m: any) => {
              if (!m) return;
              m.depthTest = true;
              m.depthWrite = true;
            });
          } else if (node.material) {
            node.material.depthTest = true;
            node.material.depthWrite = true;
          }

          node.renderOrder = 1;
        });

        glassesContainer.value = container;
        scene!.add(container);
        isModelReady.value = true;
      },
      undefined,
      (err) => console.error("GLTF load error", err)
    );

    window.addEventListener("resize", onResize);

    const animate = () => {
      if (renderer && scene && camera) renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    animate();
  };

  // --------------------------- onResults ---------------------------

  const onResults = (results: any) => {
    const obj = glassesContainer.value;
    if (!obj || !videoRef.value || !camera || !scene || !renderer) return;

    const faces = results?.multiFaceLandmarks as Landmark[][] | undefined;
    if (!faces || faces.length === 0) {
      obj.visible = false;
      return;
    }

    const L = faces[0];

    const vw = results?.image?.width || videoRef.value.videoWidth || 1280;
    const vh = results?.image?.height || videoRef.value.videoHeight || 720;

    attachVideoPlane(videoRef.value, vw, vh);

    // anchor points
    const leftEyeOuter = toPx(L, IDX_LEFT_EYE_OUTER, vw, vh);
    const rightEyeOuter = toPx(L, IDX_RIGHT_EYE_OUTER, vw, vh);
    const noseBridge = toPx(L, IDX_NOSE_BRIDGE, vw, vh);

    const leftEar = toPx(L, IDX_LEFT_EAR, vw, vh);
    const rightEar = toPx(L, IDX_RIGHT_EAR, vw, vh);

    // --- Position anchored to nose bridge ---
    const bridgePlane = pxToWorldOnVideoPlane(
      noseBridge.x,
      noseBridge.y,
      vw,
      vh
    );
    const bridgeZ = BASE_Z - Z_OFFSET + noseBridge.z * DEPTH_SCALE;

    let targetPos = projectFromPlaneToZ(bridgePlane, bridgeZ);
    targetPos.x += HORIZONTAL_OFFSET;
    targetPos.y += VERTICAL_OFFSET;

    // push toward face along view direction
    const viewDir = new THREE.Vector3()
      .subVectors(camera.position, targetPos)
      .normalize();
    targetPos.addScaledVector(viewDir, DEPTH_OFFSET);

    // --- Yaw only (no pitch, no roll) ---
    const pL = toWorld3D(leftEyeOuter, vw, vh);
    const pR = toWorld3D(rightEyeOuter, vw, vh);

    let yaw = Math.atan2(pR.z - pL.z, pR.x - pL.x);
    if (MIRROR_VIDEO) yaw = -yaw;
    yaw = yaw * YAW_GAIN; // <-- reduce rotation strength here
    yaw += THREE.MathUtils.degToRad(YAW_OFFSET_DEG);

    // NOTE: yaw-dependent offset is applied later using the SMOOTHED yaw (for stability).

    // --- Scale ---
    const eyeDistPx = Math.hypot(
      rightEyeOuter.x - leftEyeOuter.x,
      rightEyeOuter.y - leftEyeOuter.y
    );

    const earDistPx = Math.hypot(
      rightEar.x - leftEar.x,
      rightEar.y - leftEar.y
    );

    const pxToWorldScale = (planeW / vw) * 0.2;
    const scaleFromEyes = eyeDistPx * pxToWorldScale * frameWidth.value;
    const scaleFromEars =
      earDistPx * pxToWorldScale * (frameWidth.value * 0.92);

    const desiredScale = Math.max(
      0.0001,
      scaleFromEyes * (1 - EAR_SCALE_WEIGHT) + scaleFromEars * EAR_SCALE_WEIGHT
    );

    // --- Smooth (position + yaw + scale) ---
    const prev = (obj.userData.prev ??= {
      // Initialize with the current target so the first frame does not jump.
      pos: targetPos.clone(),
      yaw,
      scale: desiredScale,
    });

    // Smooth yaw first (wrap-safe), then use it for any yaw-dependent position offset.
    const smoothYaw = lerpAngle(prev.yaw, yaw, 1 - YAW_SMOOTHING);

    // Apply yaw-forward offset using SMOOTHED yaw to keep large values stable.
    const forwardFromYaw = new THREE.Vector3(
      Math.sin(smoothYaw),
      0,
      Math.cos(smoothYaw)
    ).normalize();
    const targetPosWithYaw = targetPos
      .clone()
      .addScaledVector(forwardFromYaw, DEPTH_OFFSET_ALONG_YAW);

    // Position smoothing toward the final target
    obj.position.lerpVectors(
      prev.pos,
      targetPosWithYaw,
      1 - POSITION_SMOOTHING
    );

    // IMPORTANT: level always (roll=0, pitch=0), yaw only
    obj.rotation.set(0, smoothYaw, 0);

    const s = lerp(prev.scale, desiredScale, 1 - SCALE_SMOOTHING);
    obj.scale.setScalar(s);

    prev.pos.copy(obj.position);
    prev.yaw = smoothYaw;
    prev.scale = s;

    obj.visible = true;

    if (DEBUG_MODE) {
      // eslint-disable-next-line no-console
      console.log("yaw(deg)", THREE.MathUtils.radToDeg(smoothYaw));
    }
  };

  // --------------------------- start/stop ---------------------------

  const startCamera = async () => {
    if (!videoRef.value || !canvasRef.value) return;
    if (!renderer) await initThree();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: "user" },
    });

    const video = videoRef.value;
    video.srcObject = stream;
    await video.play();

    // Ensure metadata exists
    if (!video.videoWidth || !video.videoHeight) {
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        video.addEventListener("loadedmetadata", done, { once: true });
      });
    }

    attachVideoPlane(video, video.videoWidth || 1280, video.videoHeight || 720);
    onResize();

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

    cameraRef.value = new cam.Camera(video, {
      onFrame: async () => {
        await faceMesh.send({ image: video });
      },
      width: video.videoWidth || 1280,
      height: video.videoHeight || 720,
    });

    cameraRef.value.start();
  };

  const stopCamera = () => {
    if (cameraRef.value) {
      cameraRef.value.stop();
      cameraRef.value = null;
    }

    const stream = videoRef.value?.srcObject as MediaStream | undefined;
    if (stream) stream.getTracks().forEach((t) => t.stop());

    if (glassesContainer.value) glassesContainer.value.visible = false;

    if (rafId) cancelAnimationFrame(rafId);

    if (videoPlane) {
      videoPlane.geometry.dispose();
      videoPlane.material.dispose();
      scene?.remove(videoPlane);
      videoPlane = null;
    }
    if (videoTexture) {
      videoTexture.dispose();
      videoTexture = null;
    }

    rafId = 0;

    if (renderer) renderer.clear();

    window.removeEventListener("resize", onResize);
  };

  onUnmounted(() => stopCamera());

  return {
    videoRef,
    canvasRef,
    glassesContainer,
    isModelReady,
    startCamera,
    stopCamera,
  };
}

/**
 * ------------------- TUNING GUIDE -------------------
 *
 * 1) Front/back reversed (your current symptom)
 *    - MODEL_ROTATION_OFFSET_DEG.y: use 180 (currently set).
 *
 * 2) Upside down
 *    - MODEL_ROTATION_OFFSET_DEG.x: toggle 0 ↔ 180.
 *
 * 3) Closer to face (reduce floating)
 *    - DEPTH_OFFSET: more negative => closer (e.g. -0.22)
 *
 * 4) Vertical placement (still level)
 *    - VERTICAL_OFFSET: negative down, positive up
 *
 * 5) Side-view temples
 *    - DEPTH_OFFSET_ALONG_YAW: moves glasses along the yaw-forward direction.
 *      With a big value (e.g. 5.06) the glasses will be pushed far forward;
 *      this file applies it using SMOOTHED yaw to keep that position stable.
 *    - EAR_SCALE_WEIGHT: 0.10..0.20 (higher matches ear width but can add noise)
 *
 * 6) Mirror fix
 *    - MIRROR_VIDEO=true only if you want selfie mirror or were using CSS scaleX(-1)
 */
