<template>
  <section class="mx-auto max-w-sm md:max-w-3xl lg:max-w-7xl">
    <div class="relative z-5 py-8 backdrop-blur-md overflow-hidden w-full">
      <div
        class="flex items-center space-x-10 sm:space-x-16 animate-marquee whitespace-nowrap text-sm sm:text-xl md:text-xl font-mono"
      >
        <span class="text-[#00f7ff]">Quantum Computing</span>
        <span class="text-[#ff00f7]">Neural Networks</span>
        <span class="text-[#c400ff]">Blockchain</span>
        <span class="text-[#00f7ff]">AI/ML</span>
        <span class="text-[#ff00f7]">Web3</span>
        <span class="text-[#c400ff]">AR/VR</span>
        <span class="text-[#00f7ff]">IoT</span>
        <span class="text-[#ff00f7]">5G</span>
        <span class="text-[#c400ff]">Edge Computing</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.animate-marquee {
  animation: marquee 30s linear infinite;
}
@keyframes marquee {
  0% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(-50%);
  }
}
</style>
