<template>
  <section class="md:mx-10 lg:mx-20">
    <div class="relative my-2 flex w-full flex-col items-center mt-2">
      <div ref="ref1"></div>
      <div ref="ref2"></div>
      <div ref="ref3"></div>
      <a
        v-if="isSignedIn"
        target="_blank"
        rel="noreferrer"
        href="https://example.com"
        class="mx-auto flex max-w-fit items-center justify-center space-x-2 overflow-hidden text-teal-500 rounded-full bg-blue-100 px-7 py-2 transition-all hover:bg-blue-200"
      >
        <!-- <NotificationOutlined v-if="!isSignedIn" /> -->
        <p
          v-if="isSignedIn && user?.firstName"
          class="text-sm font-semibold text-teal-500"
        >
          <span>Hello</span>
          {{ user?.firstName }}
        </p>
      </a>
      <!-- <h1
      v-if="!currentUserFaceData"
      class="mt-2 max-w-sm bg-gradient-to-br from-gray-500 via-teal-500 to-gray-500 bg-clip-text text-center text-4xl font-extrabold text-transparent sm:max-w-4xl sm:text-6xl"
    >
      Find Your Perfect Fit With
      <span
        class="relative whitespace-nowrap text-teal-500 from-gray-500 to-gray-500"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 418 42"
          class="absolute top-2/3 left-0 h-[0.58em] w-full fill-teal-300 dark:fill-orange-300/60"
          preserveAspectRatio="none"
        >
          <path
            d="M203.371.916c-26.013-2.078-76.686 1.963-124.73 9.946L67.3 12.749C35.421 18.062 18.2 21.766 6.004 25.934 1.244 27.561.828 27.778.874 28.61c.07 1.214.828 1.121 9.595-1.176 9.072-2.377 17.15-3.92 39.246-7.496C123.565 7.986 157.869 4.492 195.942 5.046c7.461.108 19.25 1.696 19.17 2.582-.107 1.183-7.874 4.31-25.75 10.366-21.992 7.45-35.43 12.534-36.701 13.884-2.173 2.308-.202 4.407 4.442 4.734 2.654.187 3.263.157 15.593-.780 35.401-2.686 57.944-3.488 88.365-3.143 46.327.526 75.721 2.23 130.788 7.584 19.787 1.924 20.814 1.98 24.557 1.332l.066-.011c1.201-.203 1.53-1.825.399-2.335-2.911-1.31-4.893-1.604-22.048-3.261-57.509-5.556-87.871-7.36-132.059-7.842-23.239-.254-33.617-.116-50.627.674-11.629.540-42.371 2.494-46.696 2.967-2.359.259 8.133-3.625 26.504-9.810 23.239-7.825 27.934-10.149 28.304-14.005 .417-4.348-3.529-6-16.878-7.066Z"
          ></path>
        </svg>
        <span class="relative">AI<RobotOutlined /></span>
      </span>
    </h1>

    <span
      v-if="!currentUserFaceData"
      class="mt-8 max-w-lg text-center text-xl leading-relaxed text-gray-800"
    >
      Personalized eyewear recommendations made simple. Just take a photo, and
      let AI find the frames that fit your face perfectly.
    </span> -->
      <div
        v-if="!currentUserFaceData"
        class="relative w-full h-full bg-cover bg-center flex items-center justify-center p-8 my-8 dui-bg-fixed bg-[url(@/assets/vision_eye.png)] bg-no-repeat"
      >
        <div
          class="p-8 bg-gray-900 bg-opacity-50 text-white/75 rounded-xl shadow-lg text-center w-full max-w-full mx-2"
        >
          <h1 class="text-4xl font-bold mb-4">Find Your Perfect Fit With AI</h1>
          <p class="text-lg mb-8">
            Personalized eyewear recommendations made simple. Just take a photo,
            and let AI find the frames that fit your face perfectly.
          </p>

          <button
            v-if="!image?.name && !currentUserFaceData"
            @click="openModal"
            class="btn btn-neutral btn-wide"
          >
            <CameraOutlined /> Visual Search
          </button>
        </div>
      </div>

      <!-- <NextButton
      v-if="!currentUserFaceData"
      :name="'Follow guideline'"
      @click="handleOpen(true)"
    /> -->
    </div>

    <div v-if="!currentUserFaceData" class="m-5 w-10/12 z-50">
      <a-tour
        class="z-50"
        v-model:current="current"
        :open="open"
        :steps="steps"
        @close="handleOpen(false)"
        :mask="false"
      />
    </div>

    <div v-if="currentUserFaceData">
      <div
        :class="`relative w-full h-full bg-cover bg-center flex items-center justify-center p-8 my-8 dui-bg-fixed bg-[url(@/assets/vision_eye.png)] bg-no-repeat rounded-md`"
      >
        <div
          class="bg-center flex flex-col items-center justify-center p-8 bg-teal-100 bg-opacity-60 text-white/75 rounded-md shadow-lg text-center w-auto max-w-full mx-2"
        >
          <div class="flex flex-col items-center pb-10">
            <img
              class="w-36 h-36 mb-3 rounded-full shadow-lg"
              :src="currentFaceImageUrl!"
              alt="Bonnie image"
            />
            <h5
              class="mb-1 text-xl font-semibold text-teal-800 dark:text-white"
            >
              Cool! You have an "{{ currentUserFaceData?.shape }}" face shape
            </h5>
            <span class="text-sm text-gray-700 dark:text-gray-400">
              {{ currentUserFaceData?.ageCategory }}
              {{ currentUserFaceData?.gender === 1 ? "Male" : "Female" }}</span
            >
            <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2">
              <UButton
                @click="openModal"
                href="#"
                class="flex items-center justify-center cursor-pointer py-2 px-4 rounded-lg text-sm font-sans font-medium bg-teal-200 text-teal-800 hover:bg-teal-300 transition"
                ><ReloadOutlined /> Re-recognize
              </UButton>
              <UButton
                href="#"
                class="flex items-center justify-center cursor-pointer py-2 px-4 rounded-lg text-sm font-sans font-bold bg-[#FA8072] text-white hover:bg-[#FFA07A] transition"
                >Remove-face
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <div v-if="currentUserFaceData">
        <RecommendedGlasses :faceData="currentUserFaceData" />
      </div>
    </div>

    <div class="text-gray-700">
      <FashmashCamera
        v-model:is-open="isOpen"
        :loading="loading"
        :is-signed-in="isSignedIn! || false"
        @photo-captured="handlePhotoCaptured"
        @use-image="identifyImageHandler"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, createVNode, onMounted } from "vue";
import selfieIMG from "../public/selfie1.jpg";
// --- Pinia Store Import ---
import { useIdentifiedFacesStore } from "@/stores/identifiedFaces";
const identifiedFacesStore = useIdentifiedFacesStore();
import { useUser } from "@clerk/vue";
const { isLoaded, isSignedIn, user } = useUser();

onMounted(() => {
  identifiedFacesStore.loadFromLocal();
});

definePageMeta({
  middleware: "auth",
});

// Tur
import {
  NotificationOutlined,
  RobotOutlined,
  CameraOutlined,
} from "@ant-design/icons-vue";
import type { TourProps } from "ant-design-vue";
import { useIdentifyImage } from "~/composables/identifyImage";
import FashmashCamera from "./FashmashCamera.vue";
import { definePageMeta } from "#imports";
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

// A computed property to format the Base64 image string for display
const currentFaceImageUrl = computed(() => {
  if (currentUserFaceData.value?.img) {
    // The image data starts with "iVBORw0...", which is a PNG.
    // We prefix it with the correct data URL header.
    return `data:image/png;base64,${currentUserFaceData.value.img}`;
  }
  return null;
});

// Import the new camera component
const open = ref<boolean>(false);
const current = ref(0);
const ref1 = ref(null);
const ref2 = ref(null);
const ref3 = ref(null);

const steps: TourProps["steps"] = [
  {
    title: "1. Remove your glasses if you are wearing any",
    description:
      "Ensure you're in a well-lit environment for enhanced accuracy.",
    target: () => ref1.value && (ref1.value as any).$el,
  },
  {
    title: "2. Place a card against your forehead",
    description: "Any card like a credit card, NID card works perfectly",
    cover: createVNode("img", {
      src: selfieIMG,
    }),
    target: () => ref2.value && (ref2.value as any).$el,
  },
  {
    title: "3. Face the camera straight on and capture a photo of your face",
    description:
      "Adjust the camera angle so you're looking directly into it, ensuring clear visibility of your pupils.",
    target: () => ref3.value && (ref3.value as any).$el,
  },
];

const handleOpen = (val: boolean): void => {
  open.value = val;
};

// ✅ Declare reactive state
const isOpen = ref(false);
const image = ref<File | null>(null);
const result = ref<any | null>(null);
const loading = ref(false);

const introductoryMessage = ref<string | null>(null); // New reactive variable for the intro message

const openModal = async () => {
  isOpen.value = true;
};

const handlePhotoCaptured = (file: File) => {
  image.value = file;
};

const ok = () => {
  if (!image.value) return;
  isOpen.value = false;
};

// Pass all required reactive state variables as arguments.
const { identifyImage } = useIdentifyImage(
  image,
  user,
  loading,
  introductoryMessage,
  result,
  ok
);

// In parent
const identifyImageHandler = async (file: File) => {
  // Reassign to trigger reactivity
  image.value = new File([file], file.name, { type: file.type });

  if (!image.value) return;

  loading.value = true;
  await identifyImage(); // from composable
  loading.value = false;
};
</script>
