<template>
  <p
    class="mt-3 rounded border px-3 py-1 shadow inline-flex items-center justify-center text-teal-500 cursor-pointer text-accent font-mono"
    @click="$emit('click')"
  >
    <span class="mr-1">{{ name }}</span>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fill-rule="evenodd"
        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
        clip-rule="evenodd"
      ></path>
    </svg>
  </p>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
}>();
defineEmits(["click"]);
</script>
