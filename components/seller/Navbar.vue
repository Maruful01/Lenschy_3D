<script setup lang="ts">
defineProps<{
  pageTitle: string
  sellerName: string
  userId: string
}>()

defineEmits<{
  (e: 'toggleMobileSidebar'): void
  (e: 'toggleSidebar'): void
  (e: 'logout'): void
}>()
</script>

<template>
  <header class="bg-white border-b border-gray-200 h-[72px] flex items-center justify-between px-4 lg:px-8 z-20 shrink-0">
    <div class="flex items-center gap-4">
      <button @click="$emit('toggleMobileSidebar')" class="lg:hidden p-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
        <UIcon name="i-heroicons-bars-3" class="w-6 h-6 text-gray-700" />
      </button>
      <button @click="$emit('toggleSidebar')" class="hidden lg:block p-2 rounded-lg hover:bg-gray-100 transition-colors">
        <UIcon name="i-heroicons-bars-3" class="w-6 h-6 text-gray-700" />
      </button>
      <div class="flex flex-col">
        <h1 class="text-base lg:text-lg font-black text-gray-800 uppercase tracking-tight leading-none">{{ pageTitle }}</h1>
        <div class="flex items-center gap-2 mt-1.5 lg:hidden">
          <div class="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          <p class="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{{ sellerName }}</p>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-3 lg:gap-6">
      <div class="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
        <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
        <span class="text-[10px] font-black text-green-700 uppercase tracking-widest">Store Active</span>
      </div>

      <div class="h-6 w-px bg-gray-200 hidden sm:block"></div>

      <div class="dropdown dropdown-end">
        <label tabindex="0" class="flex items-center gap-3 cursor-pointer group p-1 rounded-xl transition-colors">
          <div class="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-red-100 flex items-center justify-center text-[#fc1919] font-black shadow-inner shrink-0 group-hover:scale-95 transition-transform">
            {{ sellerName.charAt(0) }}
          </div>
          <div class="hidden sm:block text-left max-w-[150px]">
            <p class="text-sm font-black text-gray-800 truncate group-hover:text-[#fc1919] transition-colors leading-none">{{ sellerName }}</p>
            <p class="text-[10px] text-gray-400 font-bold tracking-tight mt-1">UID: {{ userId }}</p>
          </div>
          <UIcon name="i-heroicons-chevron-down" class="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors hidden sm:block" />
        </label>
        <ul tabindex="0" class="mt-3 z-[1] p-2 shadow-2xl menu menu-sm dropdown-content bg-base-100 rounded-2xl w-60 border border-gray-100 animate-in duration-200">
          <li class="p-3 border-b border-gray-50 bg-gray-50/50 rounded-t-xl mb-2">
            <div class="flex flex-col gap-0.5">
              <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Signed in as</span>
              <span class="font-black text-gray-800 text-sm truncate">{{ sellerName }}</span>
            </div>
          </li>
          <li><a class="py-2.5 rounded-lg hover:bg-red-50 hover:text-[#fc1919] transition-colors font-bold text-xs uppercase tracking-widest"><UIcon name="i-heroicons-user" class="w-4 h-4" /> Profile</a></li>
          <li><a class="py-2.5 rounded-lg hover:bg-red-50 hover:text-[#fc1919] transition-colors font-bold text-xs uppercase tracking-widest"><UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4" /> Settings</a></li>
          <div class="h-px bg-gray-100 my-2"></div>
          <li><a @click="$emit('logout')" class="py-2.5 rounded-lg text-red-600 font-black hover:bg-red-50 transition-colors text-xs uppercase tracking-widest"><UIcon name="i-heroicons-arrow-left-on-rectangle" class="w-4 h-4" /> Logout</a></li>
        </ul>
      </div>
    </div>
  </header>
</template>
