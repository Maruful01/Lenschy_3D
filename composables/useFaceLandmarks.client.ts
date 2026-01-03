// composables/useFaceLandmarks.client.ts
import { ref, shallowRef, type Ref, unref, onScopeDispose } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import faceMeshModule from "@mediapipe/face_mesh";

/**
 * 3D Virtual Try‑On (MediaPipe FaceMesh)
 * - Renders ONLY the 3D glasses into the provided canvas.
 * - The <video> is rendered by Vue behind the canvas.
 *
 * Design goals
 * - Bridge stays glued to landmark 168 during yaw.
 * - Stable, Snapchat-like rotation (yaw follows; pitch/roll clamped).
 * - Device-independent scale using DISPLAYED pixel distances (object-fit aware).
 *
 * IMPORTANT about mirroring
 * - Card.vue mirrors the VIDEO via CSS: transform: scaleX(-1)
 * - Therefore we must output landmarks in the SAME mirrored coordinate space.
 *   We enable FaceMesh selfieMode:true and DO NOT mirror again in mapping.
 */

type Landmark = { x: number; y: number; z: number };
const { FaceMesh } = faceMeshModule as any;

// ---------------- LANDMARK INDICES ----------------
const LM = {
  NOSE: 168,
  FOREHEAD: 10,
  LEFT_EAR: 234,
  RIGHT_EAR: 454,
  LEFT_EYE_OUTER: 263,
  RIGHT_EYE_OUTER: 33,
  LEFT_EYE_INNER: 362,
  RIGHT_EYE_INNER: 133,
} as const;

// ---------------- WORLD / CAMERA ----------------
const PLANE_W = 16;
const PLANE_Z = -5;

// Conservative depth mapping for z (MediaPipe z is not metric)
const Z_POS_GAIN = 0.65; // how much nose.z moves model forward/back
const Z_POS_CLAMP = 0.35;
const MODEL_Z_SHIFT = -0.28; // overall forward/back placement

// Smoothing (Snapchat-like)
const POS_SMOOTH = 0.22;
const ROT_SMOOTH = 0.18;
const SCALE_SMOOTH = 0.26;

// Rotation gains / clamps
const YAW_GAIN = 1.1;
const PITCH_GAIN = 0.25;
const ROLL_GAIN = 0.55;
const YAW_CLAMP_DEG = 40;
const PITCH_CLAMP_DEG = 10;
const ROLL_CLAMP_DEG = 12;

// Video mapping MUST match Card.vue
const VIDEO_OBJECT_FIT: "cover" | "contain" = "cover";
const MIRROR_VIDEO = false; // Card.vue mirrors already; selfieMode handles landmarks.

// Camera FOV stability (rendering camera, not device camera)
const FOV_SMALL = 52;
const FOV_LARGE = 45;

// ---------------- MODEL ANCHOR & SCALE ----------------
// Preferred: compute a bridge anchor from geometry (more robust than bbox center).
const ANCHOR_X_BAND = 0.14; // candidates near center X (% of width)
const ANCHOR_Y_MIN = 0.32; // y band (% of height)
const ANCHOR_Y_MAX = 0.82;
const FRONT_Z_MIN = 0.55; // only consider front half in z

// Front width sampling band (same Y band)
const WIDTH_Y_MIN = 0.28;
const WIDTH_Y_MAX = 0.78;
const WIDTH_Z_MIN = 0.45;

// Slider normalization (Card.vue uses ~0.1..0.5)
const FRAMEWIDTH_MIN = 0.1;
const FRAMEWIDTH_MAX = 0.5;
const FRAMEWIDTH_BASE = 0.3; // ~neutral

// Face->frame world fit factors
const EAR_WIDTH_FIT = 0.9;
const EYE_WIDTH_FIT = 1.8;
const WIDTH_MIX = { ear: 0.65, eye: 0.35 };

// Optional model yaw correction (if GLB faces backwards)
const MODEL_YAW_OFFSET = 0;

// ---------------- UTILS ----------------
const degToRad = (d: number) => (d * Math.PI) / 180;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const clamp01 = (v: number) => clamp(v, 0, 1);

function ensureOverlayStyles(host: HTMLElement, canvas: HTMLCanvasElement) {
  const cs = getComputedStyle(host);
  if (cs.position === "static") host.style.position = "relative";
  host.style.overflow = host.style.overflow || "hidden";

  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.background = "transparent";
  canvas.style.pointerEvents = "none";
}

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

  const offX = (scaledW - dispW) / 2;
  const offY = (scaledH - dispH) / 2;

  let dx = x * s - offX;
  const dy = y * s - offY;

  if (MIRROR_VIDEO) dx = dispW - dx;

  return { dx, dy, s };
}

function displayedPxToWorldXY(
  dx: number,
  dy: number,
  dispW: number,
  dispH: number,
  planeH: number
) {
  const x = (dx / dispW - 0.5) * PLANE_W;
  const y = (0.5 - dy / dispH) * planeH;
  return new THREE.Vector3(x, y, 0);
}

function mpToSrcPx(L: Landmark[], i: number, srcW: number, srcH: number) {
  // NOTE: FaceMesh landmarks are normalized for x/y, and z is relative scale.
  // We keep z as-is but later scale it using srcW to get a stable yaw signal.
  return new THREE.Vector3(L[i].x * srcW, L[i].y * srcH, L[i].z);
}

function disposeModel(root: THREE.Object3D) {
  root.traverse((n: any) => {
    if (n?.geometry) n.geometry.dispose?.();
    if (n?.material) {
      const mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach((m: any) => {
        m?.map?.dispose?.();
        m?.normalMap?.dispose?.();
        m?.roughnessMap?.dispose?.();
        m?.metalnessMap?.dispose?.();
        m?.dispose?.();
      });
    }
  });
}

function getGeomPositionAttr(geom: THREE.BufferGeometry) {
  const pos = geom.getAttribute("position");
  if (!pos || !("count" in pos)) return null;
  return pos as THREE.BufferAttribute;
}

function computeBridgeAnchorAndFrontWidth(model: THREE.Object3D) {
  // Returns anchor (model local) and a "front width" to scale against.
  model.updateWorldMatrix(true, true);

  const bbox = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  const invModelWorld = model.matrixWorld.clone().invert();

  const xBand = size.x * ANCHOR_X_BAND;
  const yMin = bbox.min.y + size.y * ANCHOR_Y_MIN;
  const yMax = bbox.min.y + size.y * ANCHOR_Y_MAX;
  const zMin = bbox.min.z + size.z * FRONT_Z_MIN;

  const wYMin = bbox.min.y + size.y * WIDTH_Y_MIN;
  const wYMax = bbox.min.y + size.y * WIDTH_Y_MAX;
  const wZMin = bbox.min.z + size.z * WIDTH_Z_MIN;

  const vWorld = new THREE.Vector3();
  const vLocal = new THREE.Vector3();

  let bestAnchor: THREE.Vector3 | null = null;
  let bestAnchorZ = -Infinity;

  let minX = Infinity;
  let maxX = -Infinity;

  model.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!(mesh as any).isMesh) return;

    const geom = mesh.geometry as THREE.BufferGeometry;
    const pos = getGeomPositionAttr(geom);
    if (!pos) return;

    mesh.updateWorldMatrix(true, false);

    // Subsample to keep load fast for large meshes.
    const step = Math.max(1, Math.floor(pos.count / 4000));

    for (let i = 0; i < pos.count; i += step) {
      vWorld.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      vLocal.copy(vWorld).applyMatrix4(invModelWorld);

      // Bridge anchor candidate
      if (
        Math.abs(vLocal.x) <= xBand &&
        vLocal.y >= yMin &&
        vLocal.y <= yMax &&
        vLocal.z >= zMin
      ) {
        if (vLocal.z > bestAnchorZ) {
          bestAnchorZ = vLocal.z;
          bestAnchor = vLocal.clone();
        }
      }

      // Front width sampling band
      if (vLocal.y >= wYMin && vLocal.y <= wYMax && vLocal.z >= wZMin) {
        minX = Math.min(minX, vLocal.x);
        maxX = Math.max(maxX, vLocal.x);
      }
    }
  });

  const fallbackCenter = new THREE.Vector3(
    (bbox.min.x + bbox.max.x) * 0.5,
    bbox.min.y + size.y * 0.55,
    bbox.max.z
  );

  const anchor = bestAnchor ?? fallbackCenter;
  const frontWidth =
    Number.isFinite(minX) && Number.isFinite(maxX) && maxX > minX
      ? Math.max(0.001, maxX - minX)
      : Math.max(0.001, size.x);

  return { anchor, frontWidth, bboxSize: size };
}

export function useVirtualTryOnTFJS(
  glassesModelSrc: string | Ref<string>,
  frameWidth: Ref<number>,
  canvasRef: Ref<HTMLCanvasElement | null>,
  videoRef: Ref<HTMLVideoElement | null>
) {
  // ---------------- MEDIAPIPE ----------------
  let faceMesh: any | null = null;
  let mpReady = false;
  let sending = false;
  let resultsBound = false;

  const initMediaPipe = async () => {
    if (import.meta.server) return;
    if (faceMesh) return;

    faceMesh = new FaceMesh({
      locateFile: (f: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
      selfieMode: true,
    });

    mpReady = true;
    console.log("[VTO][MP] FaceMesh ready", !!faceMesh);
  };

  // ---------------- THREE ----------------
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let planeH = 9;

  let running = false;
  let raf = 0;
  let resizeObs: ResizeObserver | null = null;

  const glassesContainer = shallowRef<THREE.Group | null>(null);
  const isModelReady = ref(false);

  // Model metrics
  let modelFrontWidth = 1;
  const modelAnchor = new THREE.Vector3();

  const getHost = () =>
    (canvasRef.value?.parentElement as HTMLElement | null) ?? null;

  const sizeToHost = () => {
    const host = getHost();
    if (!host || !canvasRef.value || !renderer || !camera) return;

    const r = host.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(1, Math.floor(r.height));

    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    planeH = PLANE_W / (w / h);

    const t = clamp01((w - 360) / (900 - 360));
    camera.fov = FOV_SMALL - (FOV_SMALL - FOV_LARGE) * t;
    camera.updateProjectionMatrix();
  };

  const resolveSrc = () => {
    const v = unref(glassesModelSrc);
    return typeof v === "string" ? v : "";
  };

  const loadGlasses = async () => {
    const src = resolveSrc();
    if (!src) throw new Error("Missing glassesModelSrc URL");
    if (!scene) throw new Error("Scene not ready");

    isModelReady.value = false;

    if (glassesContainer.value) {
      disposeModel(glassesContainer.value);
      scene.remove(glassesContainer.value);
      glassesContainer.value = null;
    }

    await new Promise<void>((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        src,
        (gltf) => {
          const model = gltf.scene;

          // Compute anchor + width from geometry for yaw-stable bridge lock.
          const { anchor, frontWidth } =
            computeBridgeAnchorAndFrontWidth(model);
          modelAnchor.copy(anchor);
          modelFrontWidth = frontWidth;

          // Recenter pivot to the computed bridge anchor.
          model.position.sub(modelAnchor);

          if (MODEL_YAW_OFFSET !== 0) model.rotation.y += MODEL_YAW_OFFSET;

          const container = new THREE.Group();
          container.add(model);
          container.visible = true;
          container.renderOrder = 10;
          container.position.set(0, 0, PLANE_Z);

          model.traverse((n: any) => {
            if (!(n instanceof THREE.Mesh)) return;
            n.frustumCulled = false;
            const mats = Array.isArray(n.material) ? n.material : [n.material];
            mats.forEach((m: any) => {
              if (!m) return;
              m.transparent = true;
              m.depthTest = true;
              m.depthWrite = true;
              if (typeof m.alphaTest === "number")
                m.alphaTest = Math.max(m.alphaTest, 0.01);
            });
            n.renderOrder = 10;
          });

          scene!.add(container);
          glassesContainer.value = container;
          isModelReady.value = true;

          console.log("[VTO][GLB] loaded", {
            src,
            modelFrontWidth,
            anchor: modelAnchor.toArray(),
          });

          sizeToHost();
          resolve();
        },
        undefined,
        (err) => reject(err)
      );
    });
  };

  const initThree = async () => {
    const canvas = canvasRef.value;
    const host = getHost();
    if (!canvas || !host) throw new Error("canvas/host missing");

    ensureOverlayStyles(host, canvas);

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();

    const r = host.getBoundingClientRect();
    const aspect = Math.max(1, r.width) / Math.max(1, r.height);
    camera = new THREE.PerspectiveCamera(45, aspect, 0.01, 1000);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, PLANE_Z);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(0, 2, 5);
    scene.add(dir);

    resizeObs = new ResizeObserver(() => sizeToHost());
    resizeObs.observe(host);
    sizeToHost();

    const renderLoop = () => {
      raf = requestAnimationFrame(renderLoop);
      if (renderer && scene && camera) renderer.render(scene, camera);
    };
    renderLoop();
  };

  // ---------------- POSE ----------------
  const applyPose = (
    L: Landmark[],
    srcW: number,
    srcH: number,
    dispW: number,
    dispH: number
  ) => {
    const obj = glassesContainer.value;
    if (!obj) return;

    // SOURCE pixels
    const nose = mpToSrcPx(L, LM.NOSE, srcW, srcH);
    const forehead = mpToSrcPx(L, LM.FOREHEAD, srcW, srcH);
    const lEar = mpToSrcPx(L, LM.LEFT_EAR, srcW, srcH);
    const rEar = mpToSrcPx(L, LM.RIGHT_EAR, srcW, srcH);
    const lEyeO = mpToSrcPx(L, LM.LEFT_EYE_OUTER, srcW, srcH);
    const rEyeO = mpToSrcPx(L, LM.RIGHT_EYE_OUTER, srcW, srcH);
    const lEyeI = mpToSrcPx(L, LM.LEFT_EYE_INNER, srcW, srcH);
    const rEyeI = mpToSrcPx(L, LM.RIGHT_EYE_INNER, srcW, srcH);

    // DISPLAY coords (object-fit aware)
    const nD = sourcePxToDisplayedPx(nose.x, nose.y, srcW, srcH, dispW, dispH);
    const fD = sourcePxToDisplayedPx(
      forehead.x,
      forehead.y,
      srcW,
      srcH,
      dispW,
      dispH
    );
    const lED = sourcePxToDisplayedPx(lEar.x, lEar.y, srcW, srcH, dispW, dispH);
    const rED = sourcePxToDisplayedPx(rEar.x, rEar.y, srcW, srcH, dispW, dispH);
    const lEO = sourcePxToDisplayedPx(
      lEyeO.x,
      lEyeO.y,
      srcW,
      srcH,
      dispW,
      dispH
    );
    const rEO = sourcePxToDisplayedPx(
      rEyeO.x,
      rEyeO.y,
      srcW,
      srcH,
      dispW,
      dispH
    );
    const lEI = sourcePxToDisplayedPx(
      lEyeI.x,
      lEyeI.y,
      srcW,
      srcH,
      dispW,
      dispH
    );
    const rEI = sourcePxToDisplayedPx(
      rEyeI.x,
      rEyeI.y,
      srcW,
      srcH,
      dispW,
      dispH
    );

    // -------- Position (bridge locked to nose ridge 168) --------
    const pXY = displayedPxToWorldXY(nD.dx, nD.dy, dispW, dispH, planeH);

    // Use a small, clamped z motion (stops floating/drift)
    const zDelta = clamp(
      nose.z * srcW * Z_POS_GAIN * (PLANE_W / srcW),
      -Z_POS_CLAMP,
      Z_POS_CLAMP
    );
    const targetPos = new THREE.Vector3(
      pXY.x,
      pXY.y,
      PLANE_Z + MODEL_Z_SHIFT + zDelta
    );

    // -------- Scale (device independent) --------
    const earDistDispPx = Math.hypot(rED.dx - lED.dx, rED.dy - lED.dy);
    const eyeDistDispPx = Math.hypot(rEO.dx - lEO.dx, rEO.dy - lEO.dy);

    const pxToWorld = PLANE_W / dispW;
    const earWorld = clamp(
      earDistDispPx * pxToWorld * EAR_WIDTH_FIT,
      1.0,
      30.0
    );
    const eyeWorld = clamp(
      eyeDistDispPx * pxToWorld * EYE_WIDTH_FIT,
      1.0,
      30.0
    );
    const desiredWorldFrontWidth =
      earWorld * WIDTH_MIX.ear + eyeWorld * WIDTH_MIX.eye;

    const fw = Number.isFinite(frameWidth.value)
      ? frameWidth.value
      : FRAMEWIDTH_BASE;
    const fw01 = clamp01(
      (fw - FRAMEWIDTH_MIN) / (FRAMEWIDTH_MAX - FRAMEWIDTH_MIN)
    );
    const fwMul = clamp(fw / FRAMEWIDTH_BASE, 0.5, 2.2) * (0.85 + fw01 * 0.35);

    const desiredScale = clamp(
      (desiredWorldFrontWidth / modelFrontWidth) * fwMul,
      0.12,
      40.0
    );

    // -------- Rotation (stable yaw/pitch/roll from landmarks) --------
    // roll from eye line (display space)
    const rollRaw = Math.atan2(rEO.dy - lEO.dy, rEO.dx - lEO.dx);

    // yaw from ear depth difference (z uses srcW scaling like mediapipe docs)
    const earDistSrcPx = Math.hypot(rEar.x - lEar.x, rEar.y - lEar.y);
    const yawRaw = Math.atan2(
      (lEar.z - rEar.z) * srcW,
      Math.max(1e-3, earDistSrcPx)
    );

    // pitch from forehead vs nose depth
    const dnY = Math.max(1e-3, forehead.y - nose.y);
    const pitchRaw = Math.atan2((forehead.z - nose.z) * srcW, dnY);

    const yaw = clamp(
      yawRaw * YAW_GAIN,
      -degToRad(YAW_CLAMP_DEG),
      degToRad(YAW_CLAMP_DEG)
    );
    const pitch = clamp(
      pitchRaw * PITCH_GAIN,
      -degToRad(PITCH_CLAMP_DEG),
      degToRad(PITCH_CLAMP_DEG)
    );
    const roll = clamp(
      rollRaw * ROLL_GAIN,
      -degToRad(ROLL_CLAMP_DEG),
      degToRad(ROLL_CLAMP_DEG)
    );

    const targetQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(pitch, yaw, roll, "YXZ")
    );

    // -------- Smooth (pos/rot/scale) --------
    const ud: any = (obj.userData ??= {});
    const prev = (ud.prev ??= {
      pos: targetPos.clone(),
      quat: targetQuat.clone(),
      scale: desiredScale,
    });

    obj.position.lerpVectors(prev.pos, targetPos, 1 - POS_SMOOTH);
    obj.quaternion.slerpQuaternions(prev.quat, targetQuat, 1 - ROT_SMOOTH);

    const smScale =
      prev.scale * SCALE_SMOOTH + desiredScale * (1 - SCALE_SMOOTH);
    obj.scale.setScalar(smScale);

    prev.pos.copy(obj.position);
    prev.quat.copy(obj.quaternion);
    prev.scale = smScale;

    obj.visible = true;
  };

  // ---------------- LOOP ----------------
  const startLoop = (videoEl: HTMLVideoElement) => {
    if (!faceMesh || !mpReady) return;
    if (running) return;
    running = true;

    const tick = async () => {
      if (!running) return;
      raf = requestAnimationFrame(tick);

      if (sending) return;
      if (videoEl.readyState < 2) return;
      if (!isModelReady.value) return;

      const host = getHost();
      if (!host) return;

      sizeToHost();

      sending = true;
      try {
        await faceMesh.send({ image: videoEl });
      } catch (e) {
        console.error("[VTO][MP] send error:", e);
      } finally {
        sending = false;
      }
    };

    tick();
  };

  // ---------------- START / STOP ----------------
  const startCamera = async () => {
    const canvas = canvasRef.value;
    const host = getHost();
    const videoEl = videoRef.value;
    if (!canvas || !host || !videoEl)
      throw new Error("Missing canvas/host/video");

    ensureOverlayStyles(host, canvas);

    if (!renderer) await initThree();
    if (!faceMesh) await initMediaPipe();
    if (!isModelReady.value) await loadGlasses();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    });

    videoEl.srcObject = stream;
    await videoEl.play();

    await new Promise<void>((resolve) => {
      if (videoEl.videoWidth > 0) return resolve();
      videoEl.onloadedmetadata = () => resolve();
    });

    if (faceMesh && !resultsBound) {
      resultsBound = true;
      faceMesh.onResults((results: any) => {
        const obj = glassesContainer.value;
        if (!obj) return;

        try {
          const faces = results?.multiFaceLandmarks as Landmark[][] | undefined;
          if (!faces?.length) {
            obj.visible = false;
            return;
          }

          const L = faces[0];
          const srcW = videoEl.videoWidth || 1280;
          const srcH = videoEl.videoHeight || 720;

          const rr = host.getBoundingClientRect();
          const dispW = Math.max(1, rr.width);
          const dispH = Math.max(1, rr.height);

          applyPose(L, srcW, srcH, dispW, dispH);
        } catch (e) {
          console.error("[VTO][MP] onResults error:", e);
          obj.visible = false;
        }
      });
    }

    console.log("[VTO][CAM] playing", {
      readyState: videoEl.readyState,
      w: videoEl.videoWidth,
      h: videoEl.videoHeight,
      mpReady,
    });

    sizeToHost();
    startLoop(videoEl);
  };

  const stopCamera = () => {
    running = false;
    sending = false;

    if (raf) cancelAnimationFrame(raf);
    raf = 0;

    try {
      faceMesh?.close?.();
    } catch {}
    faceMesh = null;
    mpReady = false;
    resultsBound = false;

    const v = videoRef.value;
    if (v?.srcObject) {
      const s = v.srcObject as MediaStream;
      s.getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }

    if (glassesContainer.value) glassesContainer.value.visible = false;

    resizeObs?.disconnect();
    resizeObs = null;
  };

  onScopeDispose(() => stopCamera());

  return {
    canvasRef,
    glassesContainer,
    isModelReady,
    startCamera,
    stopCamera,
    // diagnostics
    loadGlasses,
    initMediaPipe,
  };
}
