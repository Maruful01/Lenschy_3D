export default defineNuxtConfig({
  app: {
    head: {
      script: [
        {
          src: "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
          crossorigin: "anonymous",
        },
        {
          src: "https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js",
          crossorigin: "anonymous",
        },
        {
          src: "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
          crossorigin: "anonymous",
        },
        {
          src: "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js",
          crossorigin: "anonymous",
        },
        {
          src: "https://unpkg.com/dayjs/dayjs.min.js",
          crossorigin: "anonymous",
        },
        {
          src: "https://unpkg.com/dayjs/plugin/customParseFormat.js",
          crossorigin: "anonymous",
        },
        {
          src: "https://unpkg.com/dayjs/plugin/weekday.js",
          crossorigin: "anonymous",
        },
        {
          src: "https://unpkg.com/dayjs/plugin/localeData.js",
          crossorigin: "anonymous",
        },
        {
          src: "https://unpkg.com/dayjs/plugin/weekOfYear.js",
          crossorigin: "anonymous",
        },
        {
          src: "https://unpkg.com/dayjs/plugin/weekYear.js",
          crossorigin: "anonymous",
        },
        {
          src: "https://unpkg.com/dayjs/plugin/advancedFormat.js",
          crossorigin: "anonymous",
        },
        {
          src: "https://unpkg.com/dayjs/plugin/quarterOfYear.js",
          crossorigin: "anonymous",
        },

        // <!-- Require the peer dependencies of face-landmarks-detection. -->
        {
          src: "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core",
          crossorigin: "anonymous",
        },
        {
          src: "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter",
          crossorigin: "anonymous",
        },

        // <!-- You must explicitly require a TF.js backend if you're not using the TF.js union bundle. -->

        {
          src: "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl",
          crossorigin: "anonymous",
        },

        {
          src: "https://cdn.jsdelivr.net/npm/@tensorflow-models/face-detection",
          crossorigin: "anonymous",
        },
        {
          src: "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm/dist/tf-backend-wasm.js",
          crossorigin: "anonymous",
        },

        {
          src: "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs/dist/tf.min.js",
          crossorigin: "anonymous",
          defer: true,
        },
        {
          src: "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl/dist/tf-backend-webgl.min.js",
          crossorigin: "anonymous",
          defer: true,
        },
        {
          src: "https://cdn.jsdelivr.net/npm/@tensorflow-models/face-detection",
          crossorigin: "anonymous",
          defer: true,
        },
        {
          src: "https://cdn.jsdelivr.net/npm/@tensorflow-models/face-landmarks-detection",
          crossorigin: "anonymous",
          defer: true,
        },
      ],
    },
  },
});
