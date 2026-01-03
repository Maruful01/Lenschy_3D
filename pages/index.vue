<script setup lang="ts">
import { useAsyncData } from "#app";
import { fetchProducts } from "@/composables/useFitchedProducts"; // Import your API call
import Testimonials from "~/components/Testimonials.vue";
import TechShowcaseRibbon from "~/components/TechShowcaseRibbon.vue";
import FaceShapes from "~/components/FaceShapes.vue";

useSeoMeta({
  title: "Lenschy.com - Affordable Eyewear Collection in Bangladesh",
  ogTitle:
    "Eyeglasses, Sunglasses & Contact Lenses – Affordable Eyewear Collection in Bangladesh",
  description:
    "SHILD YOUR VISION WITH LENSCHY - Find Perfectly Soitable Eyeglasses, Sunglasses & Contact Lenses for Your Face Shape. Affordable, Stylish & Fashionable  Eyewear for Everyone.",
  ogDescription:
    "SHILD YOUR VISION WITH LENSCHY - Find Perfectly Soitable Eyeglasses and Sunglasses for Your Face Shape. Affordable, Stylish & Fashionable  Eyewear for Everyone.",
  ogImage: "https://example.com/image.png",
  twitterCard: "summary_large_image",
});

//   function handleCardClick(product: Product) {
//   productStore.setSelectedProduct(product)
//   const slug = `${slugify(product.title)}-${product.$id}`
//   navigateTo(`/product/${slug}`)
// }

// Pre-render the page to enable static generation
// definePageMeta({
//   prerender: false, // Ensures pages are pre-built
// });

// const getProductImageUrl = (fileId: string) => {
//   if (!fileId) return "";
//   const bucketId = "67ad058c00255d1392bd";
//   const projectId = "67ad0347000f5699faf6";
//   return `https://cloud.appwrite.io/v1/storage/buckets/${bucketId}/files/${fileId}/preview?width=500&height=500&project=${projectId}`;
// };
</script>

<template>
  <section class="mx-auto max-w-7xl">
    <div class="grid grid-cols-1">
      <Suspense>
        <template #default>
          <CarousalSlide />
        </template>
        <template #fallback>
          <SkeletonCarousal />
        </template>
      </Suspense>
    </div>
    <!-- <div class="grid grid-cols-1">
      <Carousal />
    </div> -->
    <Features />
    <VisualSearch />

    <div class="grid grid-cols-1">
      <FaceShapes />
    </div>
    <Gallery />
    <!-- <DealBanner /> -->
    <!-- <TechShowcaseRibbon /> -->
    <!-- <BestSellings /> -->
    <!-- <div class="grid grid-cols-1">
      <Testimonials />
    </div> -->
  </section>
</template>
