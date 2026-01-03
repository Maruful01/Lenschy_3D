<template>
  <nav class="flex mb-5 ml-3 mt-3" aria-label="Breadcrumb">
    <ol class="inline-flex items-center space-x-0 md:space-x-2 font-mono">
      <!-- Home Icon -->
      <li class="inline-flex items-center">
        <NuxtLink
          to="/"
          class="text-gray-700 hover:text-gray-900 inline-flex items-center"
        >
          <svg class="w-5 h-5 mr-2.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
            ></path>
          </svg>
          Home
        </NuxtLink>
      </li>

      <!-- Dynamic Items -->

      <div class="flex items-center">
        <svg
          class="w-6 h-6 text-gray-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clip-rule="evenodd"
          />
        </svg>

        <span class="text-gray-400 inline-flex items-center">products</span>
      </div>
    </ol>
  </nav>
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-6">
    <div
      class="relative group"
      v-for="product in products || []"
      :key="product.$id"
    >
      <Card
        :image1="getPinataImageUrl(product.img1)"
        :image2="getPinataImageUrl(product.img4)"
        :title="product.title"
        size="Size: Wide • Urban Edit"
        :rating="product.rate"
        :reviews="114"
        :discountedPrice="0.0"
        :originalPrice="product.price"
        :discount="0.0"
        :colors="['#ccc', '#000']"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAsyncData } from "#app";
import { fetchProducts } from "@/composables/useFitchedProducts"; // Import your API call
import { getPinataImageUrl } from "~/constants";

const config = useRuntimeConfig().public;
const productStore = useProductStore();
const { data: products } = await useAsyncData("products", () =>
  fetchProducts(config)
);
if (products.value) {
  productStore.setProducts(products.value);
}

// Pre-render the page to enable static generation
// definePageMeta({
//   prerender: false, // Ensures pages are pre-built
// });
</script>
