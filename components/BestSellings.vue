<template>
  <section class="py-12 bg-white sm:py-16 lg:py-20">
    <div class="px-4 mx-auto sm:px-6 lg:px-8 max-w-7xl">
      <div class="max-w-md mx-auto text-center">
        <h2 class="text-2xl font-bold text-gray-900 sm:text-3xl">
          Most popular picks
        </h2>
        <p class="mt-4 text-base font-normal leading-7 text-gray-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Purus
          faucibus massa dignissim tempus.
        </p>
      </div>

      <div
        class="grid grid-cols-2 gap-6 mt-10 lg:mt-16 lg:gap-4 lg:grid-cols-4"
      >
        <div
          v-for="product in filteredProducts"
          :key="product.$id"
          class="relative group"
        >
          <Card
            :image="getPinataImageUrl(product.img1)"
            :title="product.title"
            size="Size: Wide • Urban Edit"
            :rating="4.8"
            :reviews="114"
            :discountedPrice="1500"
            :originalPrice="2000"
            :discount="25"
            :colors="['#ccc', '#000']"
          />
        </div>
      </div>
      <NuxtLink to="/products" class="flex w-full flex-col items-center">
        <NextButton :name="'See all'" />
      </NuxtLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useAsyncData } from "#app";
import { fetchProducts } from "@/composables/useFitchedProducts";
import { getPinataImageUrl, slugify } from "~/constants";

const config = useRuntimeConfig().public;
const productStore = useProductStore();

const { data: products } = await useAsyncData("products", async () => {
  const allProducts = await fetchProducts(config);
  return allProducts; // Get only the first 4
});

if (products.value) {
  productStore.setProducts(products.value);
}

const faceShape = "square"; // detected or chosen
const gender = "male"; // user selection

const filteredProducts = glassesFinder(faceShape, gender, products.value);

definePageMeta({
  prerender: false,
});

const goToProductPage = (title: string) => {
  if (!title) return;
  navigateTo(`/products/${slugify(title)}`);
};
</script>
