<script setup lang="ts">
import { useRoute, useAsyncData } from "#app";
import { getPinataImageUrl, slugify } from "~/constants";
import type { CartProduct, Product } from "~/constants";
import { useProductStore } from "~/stores/productStore";
import { computed, ref, watchEffect, createVNode, onMounted } from "vue";
import { useCartStore } from "~/stores/cart";

// --- Pinia Store Import ---
import { useIdentifiedFacesStore } from "@/stores/identifiedFaces";
const identifiedFacesStore = useIdentifiedFacesStore();
import { useUser } from "@clerk/vue";
const { isLoaded, isSignedIn, user } = useUser();

onMounted(() => {
  identifiedFacesStore.loadFromLocal();
});

const config = useRuntimeConfig().public;
const productStore = useProductStore();
let frameWidth = ref<number>(1.64);
const modalText = ref<string>("Content of the modal");
const open = ref<boolean>(false);
const confirmLoading = ref<boolean>(false);

onMounted(() => {
  identifiedFacesStore.loadFromLocal();
});

// Get the current user's email from the auth service
const currentUserEmail = computed(
  () => user.value?.primaryEmailAddress?.emailAddress
);

// Use a computed property to get data for the logged-in user
const currentUserFaceData = computed(() => {
  if (!isLoaded.value || !currentUserEmail.value) {
    return null;
  }
  return identifiedFacesStore.getUserData(currentUserEmail.value);
});

const cartStore = useCartStore();

const router = useRouter();

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1);
  } else {
    router.push("/"); // fallback to home if no history
  }
};

const showModal = () => {
  open.value = true;
};

const lensSelection = ref({
  package: null as any,
  features: [] as string[],
  prescription: null as string | null,
});

const handleOk = () => {
  modalText.value = "The modal will be closed after two seconds";
  confirmLoading.value = true;
  setTimeout(() => {
    open.value = false;
    confirmLoading.value = false;
  }, 2000);
};

const route = useRoute();
const slug = Array.isArray(route.params.slug)
  ? route.params.slug[0]
  : route.params.slug;
const store = useProductStore();

const { data: product } = await useAsyncData(
  `product-${slug}`,
  async () => {
    const allProducts = await fetchProducts(config);

    return allProducts.find((p: Product) => slugify(p.title) === slug) || null;
  },
  { lazy: false }
);

const breadcrumb = computed(() => {
  const segments = route.path.split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    name: seg.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    path: "/" + segments.slice(0, i + 1).join("/"),
  }));
});

const images = {
  img1: product.value?.img1 ?? "",
  img2: product.value?.img2 ?? "",
  img3: product.value?.img3 ?? "",
};

const imageKeys = ["img1", "img2", "img3"] as const;
type ImageKey = (typeof imageKeys)[number];

const getImgUrl = (i: number) => {
  const key: ImageKey = imageKeys[i];
  const imgPath = images[key];
  return imgPath ? getPinataImageUrl(imgPath) : "";
};

const mainImage = ref("");
const selectedTab = ref<"details" | "description" | "reviews">("details");

watchEffect(() => {
  if (product.value) {
    images.img1 = product.value.img1 ?? "";
    images.img2 = product.value.img2 ?? "";
    images.img3 = product.value.img3 ?? "";
    mainImage.value = getImgUrl(0); // default to first image
  }
});

const changeImage = (index: number) => {
  const url = getImgUrl(index);
  if (url) {
    mainImage.value = url;
  }
};

const handleAddToCart = () => {
  if (!product.value) return;

  // Create the cart product with lens selection
  const cartProduct: CartProduct = {
    $id: product.value.$id,
    title: product.value.title,
    price: product.value.price || 0,
    img1: product.value.img1 || "",
    product: product.value.product || Math.floor(Math.random() * 100000),
    // Lens selection data
    package: lensSelection.value.package,
    features: lensSelection.value.features,
    prescription: lensSelection.value.prescription,
  };

  cartStore.addToCart(cartProduct);
};

// Virtual Try-On logic
const isOpen = ref(false);
const { webcamRef, canvasRef, startCamera, stopCamera } = useMediaPipe(
  getPinataImageUrl(product.value?.img4 ?? ""),
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

if (products.value) {
  productStore.setProducts(products.value);
}
const filteredProducts = ref<Product[]>([]);
const gender = currentUserFaceData.value?.gender === 1 ? "male" : "female"; // user selection

filteredProducts.value = glassesFinder(
  `${currentUserFaceData.value?.shape}`,
  [gender],
  products.value
);
// ✅ SEO meta
useSeoMeta({
  title: computed(() => `${product.value?.title}`),
  ogTitle: product.value?.title,
  description: `${product.value?.title} price in Bangladesh. 
      Buy ${product.value?.title} at Affordable Price in Bangladesh`,
  ogDescription: product.value?.description,
  // 👇 Better to use /public folder or absolute URL
  ogImage: product.value?.img1,
});
</script>

<template>
  <nav v-if="breadcrumb.length" class="flex mb-5 p-6" aria-label="Breadcrumb">
    <ol class="inline-flex items-center space-x-0 md:space-x-2 font-normal">
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
      <li v-for="(item, index) in breadcrumb" :key="item.path">
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

          <NuxtLink
            v-if="index < breadcrumb.length - 1"
            :to="item.path"
            class="text-gray-700 hover:text-gray-900 ml-1 md:ml-2 text-sm font-medium"
          >
            {{ item.name }}
          </NuxtLink>

          <span
            v-else
            class="text-gray-400 ml-1 md:ml-2 text-sm font-sm truncate max-w-[16ch] sm:max-w-none"
            :title="item.name"
          >
            {{ item.name }}
          </span>
        </div>
      </li>
    </ol>
  </nav>

  <div v-if="product" class="p-6">
    <div>
      <div class="container mx-auto px-4 py-8">
        <div class="flex flex-wrap -mx-4">
          <!-- Product Images -->
          <!-- Image & Thumbnails Row -->
          <div class="w-full md:w-1/2 px-4 mb-8">
            <div class="flex">
              <!-- Thumbnails Column (Vertical) -->
              <div class="flex flex-col gap-4 justify-center mr-4">
                <img
                  v-for="(key, index) in imageKeys"
                  :src="getImgUrl(index)"
                  :key="key"
                  class="size-16 sm:size-20 object-cover rounded-md cursor-pointer opacity-60 hover:opacity-100 transition duration-300"
                  @click="changeImage(index)"
                />
              </div>

              <!-- Main Image -->
              <div class="flex-1">
                <img
                  :src="mainImage"
                  alt="mainImage"
                  class="w-full h-auto rounded-lg shadow-md"
                  id="mainImage"
                />
                <div class="flex justify-center mt-1">
                  <a-button
                    type="dashed"
                    class="mr-2 text-black font-semibold mt-2"
                    @click="openModal"
                    >🕶 Try On</a-button
                  >
                </div>
              </div>
            </div>
          </div>
          <!-- Product Details -->
          <div class="w-full md:w-1/2 px-4">
            <h2 class="text-xl md:text-2xl font-bold mb-2 text-gray-600">
              {{ product.title }}
            </h2>
            <p class="text-gray-600 mb-4">SKU: {{ product.$id }}</p>

            <div class="flex items-center mb-4">
              <Rating :rate="product.rate" />
              <!-- <span class="ml-2 text-gray-600"
                >{{ product.rate }} (0 reviews)</span -->
              >
            </div>

            <div
              class="flex flex-col gap-4 bg-gray-50 my-5 tracking-wide border p-2 rounded-md"
            >
              <div class="max-w-2xl p-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div class="mb-4">
                    <span class="text-xl font-bold mr-2 text-gray-600"
                      >৳ {{ product.price }}</span
                    >
                    <span class="text-gray-500 line-through">{{
                      product.price
                    }}</span>
                  </div>
                  <a-checkbox>First Delivery +৳190</a-checkbox>
                </div>

                <div>
                  <h3 class="text-sm font-medium text-gray-900">
                    Lenschy WOW price includes:
                  </h3>
                  <ul role="list" class="mt-4 space-y-2">
                    <li class="flex space-x-3">
                      <div
                        class="flex justify-center items-center rounded-full bg-green-100 h-5 w-5"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                          class="h-3 w-3 flex-shrink-0 text-green-500"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M20.707 5.293a1 1 0 010 1.414l-11 11a1 1 0 01-1.414 0l-5-5a1 1 0 111.414-1.414L9 15.586 19.293 5.293a1 1 0 011.414 0z"
                            clip-rule="evenodd"
                          ></path>
                        </svg>
                      </div>
                      <span class="text-sm text-gray-500"
                        >High-quality frame</span
                      >
                    </li>

                    <li class="flex space-x-3">
                      <div
                        class="flex justify-center items-center rounded-full bg-green-100 h-5 w-5"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                          class="h-3 w-3 flex-shrink-0 text-green-500"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M20.707 5.293a1 1 0 010 1.414l-11 11a1 1 0 01-1.414 0l-5-5a1 1 0 111.414-1.414L9 15.586 19.293 5.293a1 1 0 011.414 0z"
                            clip-rule="evenodd"
                          ></path>
                        </svg>
                      </div>
                      <span class="text-sm text-gray-500"
                        >Basic prescription lenses*</span
                      >
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-4">
              <a
                @click="showModal"
                href="#_"
                class="transition duration-500 ease-linear inline-flex items-center justify-center h-10 px-6 font-extrabold tracking-wide border-2 border-teal-500 text-teal-500 hover:bg-teal-500 hover:text-white rounded-full"
              >
                Select Lens
              </a>
              <a
                v-if="
                  (lensSelection.package &&
                    lensSelection.features.length > 0) ||
                  lensSelection.prescription
                "
                href="#_"
                class="inline-flex items-center justify-center h-10 px-6 font-medium tracking-wide text-white hover:text-black transition duration-200 bg-gray-800 rounded-full hover:bg-[#C0C0C0] focus:shadow-outline focus:outline-none"
                @click="handleAddToCart"
              >
                Add to Cart
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reviews Section -->
    <div class="mt-16">
      <div class="border-b border-gray-200 dark:border-gray-800">
        <div class="flex gap-6 md:gap-8 text-sm md:text-base">
          <button
            @click="selectedTab = 'details'"
            :class="[
              'px-1 md:px4 py-2 border-b-2',
              selectedTab === 'details'
                ? 'text-[#007580] border-[#007580]'
                : 'text-gray-500 dark:text-gray-400 border-transparent',
            ]"
          >
            Details
          </button>

          <button
            @click="selectedTab = 'description'"
            :class="[
              'px-1 md:px4 py-2 border-b-2',
              selectedTab === 'description'
                ? 'text-[#007580] border-[#007580]'
                : 'text-gray-500 dark:text-gray-400 border-transparent',
            ]"
          >
            Description
          </button>

          <button
            @click="selectedTab = 'reviews'"
            :class="[
              'px-1 md:px4 py-2 border-b-2',
              selectedTab === 'reviews'
                ? 'text-[#007580] border-[#007580]'
                : 'text-gray-500 dark:text-gray-400 border-transparent',
            ]"
          >
            Reviews
          </button>
        </div>
      </div>

      <div
        class="mt-8 grid md:grid-cols-2 gap-8"
        v-if="selectedTab === 'reviews'"
      >
        <!-- <div class="space-y-6">
          <div class="flex items-start gap-4">
            <img src="" alt="Reviewer" class="w-10 h-10 rounded-full" />
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <h4 class="font-medium">ARK customer</h4>
                <span class="text-sm text-gray-500 dark:text-gray-400"
                  >Yesterday</span
                >
              </div>
              <div class="flex items-center mb-2">
                <svg
                  class="w-4 h-4 text-yellow-400 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
                <svg
                  class="w-4 h-4 text-yellow-400 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
                <svg
                  class="w-4 h-4 text-yellow-400 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
                <svg
                  class="w-4 h-4 text-yellow-400 fill-current"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
              </div>
              <p class="text-gray-600 dark:text-gray-300">
                Excellent Eyeglass. good to buy from Lenchy.
              </p>
              <div class="flex items-center gap-4 mt-4">
                <button
                  class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                    />
                  </svg>
                  12
                </button>
                <button
                  class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400"
                >
                  <svg
                    class="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 11v-9m-7 10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                    />
                  </svg>
                  0
                </button>
              </div>
            </div>
          </div>
        </div> -->

        <div class="space-y-6">
          <div class="flex items-center gap-4">
            <div class="text-5xl font-bold text-primary">
              {{ product.rate }}
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <div
                  class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                >
                  <div class="h-full bg-primary" style="width: 90%"></div>
                </div>
                <span class="text-sm text-gray-500 dark:text-gray-400">28</span>
              </div>
              <div class="flex items-center gap-2 mb-1">
                <div
                  class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                >
                  <div class="h-full bg-primary" style="width: 70%"></div>
                </div>
                <span class="text-sm text-gray-500 dark:text-gray-400">9</span>
              </div>
              <div class="flex items-center gap-2 mb-1">
                <div
                  class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                >
                  <div class="h-full bg-primary" style="width: 40%"></div>
                </div>
                <span class="text-sm text-gray-500 dark:text-gray-400">4</span>
              </div>
              <div class="flex items-center gap-2 mb-1">
                <div
                  class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                >
                  <div class="h-full bg-primary" style="width: 20%"></div>
                </div>
                <span class="text-sm text-gray-500 dark:text-gray-400">1</span>
              </div>
              <div class="flex items-center gap-2">
                <div
                  class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                >
                  <div class="h-full bg-primary" style="width: 10%"></div>
                </div>
                <span class="text-sm text-gray-500 dark:text-gray-400">1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="text-black mt-4" v-if="selectedTab === 'details'">
      <a-descriptions>
        <a-descriptions-item label="Frame Width:"
          >{{ product.frameWidth }}mm</a-descriptions-item
        >
        <a-descriptions-item label="Lens Width:"
          >{{ product.lensWidth }}mm</a-descriptions-item
        >
        <a-descriptions-item label="Material:">{{
          product.material
        }}</a-descriptions-item>
        <a-descriptions-item label="Lens Height:"
          >{{ product.lensHeight }}mm</a-descriptions-item
        >
        <a-descriptions-item label="Temple Length:"
          >{{ product.templeLength }}mm</a-descriptions-item
        >
        <a-descriptions-item label="Bridge:"
          >{{ product.bridge }}mm</a-descriptions-item
        >
      </a-descriptions>
    </div>
    <div v-if="selectedTab === 'description'" class="m-5">
      <h1 class="text-gray-600">{{ product.description }}</h1>
    </div>
    <!-- Reviews Section /-->
    <br />

    <div class="text-center mb-4 max-w-[600px] mx-auto">
      <!-- <p class="text-sm text-primary" data-aos="fade-up">
      What is your face shape?
    </p> -->
      <h1 class="text-3xl font-bold text-black" data-aos="fade-up">
        You might also like
      </h1>
      <p class="text-xs text-gray-400" data-aos="fade-up">
        {{
          currentUserEmail
            ? `Recommended for ${currentUserFaceData?.shape} face ${gender}`
            : "Try Visual-Search option for more perfect recommendation"
        }}
      </p>
    </div>
    <div
      v-if="filteredProducts.length > 0"
      class="grid grid-cols-2 gap-6 mt-10 lg:mt-16 lg:gap-4 lg:grid-cols-4"
    >
      <div
        v-for="product in filteredProducts"
        :key="product.$id"
        class="relative group"
      >
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
      </div>
    </div>
  </div>

  <!-- Camera screen  -->
  <div
    v-if="isOpen"
    class="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-100"
  >
    <div
      class="bg-white m-4 w-[700px] h-[610px] md:h-[700px] p-3 md:p-6 rounded-md md:rounded-lg shadow-lg relative flex flex-col justify-between"
    >
      <UButton
        @click="closeModal"
        class="absolute top-3 right-3 text-white hover:text-red-500 bg-teal-500 hover:bg-teal-400"
      >
        ✖
      </UButton>

      <h2
        class="text-xl font-semibold text-center text-gray-800 cursor-pointer"
      >
        Virtual Try-On
      </h2>

      <div
        class="relative w-full h-[550px] flex justify-center items-center rounded-md overflow-hidden"
      >
        <video
          ref="webcamRef"
          class="absolute object-cover rounded-md"
          autoplay
          playsinline
        ></video>
        <canvas ref="canvasRef" class="absolute rounded-md"></canvas>
      </div>
      <a-slider v-model:value="frameWidth" :min="1.5" :max="1.8" :step="0.01" />
      <div class="flex justify-between mt-2">
        <UButton
          @click="closeModal"
          class="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          <ArrowLeftOutlined />Go Back
        </UButton>
      </div>
    </div>
  </div>

  <section v-if="!product" class="flex items-center h-screen p-16">
    <div class="container flex flex-col items-center">
      <div class="flex flex-col gap-6 max-w-md text-center">
        <h2 class="font-extrabold text-9xl text-gray-600">
          <span class="sr-only">Error</span>404
        </h2>
        <p class="text-2xl md:text-3xl text-gray-600">
          Sorry, we couldn't find this page.
        </p>
        <button
          @click="goBack"
          class="px-8 py-4 text-xl font-semibold rounded bg-teal-400 text-gray-50 hover:text-gray-200"
        >
          Go back
        </button>
      </div>
    </div>
  </section>

  <div>
    <a-modal
      v-model:open="open"
      width="1000px"
      title="Select a Lens Type"
      :confirm-loading="confirmLoading"
      @ok="handleOk"
    >
      <SelectLens
        v-model:package="lensSelection.package"
        v-model:features="lensSelection.features"
        v-model:prescription="lensSelection.prescription"
      />
    </a-modal>
  </div>
</template>
