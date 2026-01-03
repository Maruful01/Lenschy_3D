<template>
  <div class="container mx-auto px-4">
    <!-- Header Section -->
    <div class="text-center mb-10 max-w-[600px] mx-auto">
      <p class="text-sm text-primary" data-aos="fade-up">
        What our customers are saying
      </p>
      <h1 class="text-3xl font-bold text-black" data-aos="fade-up">
        Customer Reviews
      </h1>
      <p class="text-xs text-gray-400" data-aos="fade-up">
        Lorem ipsum dolor sit amet consectetur, adipisicing elit. Sit asperiores
        modi Sit asperiores modi
      </p>
    </div>

    <!-- Testimonials Swiper -->
    <div data-aos="zoom-in">
      <ClientOnly>
        <template #default>
          <div v-if="isClient">
            <Swiper
              :modules="[Autoplay]"
              :autoplay="{ delay: 2500, disableOnInteraction: false }"
              :loop="true"
              :pagination="{ clickable: true }"
              :slidesPerView="1"
              :spaceBetween="16"
              :breakpoints="{
                0: { slidesPerView: 1, spaceBetween: 10 },
                640: { slidesPerView: 1, spaceBetween: 20 },
                1024: { slidesPerView: 2, spaceBetween: 30 },
                1280: { slidesPerView: 3, spaceBetween: 30 },
              }"
            >
              <SwiperSlide
                v-for="data in testimonialData"
                :key="data.id"
                class="my-6"
              >
                <div
                  class="flex flex-col gap-4 shadow-lg py-8 px-6 mx-4 rounded-xl bg-[#F0FFF0] relative"
                >
                  <div class="mb-4 flex justify-center">
                    <img
                      :src="data.img"
                      alt=""
                      class="rounded-full w-20 h-20"
                    />
                  </div>
                  <div class="flex flex-col items-center gap-4">
                    <div class="space-y-3 text-center">
                      <p class="text-xs text-gray-500">{{ data.text }}</p>
                      <h1 class="text-xl font-bold text-black/80">
                        {{ data.name }}
                      </h1>
                    </div>
                  </div>
                  <p
                    class="text-black/20 text-9xl font-serif absolute top-0 right-0"
                  >
                    ,,
                  </p>
                </div>
              </SwiperSlide>
            </Swiper>
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Swiper, SwiperSlide } from "swiper/vue";
import { Autoplay } from "swiper/modules";
import "swiper/css";

const isClient = typeof window !== "undefined";

// Testimonial data
const testimonialData = [
  {
    id: 1,
    name: "Victor",
    text: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Eaque reiciendis inventore iste ratione ex alias quis magni at optio",
    img: "https://picsum.photos/101/101",
  },
  {
    id: 2,
    name: "Satya Nadella",
    text: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Eaque reiciendis inventore iste ratione ex alias quis magni at optio",
    img: "https://picsum.photos/102/102",
  },
  {
    id: 3,
    name: "Virat Kohli",
    text: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Eaque reiciendis inventore iste ratione ex alias quis magni at optio",
    img: "https://picsum.photos/104/104",
  },
  {
    id: 5,
    name: "Sachin Tendulkar",
    text: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Eaque reiciendis inventore iste ratione ex alias quis magni at optio",
    img: "https://picsum.photos/103/103",
  },
];
</script>
