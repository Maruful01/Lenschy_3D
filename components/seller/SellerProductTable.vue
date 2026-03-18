<script setup lang="ts">
import { computed } from 'vue'

interface Product {
  id: number
  name: string
  price: number
  stock: number
  sales: number
  status: string
}

const props = defineProps<{
  products: Product[]
  searchQuery: string
}>()

defineEmits<{
  (e: 'update:searchQuery', value: string): void
  (e: 'openAddProduct'): void
  (e: 'editProduct', product: Product): void
  (e: 'deleteProduct', id: number): void
}>()

const filteredProducts = computed(() => {
  if (!props.searchQuery) return props.products
  return props.products.filter(p =>
    p.name.toLowerCase().includes(props.searchQuery.toLowerCase())
  )
})
</script>

<template>
  <div class="space-y-6 animate-in duration-500 pb-12">
    <!-- Controls -->
    <div class="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white p-5 rounded-[28px] border border-gray-200 shadow-sm sticky top-0 z-10">
      <div class="relative flex-1 max-w-md group">
        <UIcon name="i-heroicons-magnifying-glass" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#fc1919] transition-colors" />
        <input
          :value="searchQuery"
          @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Search by product name..."
          class="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#fc1919]/5 focus:border-[#fc1919] transition-all font-bold text-sm text-gray-800"
        >
      </div>
      <button @click="$emit('openAddProduct')" class="flex items-center justify-center gap-3 px-8 py-4 bg-[#fc1919] text-white font-black rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-100 hover:shadow-red-200 hover:-translate-y-1 active:translate-y-0 uppercase text-[10px] tracking-widest shrink-0">
        <UIcon name="i-heroicons-plus-circle" class="w-5 h-5" /> Add New Product
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto custom-scrollbar">
        <table class="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr class="bg-gray-50/50 border-b border-gray-100">
              <th class="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Details</th>
              <th class="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Price</th>
              <th class="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock</th>
              <th class="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sales</th>
              <th class="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
              <th class="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="product in filteredProducts" :key="product.id" class="hover:bg-gray-50/50 transition-all group">
              <td class="px-8 py-6">
                <div class="flex items-center gap-4">
                  <div class="w-16 h-16 bg-gray-100 rounded-2xl flex-shrink-0 flex items-center justify-center text-[#fc1919] border border-gray-200 shadow-inner group-hover:scale-105 transition-transform duration-300">
                    <UIcon name="i-heroicons-photo" class="w-8 h-8 opacity-70" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <span class="font-black text-gray-800 text-sm group-hover:text-[#fc1919] transition-colors tracking-tight">{{ product.name }}</span>
                    <span class="text-[10px] text-gray-400 font-black uppercase tracking-tighter bg-gray-50 px-2 py-0.5 rounded-md w-fit">SKU-{{ 1000 + product.id }}</span>
                  </div>
                </div>
              </td>
              <td class="px-8 py-6 font-black text-gray-800 text-sm tracking-tighter">Rp {{ product.price.toLocaleString() }}</td>
              <td class="px-8 py-6">
                <div class="flex items-center gap-2.5">
                  <div class="w-2 h-2 rounded-full" :class="product.stock < 5 ? 'bg-red-500 animate-pulse' : 'bg-green-500'"></div>
                  <span class="text-xs font-black uppercase tracking-tight" :class="product.stock < 5 ? 'text-red-600' : 'text-gray-600'">{{ product.stock }} units</span>
                </div>
              </td>
              <td class="px-8 py-6 font-black text-xs text-gray-500 uppercase tracking-widest">{{ product.sales }} sold</td>
              <td class="px-8 py-6 text-center">
                <span class="px-3.5 py-1.5 bg-green-50 text-green-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-green-100">{{ product.status }}</span>
              </td>
              <td class="px-8 py-6 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button @click="$emit('editProduct', product)" class="p-3 rounded-2xl text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all active:scale-90" title="Edit"><UIcon name="i-heroicons-pencil-square" class="w-5 h-5" /></button>
                  <button @click="$emit('deleteProduct', product.id)" class="p-3 rounded-2xl text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all active:scale-90" title="Delete"><UIcon name="i-heroicons-trash" class="w-5 h-5" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredProducts.length === 0">
              <td colspan="6" class="px-8 py-24 text-center">
                <div class="flex flex-col items-center gap-4">
                  <div class="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center border border-gray-100 shadow-inner">
                    <UIcon name="i-heroicons-magnifying-glass" class="w-10 h-10 text-gray-200" />
                  </div>
                  <p class="text-gray-400 font-black uppercase text-[10px] tracking-[0.2em]">No matches found for your search</p>
                  <button @click="$emit('update:searchQuery', '')" class="text-xs text-[#fc1919] font-black uppercase tracking-widest hover:underline underline-offset-8">Reset Search</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="p-8 border-t border-gray-50 bg-gray-50/20 flex flex-col md:flex-row items-center justify-between gap-6">
        <span class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Displaying {{ filteredProducts.length }} of {{ products.length }} items</span>
        <div class="flex items-center gap-2">
          <button class="w-12 h-12 rounded-2xl border border-gray-200 flex items-center justify-center text-gray-300 cursor-not-allowed"><UIcon name="i-heroicons-chevron-left" class="w-5 h-5" /></button>
          <button class="w-12 h-12 rounded-2xl bg-[#fc1919] text-white flex items-center justify-center text-xs font-black shadow-xl shadow-red-100">1</button>
          <button class="w-12 h-12 rounded-2xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-white hover:text-[#fc1919] hover:border-[#fc1919] text-xs font-black transition-all">2</button>
          <button class="w-12 h-12 rounded-2xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-white hover:text-[#fc1919] hover:border-[#fc1919] transition-all"><UIcon name="i-heroicons-chevron-right" class="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  </div>
</template>
