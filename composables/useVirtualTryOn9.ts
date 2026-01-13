// composables/useVirtualTryOn.client.ts
import { ref, shallowRef, type Ref, onUnmounted, unref } from "vue";
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

const { FaceMesh } = faceMeshModule as any;

// ---------------- CONFIG ----------------

const LANDMARKS = {
  NOSE_BRIDGE: 168,
  FOREHEAD: 10,
  LEFT_EAR: 234,
  RIGHT_EAR: 454,
  LEFT_EYE_OUTER: 263,
  RIGHT_EYE_OUTER: 33,
} as const;

// Virtual plane width is fixed; height is computed from container aspect.
const PLANE_WIDTH = 16;
const PLANE_Z = -5;

// How strongly depth from MediaPipe affects z.
const DEPTH_SCALE = 40;

// Scale factor from ear/eye distances.
const SCALE_FROM_EAR_K = 0.26;
const SCALE_FROM_EYE_K = 0.2;

// Extra forward/backwards offset of whole model.
const MODEL_Z_SHIFT = -0.1;

// Small offset so the frame sits correctly on nose.
const BRIDGE_OFFSET = new THREE.Vector3(0, -1, 0);

// Smoothing factor (0 = no smooth, 0.25–0.6 = smoother)
const SMOOTHING = 0.65;

// If your UX wants “selfie mirror” (recommended for front camera)
const MIRROR_VIDEO = true;

// If your container video should behave like CSS object-fit
const VIDEO_FIT: "cover" | "contain" = "cover";

// GLTF node names to *tag* temple ends
const GLTF_TEMPLE_LEFT_NAME = "Temple_L_End";
const GLTF_TEMPLE_RIGHT_NAME = "Temple_R_End";

type GlassesUserData = {
  prev?: {
    pos: THREE.Vector3;
    quat: THREE.Quaternion;
    scale: number;
  };
  templeL?: THREE.Object3D | null;
  templeR?: THREE.Object3D | null;
};

// ---------------- COMPOSABLE ----------------

export function useVirtualTryOn(
  glassesModelSrc: string | Ref<string>,
  frameWidth: Ref<number>,
  canvasRef: Ref<HTMLCanvasElement | null>
) {
  const cameraRef = ref<cam.Camera | null>(null);

  let videoEl: HTMLVideoElement | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;

  let planeMesh: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshBasicMaterial
  > | null = null;
  let videoTex: THREE.VideoTexture | null = null;

  const glassesContainer = shallowRef<THREE.Group | null>(null);
  const isModelReady = ref(false);

  // dynamic plane height (world units) based on container aspect
  let planeH = (PLANE_WIDTH * 9) / 16;

  const src = unref(glassesModelSrc);

  const getHost = (): HTMLElement | null =>
    (canvasRef.value?.parentElement as HTMLElement | null) ?? null;

  const getHostRect = () => {
    const host = getHost();
    const r = host?.getBoundingClientRect();
    return {
      w: Math.max(1, r?.width ?? host?.clientWidth ?? 1),
      h: Math.max(1, r?.height ?? host?.clientHeight ?? 1),
    };
  };

  const ensureOverlayStyles = () => {
    const host = getHost();
    const c = canvasRef.value;
    if (host) {
      const cs = getComputedStyle(host);
      if (cs.position === "static") host.style.position = "relative";
      host.style.overflow = host.style.overflow || "hidden";
    }
    if (c) {
      c.style.position = "absolute";
      c.style.inset = "0";
      c.style.width = "100%";
      c.style.height = "100%";
      c.style.display = "block";
      c.style.background = "transparent";
      c.style.pointerEvents = "none";
    }
  };

  // ---------- VIDEO FIT MAPPING (NO STRETCH) ----------

  /**
   * Map SOURCE pixels (MediaPipe uses the raw video frame) into DISPLAY pixels
   * (what you actually render in the canvas plane), respecting object-fit.
   */
  const sourcePxToDisplayedPx = (
    x: number,
    y: number,
    srcW: number,
    srcH: number,
    dispW: number,
    dispH: number
  ) => {
    const s =
      VIDEO_FIT === "cover"
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
  };

  const displayedPxToWorldXY = (
    dx: number,
    dy: number,
    dispW: number,
    dispH: number
  ) => {
    const x = (dx / dispW - 0.5) * PLANE_WIDTH;
    const y = (0.5 - dy / dispH) * planeH;
    return new THREE.Vector3(x, y, 0);
  };

  const toPx = (L: Landmark[], i: number, vw: number, vh: number) =>
    new THREE.Vector3(L[i].x * vw, L[i].y * vh, L[i].z);

  const pxToWorld = (
    xPx: number,
    yPx: number,
    srcW: number,
    srcH: number,
    dispW: number,
    dispH: number
  ) => {
    const { dx, dy } = sourcePxToDisplayedPx(
      xPx,
      yPx,
      srcW,
      srcH,
      dispW,
      dispH
    );
    return displayedPxToWorldXY(dx, dy, dispW, dispH);
  };

  const toWorld3D = (
    ptPx: THREE.Vector3,
    srcW: number,
    srcH: number,
    dispW: number,
    dispH: number
  ) => {
    const xy = pxToWorld(ptPx.x, ptPx.y, srcW, srcH, dispW, dispH);
    // MP z is relative; this keeps your existing feel
    const z = ptPx.z * PLANE_WIDTH * -0.6;
    return new THREE.Vector3(xy.x, xy.y, z);
  };

  const applyVideoTextureFit = () => {
    if (!videoTex || !videoEl) return;

    const { w: dispW, h: dispH } = getHostRect();
    const srcW = videoEl.videoWidth || 0;
    const srcH = videoEl.videoHeight || 0;
    if (!srcW || !srcH) return;

    const srcAspect = srcW / srcH;
    const dispAspect = dispW / dispH;

    // Default: show full frame
    let repeatX = 1,
      repeatY = 1,
      offsetX = 0,
      offsetY = 0;

    if (VIDEO_FIT === "cover") {
      // crop whichever axis overflows
      if (dispAspect > srcAspect) {
        // need more width → crop top/bottom
        repeatY = srcAspect / dispAspect;
        offsetY = (1 - repeatY) / 2;
      } else {
        // need more height → crop left/right
        repeatX = dispAspect / srcAspect;
        offsetX = (1 - repeatX) / 2;
      }
    } else {
      // contain: letterbox by shrinking repeat on the other axis
      if (dispAspect > srcAspect) {
        // container wider → pad left/right
        repeatX = srcAspect / dispAspect;
        offsetX = (1 - repeatX) / 2;
      } else {
        // container taller → pad top/bottom
        repeatY = dispAspect / srcAspect;
        offsetY = (1 - repeatY) / 2;
      }
    }
  };

  // ---------- Resize ----------

  const onResize = () => {
    if (!canvasRef.value || !renderer || !camera) return;

    const { w, h } = getHostRect();
    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    // keep world plane matched to container aspect
    planeH = PLANE_WIDTH / (w / h);

    // Optional: subtle FOV change per size (keeps framing consistent)
    const t = Math.min(1, Math.max(0, (w - 360) / (900 - 360)));
    camera.fov = 52 - 7 * t;
    camera.updateProjectionMatrix();

    applyVideoTextureFit();
  };

  // ---------- Three.js init ----------

  const initThree = async () => {
    if (!canvasRef.value) return;
    const canvas = canvasRef.value;

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    const { w, h } = getHostRect();
    renderer.setSize(w, h, false);
    renderer.autoClear = true;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
    camera.position.set(0, 0, 5);
    camera.lookAt(new THREE.Vector3(0, 0, PLANE_Z));

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(0, 2, 5);
    scene.add(dir);

    // GLTF load
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        const model = gltf.scene;
        model.rotation.set(0, 0, 0);
        model.position.add(BRIDGE_OFFSET);

        const container = new THREE.Group() as THREE.Group & {
          userData: GlassesUserData;
        };
        container.userData = {};
        container.add(model);
        container.visible = false;
        container.renderOrder = 10;

        let templeL: THREE.Object3D | null = null;
        let templeR: THREE.Object3D | null = null;

        model.traverse((node: any) => {
          const name = (node.name || "").toLowerCase();
          if (!templeL && name.includes(GLTF_TEMPLE_LEFT_NAME.toLowerCase())) {
            templeL = node;
          }
          if (!templeR && name.includes(GLTF_TEMPLE_RIGHT_NAME.toLowerCase())) {
            templeR = node;
          }

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
        });

        container.userData.templeL = templeL;
        container.userData.templeR = templeR;

        scene!.add(container);
        glassesContainer.value = container;
        isModelReady.value = true;
      },
      undefined,
      (err) => console.error("GLTF load error", err)
    );

    onResize();

    const animate = () => {
      if (renderer && scene && camera) renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    window.addEventListener("resize", onResize);
  };

  // ---------- MediaPipe results → pose glasses ----------

  const onResults = (results: any) => {
    const obj = glassesContainer.value as
      | (THREE.Group & { userData: GlassesUserData })
      | null;
    if (!obj || !videoEl || !camera || !scene || !renderer) return;

    const faces = results?.multiFaceLandmarks as Landmark[][] | undefined;
    if (!faces || faces.length === 0) {
      obj.visible = false;
      return;
    }

    const L = faces[0];

    const srcW = videoEl.videoWidth || 1280;
    const srcH = videoEl.videoHeight || 720;
    const { w: dispW, h: dispH } = getHostRect();

    // landmarks in SOURCE pixels
    const leftEyeOuter = toPx(L, LANDMARKS.LEFT_EYE_OUTER, srcW, srcH);
    const rightEyeOuter = toPx(L, LANDMARKS.RIGHT_EYE_OUTER, srcW, srcH);
    const noseBridge = toPx(L, LANDMARKS.NOSE_BRIDGE, srcW, srcH);
    const forehead = toPx(L, LANDMARKS.FOREHEAD, srcW, srcH);
    const leftEar = toPx(L, LANDMARKS.LEFT_EAR, srcW, srcH);
    const rightEar = toPx(L, LANDMARKS.RIGHT_EAR, srcW, srcH);

    // base position – bridge on nose (mapped into DISPLAY space correctly)
    const bridgeWorld = pxToWorld(
      noseBridge.x,
      noseBridge.y,
      srcW,
      srcH,
      dispW,
      dispH
    );

    // scale – ear-to-ear + eye-to-eye blend
    const earDistPx = Math.hypot(
      rightEar.x - leftEar.x,
      rightEar.y - leftEar.y
    );
    const eyeDistPx = Math.hypot(
      rightEyeOuter.x - leftEyeOuter.x,
      rightEyeOuter.y - leftEyeOuter.y
    );

    const pxToWorldEar = (PLANE_WIDTH / srcW) * SCALE_FROM_EAR_K;
    const pxToWorldEye = (PLANE_WIDTH / srcW) * SCALE_FROM_EYE_K;

    const combinedDist = earDistPx * 0.7 + eyeDistPx * 0.3;

    const baseScale = Math.max(
      0.0001,
      combinedDist *
        (pxToWorldEar * 0.7 + pxToWorldEye * 0.3) *
        frameWidth.value
    );

    // orientation – compute 3D basis in YOUR world space (consistent with mapping)
    const pLEar = toWorld3D(leftEar, srcW, srcH, dispW, dispH);
    const pREar = toWorld3D(rightEar, srcW, srcH, dispW, dispH);
    const pF = toWorld3D(forehead, srcW, srcH, dispW, dispH);
    const pN = toWorld3D(noseBridge, srcW, srcH, dispW, dispH);

    const yawRad = Math.atan2(pREar.z - pLEar.z, pREar.x - pLEar.x);
    const yawAbs = Math.abs(yawRad);
    const maxYaw = Math.PI / 4;
    const yawClamped = Math.min(yawAbs, maxYaw);
    const yaw01 = yawClamped / maxYaw;

    // Keep your existing Z behavior (but mapped with correct fit)
    const positionZ = PLANE_Z + MODEL_Z_SHIFT + noseBridge.z * DEPTH_SCALE;

    const targetPos = new THREE.Vector3(
      bridgeWorld.x,
      bridgeWorld.y,
      positionZ
    );

    const xAxis = new THREE.Vector3().subVectors(pREar, pLEar).normalize();
    const yAxis = new THREE.Vector3().subVectors(pF, pN).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();

    const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(basis);

    // smoothing
    if (!obj.userData.prev) {
      obj.userData.prev = {
        pos: targetPos.clone(),
        quat: targetQuat.clone(),
        scale: baseScale,
      };
      obj.position.copy(targetPos);
      obj.quaternion.copy(targetQuat);
      obj.scale.setScalar(baseScale);
    } else {
      const prev = obj.userData.prev;
      obj.position.lerpVectors(prev.pos, targetPos, 1 - SMOOTHING);
      obj.quaternion.slerpQuaternions(prev.quat, targetQuat, 1 - SMOOTHING);
      const s = prev.scale * SMOOTHING + baseScale * (1 - SMOOTHING);
      obj.scale.setScalar(s);
      prev.pos.copy(obj.position);
      prev.quat.copy(obj.quaternion);
      prev.scale = s;
    }

    // ---------- TEMPLE HIDE ON YAW ----------
    const rightCloser = pREar.z > pLEar.z;
    const yawHideThreshold = 0.12;

    const templeLMarker = obj.userData.templeL || null;
    const templeRMarker = obj.userData.templeR || null;

    const templeLObj = (templeLMarker?.parent ??
      templeLMarker) as THREE.Object3D | null;
    const templeRObj = (templeRMarker?.parent ??
      templeRMarker) as THREE.Object3D | null;

    if (yaw01 > yawHideThreshold) {
      if (rightCloser) {
        if (templeRObj) templeRObj.visible = false;
        if (templeLObj) templeLObj.visible = true;
      } else {
        if (templeLObj) templeLObj.visible = false;
        if (templeRObj) templeRObj.visible = true;
      }
    } else {
      if (templeLObj) templeLObj.visible = true;
      if (templeRObj) templeRObj.visible = true;
    }

    obj.visible = true;
  };

  // ---------- Start / stop camera ----------

  const startCamera = async () => {
    if (!canvasRef.value) return;

    if (!videoEl) {
      videoEl = document.createElement("video");
      videoEl.autoplay = true;
      videoEl.muted = true;
      (videoEl as any).playsInline = true;
      videoEl.style.display = "none";
    }

    ensureOverlayStyles();

    // IMPORTANT: do NOT hard-force 1280x720 on mobile.
    // Use ideals so the browser picks the correct camera FOV/aspect.
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

    // Wait until we know the real video dimensions, then fit texture + resize.
    await new Promise<void>((resolve) => {
      if (videoEl!.videoWidth > 0) return resolve();
      videoEl!.onloadedmetadata = () => resolve();
    });

    if (!renderer) await initThree();
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

    cameraRef.value = new cam.Camera(videoEl, {
      onFrame: async () => {
        await faceMesh.send({ image: videoEl! });
      },
      // Use actual stream dims (critical on mobile)
      width: videoEl.videoWidth || 1280,
      height: videoEl.videoHeight || 720,
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

    if (glassesContainer.value) glassesContainer.value.visible = false;

    if (renderer) renderer.clear();

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
