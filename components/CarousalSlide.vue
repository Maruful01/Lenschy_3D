<template>
  <div class="rounded-box mt-2 md:mx-10 lg:mx-20">
    <ClientOnly>
      <Swiper
        :onSwiper="handleSwiper"
        :modules="[Autoplay]"
        :autoplay="{ delay: 5500, disableOnInteraction: true }"
        :loop="true"
        :pagination="{ clickable: true }"
        :slides-per-view="2"
        :breakpoints="{
          0: {
            slidesPerView: 2,
          },
          900: {
            slidesPerView: 4,
          },
          1225: {
            slidesPerView: 5,
          },
          1500: {
            slidesPerView: 5,
          },
        }"
        :spaceBetween="0"
      >
        <SwiperSlide
          class="carousel-item"
          v-for="item in carousols"
          :key="item.$id"
        >
          <NuxtLink :to="item.route">
            <img :src="getPinataImageUrl(item.url)" alt="Drink" />
            <SkeletonCarousal v-if="!item.url" />
            <figure
              class="cursor-pointer text-center rounded-md hover:border text-gray-900 hover:text-[#1DB2A3] hover:border-[#1DB2A3]"
            >
              <figcaption class="absolute px-4 text-lg text-white bottom-6">
                <h5 class="mb-4 text-xl font-semibold text-slate-300">
                  {{ item.lebel }}
                </h5>
                <NuxtLink :to="item.route" prefetch>
                  <button
                    type="button"
                    class="text-gray-900 opacity-70 hover:opacity-100 bg-gradient-to-r from-teal-200 to-lime-200 hover:bg-gradient-to-l hover:from-teal-200 hover:to-lime-200 focus:ring-4 focus:outline-none focus:ring-lime-200 dark:focus:ring-teal-700 font-medium rounded-full text-sm px-3 py-1.5 text-center me-2 mb-2"
                  >
                    Shop Now
                  </button>
                </NuxtLink>
              </figcaption>
            </figure>
          </NuxtLink>
        </SwiperSlide>
      </Swiper>
      <template #fallback>
        <div class="flex items-center justify-center">
          <SkeletonCarousal />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { Swiper, SwiperSlide } from "swiper/vue";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import { getPinataImageUrl } from "~/constants";
import type { Swiper as SwiperClass } from "swiper";
import { nextTick } from "vue";
import { useAsyncData } from "#app";
import { fetchCarosuls } from "@/composables/useFitchedCarousols";
// No need for isClient or v-if="isClient"
const config = useRuntimeConfig().public;
const { data: carousols } = await useAsyncData("carousels", async () => {
  return await fetchCarosuls(config);
});
function handleSwiper(swiper: SwiperClass) {
  nextTick(() => {
    swiper.update();
  });
}
</script>
