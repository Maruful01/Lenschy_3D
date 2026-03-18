<script setup lang="ts">
defineProps<{
  currentTab: string
  isSidebarCollapsed: boolean
  isMobileSidebarOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'update:currentTab', tab: string): void
  (e: 'update:isMobileSidebarOpen', value: boolean): void
  (e: 'logout'): void
  (e: 'openAddProduct'): void
}>()

const navigate = (tab: string) => {
  emit('update:currentTab', tab)
  emit('update:isMobileSidebarOpen', false)
}

const openAddProduct = () => {
  emit('openAddProduct')
}
</script>

<template>
  <div>
    <!-- Desktop Sidebar -->
    <aside
      class="hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 z-30 shrink-0 h-screen sticky top-0"
      :class="[isSidebarCollapsed ? 'w-20' : 'w-64']"
    >
      <div class="p-6 flex items-center gap-3 border-b border-gray-100 h-[72px] shrink-0">
        <div class="w-10 h-10 bg-[#fc1919] rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm shadow-red-100">
          <UIcon name="i-heroicons-building-storefront" class="w-6 h-6 text-white" />
        </div>
        <div v-if="!isSidebarCollapsed" class="overflow-hidden whitespace-nowrap">
          <h2 class="font-black text-gray-800 tracking-tight">EVDesign</h2>
          <p class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Seller Panel</p>
        </div>
      </div>

      <nav class="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        <button
          @click="navigate('dashboard')"
          class="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative"
          :class="[currentTab === 'dashboard' ? 'bg-red-50 text-[#fc1919] font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800']"
        >
          <UIcon name="i-heroicons-home" class="w-5 h-5 shrink-0" />
          <span v-if="!isSidebarCollapsed" class="text-sm whitespace-nowrap">Dashboard</span>
          <div v-if="currentTab === 'dashboard' && !isSidebarCollapsed" class="absolute left-0 w-1 h-6 bg-[#fc1919] rounded-r-full"></div>
        </button>

        <button
          @click="navigate('products')"
          class="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative"
          :class="[currentTab === 'products' ? 'bg-red-50 text-[#fc1919] font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800']"
        >
          <UIcon name="i-heroicons-shopping-bag" class="w-5 h-5 shrink-0" />
          <span v-if="!isSidebarCollapsed" class="text-sm whitespace-nowrap">Products</span>
          <div v-if="currentTab === 'products' && !isSidebarCollapsed" class="absolute left-0 w-1 h-6 bg-[#fc1919] rounded-r-full"></div>
        </button>

        <button
          @click="openAddProduct"
          class="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group text-gray-500 hover:bg-gray-50 hover:text-gray-800"
        >
          <UIcon name="i-heroicons-plus-circle" class="w-5 h-5 shrink-0" />
          <span v-if="!isSidebarCollapsed" class="text-sm whitespace-nowrap">Add Product</span>
        </button>

        <button
          @click="navigate('orders')"
          class="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative"
          :class="[currentTab === 'orders' ? 'bg-red-50 text-[#fc1919] font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800']"
        >
          <UIcon name="i-heroicons-shopping-cart" class="w-5 h-5 shrink-0" />
          <span v-if="!isSidebarCollapsed" class="text-sm whitespace-nowrap">Orders</span>
          <div v-if="currentTab === 'orders' && !isSidebarCollapsed" class="absolute left-0 w-1 h-6 bg-[#fc1919] rounded-r-full"></div>
        </button>

        <button
          @click="navigate('analytics')"
          class="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative"
          :class="[currentTab === 'analytics' ? 'bg-red-50 text-[#fc1919] font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800']"
        >
          <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 shrink-0" />
          <span v-if="!isSidebarCollapsed" class="text-sm whitespace-nowrap">Analytics</span>
          <div v-if="currentTab === 'analytics' && !isSidebarCollapsed" class="absolute left-0 w-1 h-6 bg-[#fc1919] rounded-r-full"></div>
        </button>
      </nav>

      <div class="p-4 border-t border-gray-100 shrink-0">
        <button
          @click="$emit('logout')"
          class="w-full flex items-center gap-3 p-3.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-bold text-sm"
        >
          <UIcon name="i-heroicons-arrow-left-on-rectangle" class="w-5 h-5 shrink-0" />
          <span v-if="!isSidebarCollapsed">Logout</span>
        </button>
      </div>
    </aside>

    <!-- Mobile Sidebar Drawer -->
    <div
      v-if="isMobileSidebarOpen"
      class="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
      @click="$emit('update:isMobileSidebarOpen', false)"
    ></div>

    <aside
      class="fixed top-0 left-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 ease-in-out lg:hidden shadow-2xl"
      :class="[isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full']"
    >
      <div class="p-6 flex items-center gap-3 border-b border-gray-100 h-[72px]">
        <div class="w-10 h-10 bg-[#fc1919] rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-200">
          <UIcon name="i-heroicons-building-storefront" class="w-6 h-6 text-white" />
        </div>
        <div class="flex-1">
          <h2 class="font-black text-gray-800 tracking-tight">EVDesign</h2>
          <p class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Seller Panel</p>
        </div>
        <button @click="$emit('update:isMobileSidebarOpen', false)" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <UIcon name="i-heroicons-x-mark" class="w-6 h-6 text-gray-500" />
        </button>
      </div>

      <nav class="p-4 space-y-1 overflow-y-auto h-[calc(100%-144px)] custom-scrollbar">
        <button @click="navigate('dashboard')" class="w-full flex items-center gap-4 p-4 rounded-xl transition-all" :class="[currentTab === 'dashboard' ? 'bg-red-50 text-[#fc1919] font-bold shadow-sm' : 'text-gray-600 hover:bg-gray-50']">
          <UIcon name="i-heroicons-home" class="w-6 h-6" /> <span>Dashboard</span>
        </button>
        <button @click="navigate('products')" class="w-full flex items-center gap-4 p-4 rounded-xl transition-all" :class="[currentTab === 'products' ? 'bg-red-50 text-[#fc1919] font-bold shadow-sm' : 'text-gray-600 hover:bg-gray-50']">
          <UIcon name="i-heroicons-shopping-bag" class="w-6 h-6" /> <span>Products</span>
        </button>
        <button @click="openAddProduct" class="w-full flex items-center gap-4 p-4 rounded-xl transition-all text-gray-600 hover:bg-gray-50">
          <UIcon name="i-heroicons-plus-circle" class="w-6 h-6" /> <span>Add Product</span>
        </button>
        <button @click="navigate('orders')" class="w-full flex items-center gap-4 p-4 rounded-xl transition-all" :class="[currentTab === 'orders' ? 'bg-red-50 text-[#fc1919] font-bold shadow-sm' : 'text-gray-600 hover:bg-gray-50']">
          <UIcon name="i-heroicons-shopping-cart" class="w-6 h-6" /> <span>Orders</span>
        </button>
        <button @click="navigate('analytics')" class="w-full flex items-center gap-4 p-4 rounded-xl transition-all" :class="[currentTab === 'analytics' ? 'bg-red-50 text-[#fc1919] font-bold shadow-sm' : 'text-gray-600 hover:bg-gray-50']">
          <UIcon name="i-heroicons-chart-bar" class="w-6 h-6" /> <span>Analytics</span>
        </button>
      </nav>

      <div class="p-4 border-t border-gray-100 absolute bottom-0 w-full bg-white">
        <button @click="$emit('logout')" class="w-full flex items-center gap-4 p-4 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-black uppercase text-xs tracking-widest">
          <UIcon name="i-heroicons-arrow-left-on-rectangle" class="w-6 h-6" /> <span>Logout</span>
        </button>
      </div>
    </aside>
  </div>
</template>
