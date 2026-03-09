import { ref, shallowRef, type Ref, onMounted, onUnmounted } from "vue";
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

const { FaceMesh } = faceMeshModule as any as { FaceMesh: any };

/**
 * Composable that renders the try-on scene into an existing HTMLCanvasElement.
 * - videoRef: reference to the hidden <video> element pumping the webcam stream
 * - canvasRef: reference to the visible <canvas> element where WebGL will render
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
  const glassesContainer = shallowRef<THREE.Object3D | null>(null);
  const isModelReady = ref(false);

  // tuning
  const PLANE_WIDTH = 16;
  const PLANE_HEIGHT = 9;
  const SMOOTHING = 0.25;
  const BRIDGE_OFFSET = new THREE.Vector3(0, -1, 0);

  // utility: convert mediapipe normalized landmark to pixel coords in video
  const toPx = (L: Landmark[], i: number, vw: number, vh: number) =>
    new THREE.Vector3(L[i].x * vw, L[i].y * vh, L[i].z);

  // map pixel coords into a world-space plane [-PLANE_WIDTH/2 .. PLANE_WIDTH/2] x [-PLANE_HEIGHT/2 .. PLANE_HEIGHT/2]
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

  // init three on provided canvas
  const initThree = async () => {
    if (!canvasRef.value) return;
    const canvas = canvasRef.value;

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.autoClear = true;

    scene = new THREE.Scene();

    const aspect = canvas.clientWidth / canvas.clientHeight || 1;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.01, 1000);
    camera.position.set(0, 0, 5);

    // lights
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(0, 2, 5);
    scene.add(dir);

    // create video plane that shows webcam texture
    if (videoRef.value) {
      const videoTex = new VideoTexture(videoRef.value);
      // plane geometry scaled to the same aspect as PLANE_WIDTH/PLANE_HEIGHT
      const planeGeo = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT);
      const planeMat = new THREE.MeshBasicMaterial({ map: videoTex });
      const plane = new THREE.Mesh(planeGeo, planeMat);
      plane.position.set(0, 0, -6); // push background plane back
      plane.renderOrder = 0;
      plane.material.depthWrite = true;
      plane.material.depthTest = true;
      scene.add(plane);
    }

    // axis helper for debugging
    // scene.add(new THREE.AxesHelper(1));

    // load GLTF
    const loader = new GLTFLoader();
    loader.load(
      glassesModelSrc,
      (gltf) => {
        const model = gltf.scene;
        // set neutral orientation; tweak if model is backward
        model.rotation.set(0, 0, 0);
        model.position.add(BRIDGE_OFFSET);

        // container: will receive head pose
        const container = new THREE.Group();
        container.add(model);
        container.visible = false;
        container.renderOrder = 10; // render after plane

        // ensure meshes use normal depth testing so occlusion works
        model.traverse((c: any) => {
          if (c instanceof THREE.Mesh) {
            c.frustumCulled = false;
            // keep depth testing enabled for realistic occlusion by geometry
            if (Array.isArray(c.material)) {
              c.material.forEach((m: any) => {
                m.depthTest = true;
                m.depthWrite = true;
              });
            } else if (c.material) {
              c.material.depthTest = true;
              c.material.depthWrite = true;
            }
          }
        });

        // hinge anchors
        const leftHinge = new THREE.Group();
        const rightHinge = new THREE.Group();
        leftHinge.name = "leftHinge";
        rightHinge.name = "rightHinge";
        container.add(leftHinge, rightHinge);
        (container as any).leftHinge = leftHinge;
        (container as any).rightHinge = rightHinge;

        scene!.add(container);
        glassesContainer.value = container;
        isModelReady.value = true;
      },
      undefined,
      (err) => console.error("GLTF load error", err)
    );

    // handle resize
    window.addEventListener("resize", onResize);
  };

  const onResize = () => {
    if (!canvasRef.value || !renderer || !camera) return;
    const canvas = canvasRef.value;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  // media pipe results handler
  const onResults = (results: any) => {
    const obj = glassesContainer.value;
    if (!obj || !videoRef.value || !camera || !scene || !renderer) return;

    const faces = results?.multiFaceLandmarks as Landmark[][] | undefined;
    if (!faces || faces.length === 0) {
      obj.visible = false;
      renderer.render(scene, camera);
      return;
    }
    const L = faces[0];

    const vw = videoRef.value.videoWidth || videoRef.value.clientWidth;
    const vh = videoRef.value.videoHeight || videoRef.value.clientHeight;

    const leftEyeOuter = toPx(L, 263, vw, vh);
    const rightEyeOuter = toPx(L, 33, vw, vh);
    const noseBridge = toPx(L, 168, vw, vh);
    const forehead = toPx(L, 10, vw, vh);
    const leftEarOuter = toPx(L, 234, vw, vh);
    const rightEarOuter = toPx(L, 454, vw, vh);

    const bridgeWorld = pxToWorld(noseBridge.x, noseBridge.y, vw, vh);
    const positionZ = -5 + noseBridge.z * 20; // coarse mapping; tweak constants as needed
    const targetPos = new THREE.Vector3(
      bridgeWorld.x,
      bridgeWorld.y,
      positionZ
    );

    // scale: proportional to eye distance
    const dx = rightEyeOuter.x - leftEyeOuter.x;
    const dy = rightEyeOuter.y - leftEyeOuter.y;
    const eyeDistPx = Math.hypot(dx, dy);
    const pxToWorldScale = (PLANE_WIDTH / vw) * 0.2;
    const desiredScale = Math.max(
      0.0001,
      eyeDistPx * pxToWorldScale * frameWidth.value
    );

    // build orientation basis using ears
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

    // optional offsets
    const rollOff = 0;
    const yawOff = 0;
    const pitchOff = 0;
    const offsetQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(pitchOff, yawOff, rollOff)
    );
    const targetQuat = headQuat.multiply(offsetQuat);

    // smooth & apply
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

      // update hinge anchors to ear world positions (converted to container-local)
      const leftHinge: THREE.Group | undefined = (obj as any).leftHinge;
      const rightHinge: THREE.Group | undefined = (obj as any).rightHinge;
      if (leftHinge && rightHinge) {
        const pL_local = pLEar.clone();
        const pR_local = pREar.clone();
        obj.worldToLocal(pL_local);
        obj.worldToLocal(pR_local);
        leftHinge.position.lerp(pL_local, 1 - SMOOTHING);
        rightHinge.position.lerp(pR_local, 1 - SMOOTHING);
      }
    }

    obj.visible = true;

    // render the scene
    renderer!.render(scene!, camera!);
  };

  // start camera and mediapipe
  const startCamera = async () => {
    if (!videoRef.value || !canvasRef.value) return;

    // init three once
    if (!renderer) await initThree();

    // start webcam
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: "user" },
    });
    const video = videoRef.value!;
    video.srcObject = stream;

    await video.play();

    // mediapipe face mesh
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
