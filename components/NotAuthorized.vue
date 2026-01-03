<template>
  <a-result
    status="403"
    title="403"
    sub-title="Sorry, you are not authorized to access this page."
  >
    <template #extra>
      <NuxtLink to="/">
        <a-button type="primary">Back Home</a-button>
      </NuxtLink>
    </template>
  </a-result>
</template>

<script>
import { NuxtLink } from "#components";
</script>
