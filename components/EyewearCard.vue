<template>
  <a-card
    class="rounded-md shadow-md border border-t-emerald-100 hover:shadow-lg transition"
  >
    <div class="relative cursor-pointer" @click="goToProductPage">
      <img
        :src="image"
        alt="Eyewear"
        class="w-full h-40 sm:h-400 md:h-488 object-contain"
      />
      <a-button
        type="text"
        class="absolute top-2 right-2 text-gray-500 hover:text-red-500"
        @click="toggleFavorite"
      >
        <!-- <HeartOutlined :class="{ 'text-red-500': isFavorite }" /> -->
      </a-button>
    </div>

    <div class="mt-2 cursor-pointer" @click="goToProductPage">
      <div class="flex items-center gap-1">
        <a-rate :value="rating" disabled class="text-sm" />
      </div>

      <h3 class="font-semibold text-gray-500 h-10">{{ title }}</h3>

      <div class="flex items-center mt-2">
        <span class="font-bold text-lg text-gray-900"
          >৳{{ discountedPrice }}</span
        >
        <span class="text-gray-400 line-through ml-2"
          >৳{{ originalPrice }}</span
        >
        <span class="text-green-500 text-sm ml-2">({{ discount }}% OFF)</span>
      </div>

      <div class="flex items-center mt-3">
        <span
          v-for="(color, index) in colors"
          :key="index"
          class="w-5 h-5 rounded-full border-2 border-gray-300 cursor-pointer mx-1"
          :style="{ backgroundColor: color }"
        ></span>
        <span v-if="moreColors" class="text-xs text-gray-500 ml-1"
          >+{{ moreColors }} more</span
        >
      </div>
    </div>
    <div class="flex justify-center items-center h-full">
      <a-button
        type="dashed"
        class="mr-2 mt-2 text-black font-semibold"
        @click.stop="openModal"
        >🕶 Try On</a-button
      >
      <!-- <a-button type="dashed" class="mr-2 mt-2 bg-yellow-100"  @click.stop="handleAddToCart">🛒 Add to Cart</a-button> -->
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { ref, defineProps, nextTick, onBeforeUnmount } from "vue";
import { useMediaPipe } from "@/composables/mdiaPipeCm";
import { useCartStore } from "~/stores/cart";
import { navigateTo } from "#app";
import { slugify } from "~/constants";

// function slugify(title: string): string {
//   return title
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumerics with hyphen
//     .replace(/(^-|-$)+/g, '');   // trim hyphens from start/end
// }

const cartStore = useCartStore();
// Define props
const props = defineProps({
  image: String,
  title: String,
  size: String,
  rating: Number,
  reviews: Number,
  discountedPrice: Number,
  originalPrice: Number,
  discount: Number,
  colors: Array,
  moreColors: Number,
});

// Favorite logic
const isFavorite = ref(false);
const toggleFavorite = () => {
  isFavorite.value = !isFavorite.value;
};

// Virtual Try-On logic
const isOpen = ref(false);
let frameWidth = ref<number>(1.64);
const { webcamRef, canvasRef, startCamera, stopCamera } = useMediaPipe(
  props.image ? props.image : "",
  frameWidth
);

const openModal = async () => {
  isOpen.value = true;
  await nextTick();
  setTimeout(startCamera, 500);
};

const closeModal = () => {
  isOpen.value = false;
  stopCamera();
};

const takePhoto = () => {
  if (!canvasRef.value) return;
  const dataUrl = canvasRef.value.toDataURL("image/png");
};

onBeforeUnmount(() => {
  stopCamera();
});

// const handleAddToCart = () => {
//   const product = {
//     $id: crypto.randomUUID(),
//     title: props.title || "",
//     material: "Unknown",
//     lensWidth: 0,
//     lensHeight: 0,
//     bridge: 0,
//     templeLength: 0,
//     frameWidth: 0,
//     description: "",
//     img1: props.image || "",
//     img2: "",
//     img3: "",
//     img4: "",
//     product: Math.floor(Math.random() * 100000),
//   };

//   cartStore.addToCart(product);
// };

const goToProductPage = () => {
  if (!props.title) return;
  navigateTo(`/products/${slugify(props.title)}`);
};
</script>
