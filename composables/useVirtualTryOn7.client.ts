import { ref, shallowRef, type Ref, onUnmounted } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

/**
 * Nuxt:
 * - Keep filename suffix: `useVirtualTryOn.client.ts` (client-only)
 * - Import WITHOUT `.ts`: `import { useVirtualTryOn } from '@/composables/useVirtualTryOn'`
 * - Pass BOTH `canvasRef` and `videoRef` from your modal.
 *
 * Key fixes in this version:
 * 1) Pose updates are applied every frame (position + rotation + scale).
 * 2) Supports BOTH FaceMesh TFJS output shapes:
 *    - `face.keypoints: {x,y,z}[]` (newer)
 *    - `face.scaledMesh: [x,y,z][]` (older)
 * 3) Correct overlay alignment when your <video> uses `object-fit: cover` (cropping).
 * 4) Robust yaw/roll fallback from 2D when z is missing/flat.
 * 5) Depth-only face occluder for “temples behind face” realism.
 */

// ---------------------- CONFIG ----------------------

const LANDMARKS = {
  NOSE_BRIDGE: 168,
  FOREHEAD: 10,
  CHIN: 152,
  LEFT_EAR: 234,
  RIGHT_EAR: 454,
  LEFT_EYE_OUTER: 263,
  RIGHT_EYE_OUTER: 33,
} as const;

// Virtual video plane in world units (match your container aspect as closely as possible)
const PLANE_WIDTH = 16;
const PLANE_HEIGHT = 9;
const PLANE_Z = -5;

// If your <video> in the modal uses `object-cover`, keep this "cover".
// If you change the video to `object-contain`, set this "contain".
const VIDEO_OBJECT_FIT: "cover" | "contain" = "cover";

// If your <video> is mirrored (CSS transform: scaleX(-1)), set MIRROR_VIDEO=true
const MIRROR_VIDEO = true;

// Depth mapping (FaceMesh z is model-specific; treat this as calibration)
const MODEL_Z_SHIFT = -1.6;
const DEPTH_GAIN = 0.012; // try 0.006..0.02
const DEPTH_CLAMP = 0.8;

// Fit + smoothing
const BRIDGE_OFFSET = new THREE.Vector3(0, -0.25, 0);
const SMOOTHING = 0.25; // 0..1 (higher = smoother)

// Scale mix
const SCALE_FROM_EAR_K = 0.23;
const SCALE_FROM_EYE_K = 0.2;
const EAR_EYE_MIX = { ear: 0.7, eye: 0.3 };

// Safety clamps so the model never becomes “invisible” due to tiny scale
const MIN_MODEL_SCALE = 0.5;
const MAX_MODEL_SCALE = 8.0;

// Local model correction (toggle 180 if upside down / reversed)
const MODEL_ROTATION_OFFSET_DEG = { x: 0, y: 0, z: 0 } as const;

// Occluder (depth-only face mask)
const ENABLE_OCCLUDER = true;
const OCCLUDER_Z_BIAS = 0.03;
const FACE_OVAL: number[] = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109,
];

// Debug
const SHOW_MODEL_WHEN_NO_FACE = false; // set true only temporarily for rendering debug
const DEBUG_FORCE_TEST_PLACEMENT = false;

// Rotation behavior: keep glasses mostly level (damp pitch/roll) while following yaw.
const LOCK_PITCH_ROLL = true;
const YAW_GAIN = 1.0;
const PITCH_GAIN = 0.25;
const ROLL_GAIN = 0.35;
const YAW_CLAMP_DEG = 30;
const PITCH_CLAMP_DEG = 12;
const ROLL_CLAMP_DEG = 15;

// If TFJS z is missing/flat, we fall back to 2D yaw/roll estimation.
// NOTE: `scaledMesh.z` has different magnitude than `keypoints.z`, so use separate thresholds.
const Z_FLAT_THRESHOLD_KEYPOINTS = 0.002;
const Z_FLAT_THRESHOLD_SCALEDMESH = 1.0;
const FALLBACK_YAW_MAX_DEG = 25;
const FALLBACK_ROLL_MAX_DEG = 20;

// ---------------------- TYPES ----------------------

type Kp = { x: number; y: number; z?: number; name?: string };

type GlassesUserData = {
  prev?: {
    pos: THREE.Vector3;
    quat: THREE.Quaternion;
    scale: number;
  };
};

// ---------------------- HELPERS ----------------------

function degToRad(d: number) {
  return (d * Math.PI) / 180;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function setDepthOnlyMaterial(mat: THREE.MeshBasicMaterial) {
  mat.colorWrite = false;
  mat.depthWrite = true;
  mat.depthTest = true;
  mat.side = THREE.DoubleSide;
}

function normalizeGltfModelToUnitWidth(model: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  const width = Math.max(1e-6, size.x);
  const k = 1 / width;
  model.scale.setScalar(k);

  // center
  const box2 = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  box2.getCenter(center);
  model.position.sub(center);
}

function extractKps(face: any): {
  kps: Kp[];
  source: "scaledMesh" | "keypoints" | "none";
} {
  // Prefer `scaledMesh` when available because it provides a dense 468-point mesh with (x,y,z).
  // This matches the classic TFJS FaceMesh demos and is ideal for 3D landmark usage.
  if (Array.isArray(face?.scaledMesh) && face.scaledMesh.length) {
    const kps = (face.scaledMesh as Array<[number, number, number]>).map(
      (p) => ({
        x: p[0],
        y: p[1],
        z: p[2],
      })
    );
    return { kps, source: "scaledMesh" };
  }

  // Newer API shape
  if (Array.isArray(face?.keypoints) && face.keypoints.length) {
    return { kps: face.keypoints as Kp[], source: "keypoints" };
  }

  return { kps: [], source: "none" };
}

function zRangeOf(kps: Kp[]) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let seen = 0;

  for (let i = 0; i < kps.length; i++) {
    const z = kps[i].z;
    if (!Number.isFinite(z)) continue;
    min = Math.min(min, z as number);
    max = Math.max(max, z as number);
    seen++;
  }

  if (!seen) return { min: 0, max: 0, range: 0 };
  return { min, max, range: max - min };
}

/**
 * Maps a source-video pixel coordinate into the DISPLAYED coordinate system.
 * This is critical when the <video> is `object-fit: cover` (cropped).
 */
function sourcePxToDisplayedPx(
  x: number,
  y: number,
  srcW: number,
  srcH: number,
  dispW: number,
  dispH: number
) {
  const s =
    VIDEO_OBJECT_FIT === "cover"
      ? Math.max(dispW / srcW, dispH / srcH)
      : Math.min(dispW / srcW, dispH / srcH);

  const scaledW = srcW * s;
  const scaledH = srcH * s;

  // crop/pad offsets to center
  const offX = (scaledW - dispW) / 2;
  const offY = (scaledH - dispH) / 2;

  let dx = x * s - offX;
  const dy = y * s - offY;

  if (MIRROR_VIDEO) dx = dispW - dx;

  return { dx, dy };
}

function displayedPxToWorldXY(
  dx: number,
  dy: number,
  dispW: number,
  dispH: number
) {
  const x = (dx / dispW - 0.5) * PLANE_WIDTH;
  const y = (0.5 - dy / dispH) * PLANE_HEIGHT;
  return new THREE.Vector3(x, y, 0);
}

function kpToWorld(
  kp: Kp,
  srcW: number,
  srcH: number,
  dispW: number,
  dispH: number
) {
  const { dx, dy } = sourcePxToDisplayedPx(
    kp.x,
    kp.y,
    srcW,
    srcH,
    dispW,
    dispH
  );
  const xy = displayedPxToWorldXY(dx, dy, dispW, dispH);

  const zRaw = kp.z ?? 0;
  const dz = clamp(zRaw * DEPTH_GAIN, -DEPTH_CLAMP, DEPTH_CLAMP);
  const zWorld = PLANE_Z + MODEL_Z_SHIFT + dz;

  return new THREE.Vector3(xy.x, xy.y, zWorld);
}

function fallbackQuatFrom2D(kps: Kp[]) {
  const n = kps[LANDMARKS.NOSE_BRIDGE];
  const lE = kps[LANDMARKS.LEFT_EAR];
  const rE = kps[LANDMARKS.RIGHT_EAR];
  const lEye = kps[LANDMARKS.LEFT_EYE_OUTER];
  const rEye = kps[LANDMARKS.RIGHT_EYE_OUTER];

  if (!n || !lE || !rE || !lEye || !rEye) return null;

  // Roll from eye line slope
  const rollRaw = Math.atan2(rEye.y - lEye.y, rEye.x - lEye.x);
  const roll = clamp(
    rollRaw,
    -degToRad(FALLBACK_ROLL_MAX_DEG),
    degToRad(FALLBACK_ROLL_MAX_DEG)
  );

  // Yaw from left/right asymmetry to nose (works even without z)
  const dL = Math.hypot(n.x - lE.x, n.y - lE.y);
  const dR = Math.hypot(rE.x - n.x, rE.y - n.y);
  const asym = (dL - dR) / Math.max(1e-6, dL + dR); // [-1..1]

  const yaw = clamp(
    asym * degToRad(FALLBACK_YAW_MAX_DEG),
    -degToRad(FALLBACK_YAW_MAX_DEG),
    degToRad(FALLBACK_YAW_MAX_DEG)
  );

  // Pitch intentionally kept 0 for stability.
  const e = new THREE.Euler(0, yaw, roll, "YXZ");
  return new THREE.Quaternion().setFromEuler(e);
}

// ---------------------- COMPOSABLE ----------------------

export function useVirtualTryOn(
  glassesModelSrc: string,
  frameWidth: Ref<number>,
  canvasRef: Ref<HTMLCanvasElement | null>,
  videoRef: Ref<HTMLVideoElement | null>
) {
  // TFJS detector
  let detector: any | null = null;
  let tf: any | null = null;

  // THREE
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;

  let faceOccluder: THREE.Mesh<
    THREE.BufferGeometry,
    THREE.MeshBasicMaterial
  > | null = null;

  // loops
  let renderRaf = 0;
  let running = false;
  let estimating = false;
  let resizeObs: ResizeObserver | null = null;

  const glassesContainer = shallowRef<THREE.Group | null>(null);
  const isModelReady = ref(false);

  // Expose per-landmark 3D world coordinates (x,y,z) for ALL landmarks.
  // Layout: [x0,y0,z0, x1,y1,z1, ...]
  const faceWorldLandmarks = shallowRef<Float32Array | null>(null);

  // Useful for debugging / telemetry (which landmark source we used)
  const landmarksSource = ref<"scaledMesh" | "keypoints" | "none">("none");

  const sizeToCanvas = () => {
    if (!canvasRef.value || !renderer || !camera) return;
    const rect = canvasRef.value.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const ensureOccluder = () => {
    if (!scene || !ENABLE_OCCLUDER) return;
    if (faceOccluder) return;

    const geom = new THREE.BufferGeometry();
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    setDepthOnlyMaterial(mat);

    faceOccluder = new THREE.Mesh(geom, mat);
    faceOccluder.renderOrder = 5;
    scene.add(faceOccluder);
  };

  const updateOccluder = (
    kps: Kp[],
    srcW: number,
    srcH: number,
    dispW: number,
    dispH: number,
    zWorld: number
  ) => {
    if (!ENABLE_OCCLUDER) return;
    ensureOccluder();
    if (!faceOccluder) return;

    const pts: THREE.Vector2[] = [];
    for (const idx of FACE_OVAL) {
      const kp = kps[idx];
      if (!kp) continue;
      const { dx, dy } = sourcePxToDisplayedPx(
        kp.x,
        kp.y,
        srcW,
        srcH,
        dispW,
        dispH
      );
      const w = displayedPxToWorldXY(dx, dy, dispW, dispH);
      pts.push(new THREE.Vector2(w.x, w.y));
    }

    if (pts.length < 10) {
      faceOccluder.visible = false;
      return;
    }

    const tris = THREE.ShapeUtils.triangulateShape(pts, []);
    const positions = new Float32Array(tris.length * 3 * 3);
    let k = 0;

    for (const tri of tris) {
      for (let j = 0; j < 3; j++) {
        const p = pts[tri[j]];
        positions[k++] = p.x;
        positions[k++] = p.y;
        positions[k++] = zWorld;
      }
    }

    const geom = faceOccluder.geometry;
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    geom.computeVertexNormals();
    faceOccluder.visible = true;
  };

  const initThree = async () => {
    const canvas = canvasRef.value;
    if (!canvas) throw new Error("Canvas ref is null");

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();

    const rect = canvas.getBoundingClientRect();
    const aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
    camera = new THREE.PerspectiveCamera(45, aspect, 0.01, 1000);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, PLANE_Z);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(0, 2, 5);
    scene.add(dir);

    // Load glasses
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
    loader.setDRACOLoader(draco);

    loader.load(
      glassesModelSrc,
      (gltf) => {
        const model = gltf.scene;

        normalizeGltfModelToUnitWidth(model);

        model.rotation.set(
          degToRad(MODEL_ROTATION_OFFSET_DEG.x),
          degToRad(MODEL_ROTATION_OFFSET_DEG.y),
          degToRad(MODEL_ROTATION_OFFSET_DEG.z)
        );

        model.position.add(BRIDGE_OFFSET);

        const container = new THREE.Group() as THREE.Group & {
          userData: GlassesUserData;
        };
        container.userData = {};
        container.add(model);
        container.visible = false;
        container.renderOrder = 10;

        model.traverse((node: any) => {
          if (!(node instanceof THREE.Mesh)) return;
          node.frustumCulled = false;

          const mats = Array.isArray(node.material)
            ? node.material
            : [node.material];
          mats.forEach((m: any) => {
            if (!m) return;
            m.depthTest = true;
            m.depthWrite = true;
          });

          node.renderOrder = 10;
        });

        scene!.add(container);
        glassesContainer.value = container;
        isModelReady.value = true;

        if (DEBUG_FORCE_TEST_PLACEMENT) {
          container.visible = true;
          container.position.set(0, 0, PLANE_Z + MODEL_Z_SHIFT);
          container.scale.setScalar(2);
          container.quaternion.identity();
        }

        sizeToCanvas();
      },
      undefined,
      (err) => {
        console.error("GLTF load error:", glassesModelSrc, err);
        // Common cause for .gltf: missing .bin or textures in the same /public folder.
        // Open DevTools → Network to confirm RB4306_TRYON.bin and textures return 200.
      }
    );

    ensureOccluder();
    sizeToCanvas();

    resizeObs = new ResizeObserver(() => sizeToCanvas());
    resizeObs.observe(canvas);

    const renderLoop = () => {
      renderRaf = requestAnimationFrame(renderLoop);
      if (!renderer || !scene || !camera) return;
      renderer.render(scene, camera);
    };
    renderLoop();
  };

  const applyPose = (
    kps: Kp[],
    srcW: number,
    srcH: number,
    source: "scaledMesh" | "keypoints" | "none"
  ) => {
    const obj = glassesContainer.value as
      | (THREE.Group & { userData: GlassesUserData })
      | null;
    if (!obj || !canvasRef.value) return;

    const rect = canvasRef.value.getBoundingClientRect();
    const dispW = Math.max(1, rect.width);
    const dispH = Math.max(1, rect.height);

    const kpN = kps[LANDMARKS.NOSE_BRIDGE];
    const kpF = kps[LANDMARKS.FOREHEAD];
    const kpLE = kps[LANDMARKS.LEFT_EYE_OUTER];
    const kpRE = kps[LANDMARKS.RIGHT_EYE_OUTER];
    const kpLEar = kps[LANDMARKS.LEFT_EAR];
    const kpREar = kps[LANDMARKS.RIGHT_EAR];

    if (!kpN || !kpF || !kpLE || !kpRE || !kpLEar || !kpREar) {
      obj.visible = SHOW_MODEL_WHEN_NO_FACE;
      if (faceOccluder) faceOccluder.visible = false;
      return;
    }

    console.log("Eyeglass position:", obj.position);
    console.log("Eyeglass rotation:", obj.rotation.toArray());

    // Position: nose bridge
    const targetPos = kpToWorld(kpN, srcW, srcH, dispW, dispH);

    // Scale
    const earDistPx = Math.hypot(kpREar.x - kpLEar.x, kpREar.y - kpLEar.y);
    const eyeDistPx = Math.hypot(kpRE.x - kpLE.x, kpRE.y - kpLE.y);

    const pxToWorldEar = (PLANE_WIDTH / srcW) * SCALE_FROM_EAR_K;
    const pxToWorldEye = (PLANE_WIDTH / srcW) * SCALE_FROM_EYE_K;

    const combinedDist =
      earDistPx * EAR_EYE_MIX.ear + eyeDistPx * EAR_EYE_MIX.eye;
    const combinedScaleK =
      pxToWorldEar * EAR_EYE_MIX.ear + pxToWorldEye * EAR_EYE_MIX.eye;

    const fw = Number.isFinite(frameWidth.value) ? frameWidth.value : 1;
    const desiredScale = clamp(
      Math.max(0.0001, combinedDist * combinedScaleK * fw),
      MIN_MODEL_SCALE,
      MAX_MODEL_SCALE
    );

    // Build full per-landmark 3D world coords (x,y,z) in YOUR Three.js space.
    // Uses the same mapping as the glasses (so alignment stays consistent).
    const needed = kps.length * 3;
    if (
      !faceWorldLandmarks.value ||
      faceWorldLandmarks.value.length !== needed
    ) {
      faceWorldLandmarks.value = new Float32Array(needed);
    }
    for (let i = 0; i < kps.length; i++) {
      const w = kpToWorld(kps[i], srcW, srcH, dispW, dispH);
      const o = i * 3;
      faceWorldLandmarks.value[o] = w.x;
      faceWorldLandmarks.value[o + 1] = w.y;
      faceWorldLandmarks.value[o + 2] = w.z;
    }

    // Rotation: prefer 3D basis if z looks meaningful
    const zr = zRangeOf(kps).range;
    const zFlat =
      source === "scaledMesh"
        ? zr < Z_FLAT_THRESHOLD_SCALEDMESH
        : zr < Z_FLAT_THRESHOLD_KEYPOINTS;

    let targetQuat: THREE.Quaternion;

    if (!zFlat) {
      const pLEar = kpToWorld(kpLEar, srcW, srcH, dispW, dispH);
      const pREar = kpToWorld(kpREar, srcW, srcH, dispW, dispH);
      const pF = kpToWorld(kpF, srcW, srcH, dispW, dispH);
      const pN = kpToWorld(kpN, srcW, srcH, dispW, dispH);

      const xAxis = new THREE.Vector3().subVectors(pREar, pLEar).normalize();
      const yAxis = new THREE.Vector3().subVectors(pF, pN).normalize();
      let zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();

      // Ensure forward points toward camera (+Z)
      if (zAxis.z < 0) zAxis.multiplyScalar(-1);

      // Re-orthonormalize to reduce drift
      const yAxisOrtho = new THREE.Vector3()
        .crossVectors(zAxis, xAxis)
        .normalize();

      const basis = new THREE.Matrix4().makeBasis(xAxis, yAxisOrtho, zAxis);
      targetQuat = new THREE.Quaternion().setFromRotationMatrix(basis);
    } else {
      targetQuat = fallbackQuatFrom2D(kps) ?? new THREE.Quaternion();
    }

    // Keep glasses more level: damp pitch/roll but keep yaw
    if (LOCK_PITCH_ROLL) {
      const e = new THREE.Euler().setFromQuaternion(targetQuat, "YXZ");
      const yaw = clamp(
        e.y * YAW_GAIN,
        -degToRad(YAW_CLAMP_DEG),
        degToRad(YAW_CLAMP_DEG)
      );
      const pitch = clamp(
        e.x * PITCH_GAIN,
        -degToRad(PITCH_CLAMP_DEG),
        degToRad(PITCH_CLAMP_DEG)
      );
      const roll = clamp(
        e.z * ROLL_GAIN,
        -degToRad(ROLL_CLAMP_DEG),
        degToRad(ROLL_CLAMP_DEG)
      );
      targetQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(pitch, yaw, roll, "YXZ")
      );
    }

    // Smooth
    const prev = (obj.userData.prev ??= {
      pos: targetPos.clone(),
      quat: targetQuat.clone(),
      scale: desiredScale,
    });

    obj.position.lerpVectors(prev.pos, targetPos, 1 - SMOOTHING);
    obj.quaternion.slerpQuaternions(prev.quat, targetQuat, 1 - SMOOTHING);
    obj.scale.setScalar(
      prev.scale * SMOOTHING + desiredScale * (1 - SMOOTHING)
    );

    prev.pos.copy(obj.position);
    prev.quat.copy(obj.quaternion);
    prev.scale = obj.scale.x;

    if (ENABLE_OCCLUDER) {
      updateOccluder(
        kps,
        srcW,
        srcH,
        dispW,
        dispH,
        obj.position.z + OCCLUDER_Z_BIAS
      );
    }

    obj.visible = true;
  };

  const estimateOnce = async (videoEl: HTMLVideoElement) => {
    // Support both estimateFaces call conventions
    try {
      return await detector!.estimateFaces(videoEl, {
        flipHorizontal: MIRROR_VIDEO,
        staticImageMode: false,
      });
    } catch {
      return await detector!.estimateFaces({
        input: videoEl,
        flipHorizontal: MIRROR_VIDEO,
        staticImageMode: false,
        returnTensors: false,
      });
    }
  };

  const startEstimateLoop = (videoEl: HTMLVideoElement) => {
    if (!detector) return;
    if (running) return;
    running = true;

    const tick = async () => {
      if (!running) return;
      requestAnimationFrame(tick);

      if (estimating) return;
      if (videoEl.readyState < 2) return;

      estimating = true;
      try {
        const srcW = videoEl.videoWidth || 1280;
        const srcH = videoEl.videoHeight || 720;

        const faces = await estimateOnce(videoEl);

        if (!faces || faces.length === 0) {
          const obj = glassesContainer.value;
          if (obj) obj.visible = SHOW_MODEL_WHEN_NO_FACE;
          if (faceOccluder) faceOccluder.visible = false;
          return;
        }

        const extracted = extractKps(faces[0]);
        const kps = extracted.kps;
        landmarksSource.value = extracted.source;
        if (!kps || kps.length < 200) {
          const obj = glassesContainer.value;
          if (obj) obj.visible = SHOW_MODEL_WHEN_NO_FACE;
          if (faceOccluder) faceOccluder.visible = false;
          return;
        }

        applyPose(kps, srcW, srcH, landmarksSource.value);
      } catch (e) {
        console.error("TFJS estimateFaces error:", e);
      } finally {
        estimating = false;
      }
    };

    tick();
  };

  const startCamera = async () => {
    if (!canvasRef.value) throw new Error("canvasRef is null");

    const videoEl = videoRef.value;
    if (!videoEl)
      throw new Error(
        "videoRef is null — pass your modal <video ref> to the composable"
      );

    if (!renderer) await initThree();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: "user" },
      audio: false,
    });

    videoEl.srcObject = stream;
    await videoEl.play();

    await new Promise<void>((resolve) => {
      if (videoEl.videoWidth > 0) return resolve();
      videoEl.onloadedmetadata = () => resolve();
    });

    tf = await import("@tensorflow/tfjs-core");
    await import("@tensorflow/tfjs-backend-webgl");
    await tf.setBackend("webgl");
    await tf.ready();

    const fdl = await import("@tensorflow-models/face-landmarks-detection");
    detector = await fdl.createDetector(fdl.SupportedModels.MediaPipeFaceMesh, {
      runtime: "tfjs",
      maxFaces: 1,
      refineLandmarks: true,
    });

    sizeToCanvas();
    startEstimateLoop(videoEl);
  };

  const stopCamera = () => {
    running = false;
    estimating = false;

    try {
      detector?.dispose?.();
    } catch {}
    detector = null;

    const videoEl = videoRef.value;
    if (videoEl?.srcObject) {
      const stream = videoEl.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoEl.srcObject = null;
    }

    if (glassesContainer.value) glassesContainer.value.visible = false;
    if (faceOccluder) faceOccluder.visible = false;

    if (renderRaf) cancelAnimationFrame(renderRaf);
    renderRaf = 0;

    resizeObs?.disconnect();
    resizeObs = null;
  };

  onUnmounted(() => stopCamera());

  return {
    canvasRef,
    glassesContainer,
    isModelReady,

    // 3D landmark coordinates (Float32Array) + which source was used
    faceWorldLandmarks,
    landmarksSource,

    startCamera,
    stopCamera,
  };
}
