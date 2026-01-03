<template>
    <a-card class="p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Left: Image Gallery -->
        <div class="relative">
          <img :src="image" alt="Eyewear" class="w-full h-60 object-contain" />
          <div class="absolute left-0 top-1/2 flex flex-col gap-2">
            <img
              v-for="(thumb, index) in thumbnails"
              :key="index"
              :src="thumb"
              class="w-14 h-14 object-cover border rounded cursor-pointer"
              @click="setMainImage(thumb)"
            />
          </div>
        </div>
  
        <!-- Right: Product Details -->
        <div>
          <h2 class="text-2xl font-semibold">{{ title }}</h2>
          <div class="flex items-center gap-2 my-2">
            <a-rate :value="rating" disabled />
            <span class="text-gray-500">({{ reviews }} reviews)</span>
          </div>
  
          <p class="text-2xl font-bold text-gray-900">${{ price }}</p>
          <p class="text-sm text-gray-500">Rush delivery starts at ${{ rushDelivery }}</p>
  
          <a-button type="primary" class="w-full mt-4">Select Lenses</a-button>
          <a-button type="default" class="w-full mt-2">💙 Add to Favorites</a-button>
  
          <!-- Try-On Feature -->
          <div class="flex items-center mt-4">
            <a-button type="dashed" class="mr-2 bg-yellow-100">🕶 Try On</a-button>
            <span v-if="availableColors.length > 0" class="text-gray-600">Available Colors:</span>
            <div class="flex gap-2 ml-2">
              <span
                v-for="(color, index) in availableColors"
                :key="index"
                class="w-5 h-5 rounded-full border-2 cursor-pointer"
                :style="{ backgroundColor: color }"
              ></span>
            </div>
          </div>
        </div>
      </div>
    </a-card>
  </template>
  
  <script setup>
  import { defineProps } from 'vue';
  
  const props = defineProps({
    image: String,
    thumbnails: Array,
    title: String,
    rating: Number,
    reviews: Number,
    price: Number,
    rushDelivery: Number,
    availableColors: Array,
  });
  
  const setMainImage = (thumb) => {
    props.image = thumb;
  };
  </script>
  
  <style scoped>
  /* Custom styles if needed */
  </style>
  