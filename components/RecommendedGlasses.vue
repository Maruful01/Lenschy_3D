<template>
  <span class="flex items-center">
    <span
      class="h-px flex-1 bg-gradient-to-r from-transparent to-gray-300 dark:to-gray-600"
    ></span>

    <span class="shrink-0 px-4 text-gray-900 dark:text-white"
      >Recommended Glasses</span
    >

    <span
      class="h-px flex-1 bg-gradient-to-l from-transparent to-gray-300 dark:to-gray-600"
    ></span>
  </span>
  <div class="px-4 mx-auto sm:px-6 lg:px-8 max-w-7xl">
    <div class="grid grid-cols-2 gap-6 mt-10 lg:mt-16 lg:gap-4 lg:grid-cols-4">
      <div
        v-for="product in filteredProducts"
        :key="product.$id"
        class="relative group"
      >
        <Suspense>
          <Card
            :image1="getPinataImageUrl(product.img1)"
            :image2="getPinataImageUrl(product.img4)"
            :title="product.title"
            size="Size: Wide • Urban Edit"
            :rating="4.8"
            :reviews="114"
            :discountedPrice="1500"
            :originalPrice="2000"
            :discount="25"
            :colors="['#ccc', '#000']"
          />
          <template #fallback>
            <SkeletonCard />
          </template>
        </Suspense>
      </div>
    </div>
    <NuxtLink to="/products" class="w-full flex flex-col m-4 items-center">
      <NextButton :name="'See all'" />
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import { useAsyncData } from "#app";
import { fetchProducts } from "@/composables/useFitchedProducts";
import { getPinataImageUrl, slugify } from "~/constants";

// RecommendedGlasses.vue (script setup)
const props = defineProps<{
  faceData: globalThis.FaceData;
}>();

const config = useRuntimeConfig().public;
const productStore = useProductStore();

const { data: products } = await useAsyncData("products", async () => {
  const allProducts = await fetchProducts(config);
  return allProducts; // Get only the first 4
});

if (products.value) {
  productStore.setProducts(products.value);
}

const faceShape = props.faceData?.shape; // detected or chosen
const gender = props.faceData?.gender === 1 ? "male" : "female"; // user selection

const filteredProducts = glassesFinder(faceShape, gender, products.value);

definePageMeta({
  prerender: false,
});

const goToProductPage = (title: string) => {
  if (!title) return;
  navigateTo(`/products/${slugify(title)}`);
};
</script>
