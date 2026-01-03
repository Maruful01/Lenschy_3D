<template>
  <a-result
    status="404"
    title="404"
    sub-title="Sorry, the page you visited does not exist."
  >
    <template #extra>
      <NuxtLink to="/"> </NuxtLink>
    </template>
  </a-result>
  <h1 class="text-black">Welcome To dynamic world!</h1>
</template>

<script></script>
