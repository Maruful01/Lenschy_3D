<!-- components/DropdownMenu.vue -->
<template>
    <a-dropdown>
      <a class="ant-dropdown-link text-[#636270] cursor-pointer" @click.prevent>
        {{ label }}
        <DownOutlined />
      </a>
      <template #overlay>
        <a-menu>
          <a-menu-item v-for="(item, index) in items" :key="index">
            <a :href="item.link">{{ item.name }}</a>
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </template>
  
  <script setup lang="ts">
  import { DownOutlined } from '@ant-design/icons-vue'
  
  defineProps<{
    label: string,
    items: { name: string, link: string }[]
  }>()
  </script>
  