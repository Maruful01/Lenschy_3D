<template>
  <section class="px-4 mx-auto sm:px-6 lg:px-8 max-w-7xl">
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

          <span class="text-gray-400 inline-flex items-center">{{ id }}</span>
        </div>
      </ol>
    </nav>
    <!-- Dynamic Items -->
    <FilteredProducts :id="normalizedRoute" />
  </section>
</template>

<script setup lang="ts">
import { getPinataImageUrl, slugify, type Product } from "~/constants";

// let filteredProducts = ref<Product[]>([]);
const route = useRoute(); // ✅ allowed here

const id = computed(() => route.params.id);

// Create a new computed property that always returns a single string
const normalizedRoute = computed(() => {
  const val = id.value;
  return Array.isArray(val) ? val.join("/") : val;
});

function kebabToTitle(input: string): string {
  if (!input) return input;
  return input
    .trim()
    .split("-")
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join(" ");
}

const normalizedId = computed(() => {
  const val = id.value;
  return Array.isArray(val) ? val.join(" ") : val; // join if it's an array
});

useSeoMeta({
  title: computed(() => `Buy ${kebabToTitle(normalizedId.value)}`),
  ogTitle: `${kebabToTitle(normalizedId.value)}`,
  description: computed(
    () =>
      `Buy ${kebabToTitle(
        normalizedId.value
      )} at Affordable Price in Bangladesh. Stylish, Fashionable and Affordable ${kebabToTitle(
        normalizedId.value
      )}. Try-On online and find your your perfect fit now.`
  ),
  ogDescription: "This is my amazing site, let me tell you all about it.",
  ogImage: "https://example.com/image.png",
  twitterCard: "summary_large_image",
});

// watchEffect(() => {
//   if (!products.value || !id.value) return;

//   if (id.value === "mens-eyeglasses") {
//     filteredProducts.value = glassesFinder(
//       ["Oval", "Round", "Square", "Triangle", "Triangle"],
//       "male",
//       products.value
//     );
//   } else if (id.value === "womens-eyeglasses") {
//     filteredProducts.value = glassesFinder(
//       ["Oval", "Round", "Square", "Triangle", "Heart"],
//       "female",
//       products.value
//     );
//   } else if (id.value === "glasses-for-oval-face") {
//     filteredProducts.value = glassesFinder(
//       ["Oval"],
//       ["male", "female"],
//       products.value
//     );
//   } else if (id.value === "glasses-for-round-face") {
//     filteredProducts.value = glassesFinder(
//       ["Round"],
//       ["male", "female"],
//       products.value
//     );
//   } else if (id.value === "glasses-for-square-face") {
//     filteredProducts.value = glassesFinder(
//       ["Square"],
//       ["male", "female"],
//       products.value
//     );
//   } else if (id.value === "glasses-for-tyriangle-face") {
//     filteredProducts.value = glassesFinder(
//       ["Triangle"],
//       ["male", "female"],
//       products.value
//     );
//   } else if (id.value === "glasses-for-heart-face") {
//     filteredProducts.value = glassesFinder(
//       ["Heart"],
//       ["female", "male"],
//       products.value
//     );
//   } else {
//     filteredProducts.value = [];
//   }
// });
//   console.log("Route param id:", id.value);

//   if (!products.value || !id.value) return;

//   switch (id.value) {
//     case "all-men-glasses":
//       filteredProducts.value = glassesFinder(
//         ["Oval", "Round", "Square"],
//         "male",
//         products.value
//       );
//       break;
//     case "all-women-glasses":
//       filteredProducts.value = glassesFinder(
//         ["Square", "Heart"],
//         "female",
//         products.value
//       );
//       break;
//     default:
//       filteredProducts.value = products.value ?? [];
//   }
// });

definePageMeta({
  prerender: false,
});

const goToProductPage = (title: string) => {
  if (!title) return;
  navigateTo(`/products/${slugify(title)}`);
};
</script>
