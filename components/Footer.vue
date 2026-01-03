<template>
  <footer class="bg-white">
    <!-- Footer Top -->
    <div class="w-full border-t border-b border-[#e1e3e5] py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10"
        >
          <!-- Logo and Description -->
          <div>
            <div
              class="mb-6 flex items-center gap-2 text-2xl font-semibold text-black"
            >
              <!-- <span class="text-[#029fae]"> </span>
              Shild your vision -->
            </div>
            <p class="text-gray-700 text-sm mb-4 max-w-xs">
              Follow us on social media
            </p>
            <div class="flex gap-3">
              <a href="#" class="p-2 border border-[#007580] rounded-full">
                <facebook-outlined class="w-5 h-5 text-[#007580]" />
              </a>
              <a href="#" class="p-2">
                <twitter-outlined class="w-5 h-5 text-[#007580]" />
              </a>
              <a href="#" class="p-2">
                <instagram-outlined class="w-5 h-5 text-[#007580]" />
              </a>
              <a href="#" class="p-2">
                <youtube-outlined class="w-5 h-5 text-[#007580]" />
              </a>
            </div>
          </div>

          <!-- Category -->
          <div>
            <h3 class="text-lg font-medium text-[#9a9caa] uppercase mb-4">
              Category
            </h3>
            <ul class="space-y-2 text-sm text-[#272343]">
              <li><router-link to="#">Best for Progressive</router-link></li>
              <li><router-link to="#">Men's Progressives</router-link></li>
              <li><router-link to="#">Women's Progressives</router-link></li>
              <li><router-link to="#">Kids's Progressives</router-link></li>
              <li>
                <router-link to="#"
                  >Best for Progressive Sunglasses</router-link
                >
              </li>
              <li><router-link to="#"> Lenses</router-link></li>
              <li><router-link to="#">Accessories</router-link></li>
            </ul>
          </div>

          <!-- Support -->
          <div>
            <h3 class="text-lg font-medium text-[#9a9caa] uppercase mb-4">
              Support
            </h3>
            <ul class="space-y-2 text-sm text-[#272343]">
              <li><router-link to="#">Help & Support</router-link></li>
              <li><router-link to="#">Terms & Conditions</router-link></li>
              <li><router-link to="#">Privacy Policy</router-link></li>
              <li><router-link to="#">Help</router-link></li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Bottom -->
    <div class="w-full py-4 bg-gray-50">
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center"
      >
        <p class="text-sm text-[#9a9caa]">
          @COPYRIGHT 2024 <span class="text-[#272343]">LENCHY</span> ®, INC. ALL
          RIGHTS RESERVED.
        </p>
        <div class="flex items-center gap-4 mt-2 md:mt-0">
          <p class="flex items-center gap-1 text-[#9a9caa] text-sm">
            Bank Note
          </p>
          <p class="flex items-center gap-1 text-[#9a9caa] text-sm">
            Credit Card <credit-card-outlined class="w-5 h-5" />
          </p>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup></script>
