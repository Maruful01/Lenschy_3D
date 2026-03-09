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

const { FaceMesh } = faceMeshModule as any;

/**
 * CONFIG / CONTACTS – tweak these values to tune behaviour
 * --------------------------------------------------------
 */
const LANDMARKS = {
  NOSE_BRIDGE: 168,
  FOREHEAD: 10,
  LEFT_EAR: 234, // your red-marked left ear
  RIGHT_EAR: 454, // your red-marked right ear
  LEFT_EYE_OUTER: 263,
  RIGHT_EYE_OUTER: 33,
};

const PLANE_WIDTH = 16;
const PLANE_HEIGHT = 9;
const PLANE_Z = -5; // virtual face plane z

// how strongly depth from MediaPipe affects z
const DEPTH_SCALE = 40;

// scale factor from ear-to-ear distance → model size
const SCALE_FROM_EAR_K = 0.26;

// if you prefer eye-to-eye scaling, tweak this & switch in code
const SCALE_FROM_EYE_K = 0.2;

// extra forward/backwards offset of whole model (negative = closer to camera)
const MODEL_Z_SHIFT = -0.1;

// small offset so the frame sits correctly on nose
const BRIDGE_OFFSET = new THREE.Vector3(0, -1, 0);

// smoothing factor (0 = no smooth, 0.25–0.6 = smoother)
const SMOOTHING = 0.65;

// GLTF node names to *tag* temple ends (set these to your Blender object names)
const GLTF_TEMPLE_LEFT_NAME = "Temple_L_End"; // e.g. "Temple_L_End"
const GLTF_TEMPLE_RIGHT_NAME = "Temple_R_End"; // e.g. "Temple_R_End"

type GlassesUserData = {
  prev?: {
    pos: THREE.Vector3;
    quat: THREE.Quaternion;
    scale: number;
  };
  templeL?: THREE.Object3D | null;
  templeR?: THREE.Object3D | null;
};

/**
 * useVirtualTryOn – single canvas, hidden <video>, GLTF glasses
 */
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

  const glassesContainer = shallowRef<THREE.Group | null>(null);
  const isModelReady = ref(false);

  const src = unref(glassesModelSrc);

  // ---------- Helpers ----------

  const toPx = (L: Landmark[], i: number, vw: number, vh: number) =>
    new THREE.Vector3(L[i].x * vw, L[i].y * vh, L[i].z);

  const pxToWorld = (xPx: number, yPx: number, vw: number, vh: number) => {
    const x = (xPx / vw - 0.5) * PLANE_WIDTH;
    const y = (0.5 - yPx / vh) * PLANE_HEIGHT;
    return new THREE.Vector3(x, y, 0);
  };

  const toWorld3D = (ptPx: THREE.Vector3, vw: number, vh: number) => {
    const xy = pxToWorld(ptPx.x, ptPx.y, vw, vh);
    const z = ptPx.z * PLANE_WIDTH * -0.6; // map MP depth into our world
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
    camera.lookAt(new THREE.Vector3(0, 0, PLANE_Z));

    // // lighting
    // const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    // scene.add(hemi);
    // const dir = new THREE.DirectionalLight(0xffffff, 5.2);
    // dir.position.set(0, 2, 5);
    // // scene.add(dir);
    // const amb = new THREE.AmbientLight(0xffffff, 1);
    // scene.add(amb);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 3.5);
    dir.position.set(2, 3, 5);
    scene.add(dir);
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    // video background plane (never occludes glasses)
    if (videoEl) {
      const videoTex = new VideoTexture(videoEl);
      videoTex.minFilter = THREE.LinearFilter;
      videoTex.magFilter = THREE.LinearFilter;
      videoTex.format = THREE.RGBAFormat;

      const planeGeo = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT);
      const planeMat = new THREE.MeshBasicMaterial({ map: videoTex });
      const plane = new THREE.Mesh(planeGeo, planeMat);

      plane.position.set(0, 0, PLANE_Z - 1);
      plane.renderOrder = 0;

      // background only – no depth
      plane.material.depthWrite = false;
      plane.material.depthTest = true;

      scene.add(plane);
    }

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

        // Find & tag temple end objects by name
        let templeL: THREE.Object3D | null = null;
        let templeR: THREE.Object3D | null = null;

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

          const name = (node.name || "").toLowerCase();
          if (!templeL && name.includes(GLTF_TEMPLE_LEFT_NAME.toLowerCase())) {
            templeL = node;
          }
          if (!templeR && name.includes(GLTF_TEMPLE_RIGHT_NAME.toLowerCase())) {
            templeR = node;
          }
        });

        container.userData.templeL = templeL;
        container.userData.templeR = templeR;

        scene!.add(container);
        glassesContainer.value = container;
        isModelReady.value = true;
      },
      undefined,
      (err) => {
        console.error("GLTF load error", err);
      }
    );

    const animate = () => {
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
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
    const vw = videoEl.videoWidth || videoEl.clientWidth || 1280;
    const vh = videoEl.videoHeight || videoEl.clientHeight || 720;

    // landmarks
    const leftEyeOuter = toPx(L, LANDMARKS.LEFT_EYE_OUTER, vw, vh);
    const rightEyeOuter = toPx(L, LANDMARKS.RIGHT_EYE_OUTER, vw, vh);
    const noseBridge = toPx(L, LANDMARKS.NOSE_BRIDGE, vw, vh);
    const forehead = toPx(L, LANDMARKS.FOREHEAD, vw, vh);
    const leftEar = toPx(L, LANDMARKS.LEFT_EAR, vw, vh);
    const rightEar = toPx(L, LANDMARKS.RIGHT_EAR, vw, vh);

    // base position – bridge on nose
    const bridgeWorld = pxToWorld(noseBridge.x, noseBridge.y, vw, vh);
    // const positionZ = PLANE_Z + MODEL_Z_SHIFT + noseBridge.z * DEPTH_SCALE;

    // scale – use ear to ear distance (temples)
    const earDx = rightEar.x - leftEar.x;
    const earDy = rightEar.y - leftEar.y;
    const earDistPx = Math.hypot(earDx, earDy);

    // optional: eye-to-eye if you prefer
    const eyeDx = rightEyeOuter.x - leftEyeOuter.x;
    const eyeDy = rightEyeOuter.y - leftEyeOuter.y;
    const eyeDistPx = Math.hypot(eyeDx, eyeDy);

    const pxToWorldEar = (PLANE_WIDTH / vw) * SCALE_FROM_EAR_K;
    const pxToWorldEye = (PLANE_WIDTH / vw) * SCALE_FROM_EYE_K;

    // mix ear & eye distances (0.7 ear, 0.3 eye) – tweak if needed
    const combinedDist = earDistPx * 0.7 + eyeDistPx * 0.3;

    const baseScale = Math.max(
      0.0001,
      combinedDist *
        (pxToWorldEar * 0.7 + pxToWorldEye * 0.3) *
        frameWidth.value
    );

    // orientation – x from ears, y from forehead-nose, z = x × y
    const pLEar = toWorld3D(leftEar, vw, vh);
    const pREar = toWorld3D(rightEar, vw, vh);
    const pF = toWorld3D(forehead, vw, vh);
    const pN = toWorld3D(noseBridge, vw, vh);

    /**
     * --- YAW-BASED SCALE BOOST (+0–20%) ---
     * We treat "yaw" as how much the ears differ in depth (z) relative to x.
     * - When facing forward → yaw ≈ 0 → factor ≈ 1.0
     * - When turning left/right → |yaw| grows → factor up to ≈ 1.2
     */
    const yawRad = Math.atan2(pREar.z - pLEar.z, pREar.x - pLEar.x); // left/right rotation

    const yawAbs = Math.abs(yawRad);
    const maxYaw = Math.PI / 4; // 45°: beyond this we stop increasing
    const yawClamped = Math.min(yawAbs, maxYaw);
    const yawFactor = 1 + 0.1 * (yawClamped / maxYaw); // 1.0 → 1.2
    const yaw01 = yawClamped / maxYaw; // normalized 0..1

    const zShiftMultiplier = 1 + 8 * yaw01; // 1.0 → 4.0 (300% increase)

    // const dynamicZShift = MODEL_Z_SHIFT * zShiftMultiplier;
    const dynamicZShiftClamped = THREE.MathUtils.lerp(
      MODEL_Z_SHIFT,
      MODEL_Z_SHIFT * 1,
      yaw01
    );

    const positionZ =
      PLANE_Z + dynamicZShiftClamped + noseBridge.z * DEPTH_SCALE;

    const targetPos = new THREE.Vector3(
      bridgeWorld.x,
      bridgeWorld.y,
      positionZ
    );

    const yawFactorGlasses = 1 + 0.5 * (yawClamped / maxYaw); // 1.0 → 1.2

    const desiredScale = baseScale * yawFactor;

    // const yawFactorTemple = 1 + 0.0 * (yawClamped / maxYaw); // 1.0 → 1.5

    const xAxis = new THREE.Vector3().subVectors(pREar, pLEar).normalize();
    const yAxis = new THREE.Vector3().subVectors(pF, pN).normalize();
    const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();

    const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    const headQuat = new THREE.Quaternion().setFromRotationMatrix(basis);

    const targetQuat = headQuat; // no extra roll/yaw/pitch yet

    // smoothing
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

    // --- TEMPLE LENGTH ADJUSTMENT (+0–50%) ---
    const { templeL, templeR } = obj.userData;

    // const applyTempleScale = (temple: THREE.Object3D | null) => {
    //   if (!temple) return;

    //   const t: any = temple;
    //   // Store base scale once
    //   if (!t.userData) t.userData = {};
    //   if (!t.userData.baseScale) {
    //     t.userData.baseScale = temple.scale.clone();
    //   }

    //   const base = t.userData.baseScale as THREE.Vector3;

    //   // Assume X axis is temple length; adjust only that
    //   temple.scale.set(base.x * yawFactorTemple, base.y, base.z);
    // };

    // applyTempleScale(templeL || null);
    // applyTempleScale(templeR || null);

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

    if (!renderer) {
      await initThree();
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: "user" },
    });
    videoEl.srcObject = stream;
    await videoEl.play();

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
