// plugins/tres.client.ts
import Tres from "@tresjs/core";

export default defineNuxtPlugin((nuxtApp) => {
  // This installs all TresJS components (TresCanvas, TresMesh, etc.)
  nuxtApp.vueApp.use(Tres);
});
