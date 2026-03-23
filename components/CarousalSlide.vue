<script setup lang="ts">
import { getAppwriteAssetUrl } from "~/constants";
</script>

<template>
  <section class="embla md:mx-10 lg:mx-20 my-5">
    <ClientOnly>
      <a-carousel autoplay>
        <!-- Slide 1 -->
        <div class="embla__slide">
          <div class="embla__slide__number">
            <div class="embla__slide">
              <div
                class="grid grid-cols-3 gap-4 bg-blue-200 relative overflow-hidden"
              >
                <div class="col-span-2 z-10">
                  <div class="p-5 sm:p-16 opacity-65">
                    <div
                      class="inline-flex items-center gap-3 bg-blue-300 text-blue-600 pr-4 p-1 rounded-full text-xs sm:text-sm"
                    >
                      <span
                        class="bg-blue-600 px-3 py-1 max-sm:ml-1 rounded-full text-white text-xs"
                        >TRENDY</span
                      >
                      Eyeglasses for men
                    </div>
                    <h2
                      class="text-3xl font-semibold sm:text-5xl leading-[1.2] my-3 bg-gradient-to-r from-slate-600 to-blue-400 bg-clip-text text-transparent max-w-xs sm:max-w-md"
                    >
                      REDEFINE YOUR STYLE
                    </h2>
                    <NuxtLink to="/mens-eyeglasses">
                      <button
                        class="bg-slate-800 text-white text-sm py-2.5 px-7 sm:py-5 sm:px-12 mt-4 sm:mt-10 rounded-md hover:bg-slate-900 hover:scale-103 active:scale-95 transition"
                      >
                        SHOP COLLECTION
                      </button>
                    </NuxtLink>
                  </div>
                </div>
                <div class="relative">
                  <NuxtImg
                    class="absolute bottom-0 right-0 md:right-10 w-2/3 sm:max-w-sm z-0"
                    :src="getAppwriteAssetUrl('696b8b1f000506b354fb')"
                    alt=""
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Slide 2 -->
        <div class="embla__slide">
          <div class="embla__slide__number">
            <div class="embla__slide">
              <div
                class="grid grid-cols-3 gap-4 bg-pink-200 relative overflow-hidden"
              >
                <div class="col-span-2 z-10">
                  <div class="p-5 sm:p-16 opacity-65">
                    <div
                      class="inline-flex items-center gap-3 bg-pink-300 text-pink-600 pr-4 p-1 rounded-full text-xs sm:text-sm"
                    >
                      <span
                        class="bg-pink-600 px-3 py-1 max-sm:ml-1 rounded-full text-white text-xs"
                        >2026</span
                      >
                      New collection
                    </div>
                    <h2
                      class="text-3xl font-semibold sm:text-5xl leading-[1.2] my-3 bg-gradient-to-r from-slate-600 to-pink-400 bg-clip-text text-transparent max-w-xs sm:max-w-md"
                    >
                      NEW YEAR NEW YOU
                    </h2>
                    <NuxtLink to="/womens-eyeglasses">
                      <button
                        class="bg-slate-800 text-white text-sm py-2.5 px-7 sm:py-5 sm:px-12 mt-4 sm:mt-10 rounded-md hover:bg-slate-900 hover:scale-103 active:scale-95 transition"
                      >
                        SHOP COLLECTION
                      </button>
                    </NuxtLink>
                  </div>
                </div>
                <div class="relative">
                  <NuxtImg
                    class="absolute bottom-0 right-0 md:right-10 w-2/3 sm:max-w-sm z-0"
                    :src="getAppwriteAssetUrl('696b8f6d003bc975a5b7')"
                    alt=""
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Slide 3 -->
        <div class="embla__slide">
          <div class="embla__slide__number">
            <div class="embla__slide">
              <div
                class="grid grid-cols-3 gap-4 bg-green-200 relative overflow-hidden"
              >
                <div class="col-span-2 z-10">
                  <div class="p-5 sm:p-16 opacity-65">
                    <div
                      class="inline-flex items-center gap-3 bg-green-300 text-green-600 pr-4 p-1 rounded-full text-xs sm:text-sm"
                    >
                      <span
                        class="bg-green-600 px-3 py-1 max-sm:ml-1 rounded-full text-white text-xs"
                        >TOP</span
                      >
                      Exclusive sunglasses
                    </div>
                    <h2
                      class="text-3xl font-semibold sm:text-5xl leading-[1.2] my-3 bg-gradient-to-r from-slate-600 to-green-400 bg-clip-text text-transparent max-w-xs sm:max-w-md"
                    >
                      PROTECT THE SUN LIGHT
                    </h2>
                    <NuxtLink to="/mens-sunglasses">
                      <button
                        class="bg-slate-800 text-white text-sm py-2.5 px-7 sm:py-5 sm:px-12 mt-4 sm:mt-10 rounded-md hover:bg-slate-900 hover:scale-103 active:scale-95 transition"
                      >
                        SHOP COLLECTION
                      </button>
                    </NuxtLink>
                  </div>
                </div>
                <div class="relative">
                  <NuxtImg
                    class="absolute bottom-0 right-0 md:right-10 w-2/3 sm:max-w-sm z-0"
                    :src="getAppwriteAssetUrl('696b9784003cb1acd283')"
                    alt=""
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </a-carousel>
      <template #fallback>
        <div class="flex items-center justify-center">
          <SkeletonCarousal />
        </div>
      </template>
    </ClientOnly>
  </section>
</template>

<style scoped>
.embla {
  --slide-spacing: 0rem;
  --slide-size: 100%;
}
.embla__slide {
  transform: translate3d(0, 0, 0);
  flex: 0 0 var(--slide-size);
  min-width: 0;
  padding-left: var(--slide-spacing);
}
.embla__slide__number {
  border-radius: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}
:deep(.slick-slide) {
  overflow: hidden;
}
</style>
