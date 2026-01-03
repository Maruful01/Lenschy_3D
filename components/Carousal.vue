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
  lbl: string;
  link: string;
};

const items: Item[] = [
  {
    url: getPinataImageUrl(
      "bafybeig2dzgzqxahjl42qnoiov6q46ge3fousk3fubolwfpuimaljnwx4m"
    ),
    lbl: "SUNGLASSES FOR MEN",
    link: "mens-sunglasses",
  },
  {
    url: getPinataImageUrl(
      "bafybeie7gk2qggrci3zicxdl2q7s2knuzpsiry64pdd3tqt3amxxxzytga"
    ),
    lbl: "EYEGLASSES FOR WOMEN",
    link: "womens-eyeglasses",
  },
  {
    url: getPinataImageUrl(
      "bafybeibvs5ycz2t3ac6bababwz2kwz34c4gdm67efm5enndj57e4njbwxe"
    ),
    lbl: "EYEGLASSES FOR MEN",
    link: "mens-eyeglasses",
  },
  {
    url: getPinataImageUrl(
      "bafybeifoiqeknt4n2gyif4dpxbagdqa44gixzwelkeoi2hqrl3qcnd4iwe"
    ),
    lbl: "SUNGLASSES FOR WOMEN",
    link: "womens-sunglasses",
  },
  {
    url: getPinataImageUrl(
      "bafybeihb47mt6pwpap3shmnzboyej7gq7fiuvw5bkfe4j7qbcjtrao3gse"
    ),
    lbl: "EYEGLASSES FOR KIDS",
    link: "kids-eyeglasses",
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
  <ClientOnly>
    <div v-if="isClient" class="rounded-box mt-2 md:mx-10 lg:mx-20">
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
          v-for="(item, index) in items"
          :key="index"
        >
          <NuxtLink :to="item.link" prefetch>
            <img :src="item.url" alt="Drink" />
            <figure
              class="cursor-pointer text-center rounded-md hover:border text-gray-900 hover:text-[#1DB2A3] hover:border-[#1DB2A3]"
            >
              <figcaption class="absolute px-4 text-lg text-white bottom-6">
                <h5 class="mb-4 text-xl font-semibold text-slate-300">
                  {{ item.lbl }}
                </h5>
                <NuxtLink :to="item.link" prefetch>
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
    </div>
  </ClientOnly>
</template>
