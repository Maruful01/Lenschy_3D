<template>
  <div>
    <h1>Virtual Try-On</h1>

    <ClientOnly>
      <!-- <VirtualTryOn /> -->

      <VrTyON3d />

      <template #fallback>
        <div class="loading-placeholder">
          <p>Loading Try-On Experience...</p>
        </div>
      </template>
    </ClientOnly>

    <div class="some-other-content">
      <p>This text will be rendered on the server.</p>
    </div>
  </div>
</template>

<script setup>
// Just import your main component
import VirtualTryOn from "~/components/VirtualTryOn.vue";
</script>

<style scoped>
.loading-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80vh; /* Match the height of your try-on container */
  background-color: #f0f0f0;
  border-radius: 8px;
}
</style>
