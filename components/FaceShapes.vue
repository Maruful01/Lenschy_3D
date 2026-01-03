<script setup lang="ts">
import { Swiper, SwiperSlide } from "swiper/vue";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import { getPinataImageUrl } from "~/constants";
import type { Swiper as SwiperClass } from "swiper";
import { nextTick } from "vue";

const isClient = typeof window !== "undefined";
type Item = {
  url: string;
  shape: string;
  link: string;
};

const items: Item[] = [
  {
    url: getPinataImageUrl(
      "bafybeiefnfxlxvyw4kjyt4szbi56lxfxwprb6so5653wn6cj2rmarvokku"
    ),
    shape: "Round",
    link: "glasses-for-round-face",
  },
  {
    url: getPinataImageUrl(
      "bafybeidkz32jkkh4djlm2wfxurskaj2cb4cbyskxcwplzfdvaasp2xgwfm"
    ),
    shape: "Dimond",
    link: "glasses-for-tyriangle-face",
  },
  {
    url: getPinataImageUrl(
      "bafybeice4nrvbu5tjahqqdnjculgbklihsrbag6pffpa2b32drdzshbtnm"
    ),
    shape: "Heart",
    link: "glasses-for-heart-face",
  },
  {
    url: getPinataImageUrl(
      "bafybeif7ggkh5b6ymm7qrbbmowrwjputsg4zp6r7gfa3xfwu6plui26fpi"
    ),
    shape: "Oval",
    link: "glasses-for-oval-face",
  },
  {
    url: getPinataImageUrl(
      "bafybeif6i3vx27wrdblbqfwcsdwjace4d6pdbzumnwsrrrb5uidsgkj6ou"
    ),
    shape: "Square",
    link: "glasses-for-square-face",
  },
];

// handler with correct type
function handleSwiper(swiper: SwiperClass) {
  nextTick(() => {
    swiper.update();
  });
}
</script>

<template>
  <div class="text-center mb-4 max-w-[600px] mx-auto">
    <!-- <p class="text-sm text-primary" data-aos="fade-up">
      What is your face shape?
    </p> -->
    <h1 class="text-3xl font-bold text-black" data-aos="fade-up">
      Shop by face shape
    </h1>
    <p class="text-xs text-gray-400" data-aos="fade-up">
      Flatter your features and brighten your unique summer look.
    </p>
  </div>
  <!-- <UCarousel v-slot="{ item }" :items="items" :ui="{ item: 'basis-full' }" class="rounded-lg overflow-hidden" arrows>
    <img :src="item" class="w-full" draggable="false">
  </UCarousel> -->

  <ClientOnly>
    <div v-if="isClient" class="rounded-box mt-2 mx-0 md:mx-40 lg:mx-60">
      <Swiper
        :onSwiper="handleSwiper"
        :modules="[Autoplay]"
        :autoplay="{ delay: 7500, disableOnInteraction: true }"
        :loop="true"
        :pagination="{ clickable: true }"
        :slides-per-view="3"
        :breakpoints="{
          0: {
            slidesPerView: 3,
          },
          567: {
            slidesPerView: 4,
          },
          930: {
            slidesPerView: 4,
          },
          1500: {
            slidesPerView: 5,
          },
        }"
        :spaceBetween="0"
      >
        <SwiperSlide
          class="carousel-item"
          v-for="(item, index) in items"
          :key="index"
        >
          <NuxtLink :to="item.link">
            <div
              class="bg-center flex flex-col items-center justify-center cursor-pointer text-center rounded-md hover:border text-gray-900 hover:text-[#1DB2A3] hover:border-[#1DB2A3]"
            >
              <img
                class="object-contain w-28 md:w-36"
                :src="item.url"
                alt="Drink"
              />
              <div class="text-md">
                <div class="text-xl">
                  <a
                    href="#"
                    class="font-semibold transition duration-500 ease-in-out"
                    >{{ item.shape }}
                  </a>
                </div>
              </div>
            </div>
          </NuxtLink>
        </SwiperSlide>
      </Swiper>
    </div>
  </ClientOnly>
</template>
