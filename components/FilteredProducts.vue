<template>
  <div
    v-if="filteredProducts.length > 0"
    class="grid grid-cols-2 gap-6 mt-10 lg:mt-16 lg:gap-4 lg:grid-cols-4"
  >
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

  <div v-else>
    <a-result
      status="404"
      title="404"
      sub-title="Sorry, the page you visited does not exist."
    >
      <template #extra>
        <NuxtLink to="/">
          <a-button type="primary">Back Home</a-button>
        </NuxtLink>
      </template>
    </a-result>
  </div>
</template>

<script setup lang="ts">
import { useAsyncData } from "#app";
import { fetchProducts } from "@/composables/useFitchedProducts";
import { getPinataImageUrl, type Product } from "~/constants";

const config = useRuntimeConfig().public;
const productStore = useProductStore();
const props = defineProps({
  id: String,
});
// const { data: products } = await useAsyncData("products", async () => {
//   const allProducts = await fetchProducts(config);
//   return allProducts; // Get only the first 4
// });

const { data: products } = await useAsyncData(
  "products",
  async () => {
    if (productStore.products.length > 0) {
      return productStore.products;
    }
    const allProducts = await fetchProducts(config);
    productStore.setProducts(allProducts);
    return allProducts;
  },
  { lazy: false }
);

const filteredProducts = computed<Product[]>(() => {
  if (!products.value || !props.id) return [];

  switch (props.id) {
    case "mens-eyeglasses":
      return glassesFinder(
        ["Oval", "Round", "Square", "Triangle", "Triangle"],
        "male",
        products.value
      );
    case "mens-sunglasses":
      return glassesFinder(["Allsg"], ["male", "female"], products.value);
    case "womens-sunglasses":
      return glassesFinder(["Allsg"], ["male", "female"], products.value);
    case "kids-eyeglasses":
      return glassesFinder(["Kids"], ["male", "female"], products.value);
    case "womens-eyeglasses":
      return glassesFinder(
        ["Oval", "Round", "Square", "Triangle", "Heart"],
        "female",
        products.value
      );
    case "glasses-for-oval-face":
      return glassesFinder(["Oval"], ["male", "female"], products.value);
    case "glasses-for-round-face":
      return glassesFinder(["Round"], ["male", "female"], products.value);
    case "glasses-for-square-face":
      return glassesFinder(["Square"], ["male", "female"], products.value);
    case "glasses-for-tyriangle-face":
      return glassesFinder(["Triangle"], ["male", "female"], products.value);
    case "glasses-for-heart-face":
      return glassesFinder(["Heart"], ["male", "female"], products.value);

    default:
      return [];
  }
});
</script>
