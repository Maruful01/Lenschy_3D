<script setup lang="ts">
interface Stat {
  label: string
  value: string
  icon: string
  color: string
  bg: string
}

interface Order {
  id: number
  invoice: string
  customer: string
  date: string
  total: number
  status: string
}

interface Product {
  id: number
  name: string
  price: number
  stock: number
  sales: number
  status: string
}

defineProps<{
  stats: Stat[]
  orders: Order[]
  products: Product[]
}>()

defineEmits<{
  (e: 'navigate', tab: string): void
}>()
</script>

<template>
  <div class="max-w-[1600px] mx-auto space-y-8 animate-in duration-500">
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      <div v-for="stat in stats" :key="stat.label" class="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 group">
        <div class="flex justify-between items-start">
          <div class="space-y-1">
            <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">{{ stat.label }}</p>
            <h3 class="text-2xl lg:text-3xl font-black text-gray-800 tracking-tighter">{{ stat.value }}</h3>
          </div>
          <div :class="[stat.bg, stat.color]" class="p-3.5 rounded-2xl group-hover:scale-110 transition-transform duration-300">
            <UIcon :name="stat.icon" class="w-6 h-6 lg:w-7 lg:h-7" />
          </div>
        </div>
        <div class="mt-6 flex items-center gap-2 text-[10px] font-black px-2 py-1.5 bg-green-50 rounded-lg w-fit text-green-600 border border-green-100 uppercase tracking-wider">
          <UIcon name="i-heroicons-arrow-trending-up" class="w-3.5 h-3.5" /> <span>+12.5% vs last month</span>
        </div>
      </div>
    </div>

    <!-- Main Dashboard Grid -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
      <!-- Recent Orders -->
      <div class="xl:col-span-2 bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div class="p-6 lg:p-8 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-2 h-6 bg-[#fc1919] rounded-full"></div>
            <h3 class="font-black text-gray-800 text-lg uppercase tracking-tight">Recent Orders</h3>
          </div>
          <button @click="$emit('navigate', 'orders')" class="text-[10px] font-black text-[#fc1919] uppercase tracking-widest hover:underline underline-offset-4">View All</button>
        </div>

        <div class="overflow-x-auto flex-1 custom-scrollbar">
          <table class="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr class="bg-gray-50/30 border-b border-gray-100">
                <th class="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice</th>
                <th class="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                <th class="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Date</th>
                <th class="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total</th>
                <th class="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="order in orders" :key="order.id" class="hover:bg-gray-50/50 transition-colors group">
                <td class="px-8 py-6"><span class="font-black text-xs text-[#fc1919] bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 tracking-tighter">{{ order.invoice }}</span></td>
                <td class="px-8 py-6">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-200 shadow-inner">
                      {{ order.customer.split(' ').map((n: string) => n[0]).join('') }}
                    </div>
                    <span class="font-black text-gray-800 text-sm tracking-tight">{{ order.customer }}</span>
                  </div>
                </td>
                <td class="px-8 py-6 text-center text-[11px] font-bold text-gray-500 uppercase tracking-tighter">{{ order.date }}</td>
                <td class="px-8 py-6 text-right font-black text-gray-800 text-sm tracking-tighter">Rp {{ order.total.toLocaleString() }}</td>
                <td class="px-8 py-6 text-center">
                  <span class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border" :class="{'bg-blue-50 text-blue-700 border-blue-100': order.status === 'New', 'bg-orange-50 text-orange-700 border-orange-100': order.status === 'Processing', 'bg-green-50 text-green-700 border-green-100': order.status === 'Shipped'}">
                    {{ order.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Top Selling -->
      <div class="bg-white rounded-[32px] border border-gray-200 shadow-sm p-6 lg:p-8 flex flex-col">
        <div class="flex items-center gap-3 mb-8">
          <div class="w-2 h-6 bg-orange-400 rounded-full"></div>
          <h3 class="font-black text-gray-800 text-lg uppercase tracking-tight">Top Selling</h3>
        </div>
        <div class="space-y-6 flex-1">
          <div v-for="(product, idx) in products.slice(0, 4)" :key="product.id" class="flex items-center gap-4 p-4 rounded-2xl border border-transparent hover:border-gray-100 hover:bg-gray-50/50 transition-all group">
            <div class="relative">
              <div class="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-[#fc1919] border border-gray-100 shadow-inner group-hover:rotate-6 transition-transform">
                <UIcon name="i-heroicons-photo" class="w-7 h-7" />
              </div>
              <div class="absolute -top-2 -left-2 w-6 h-6 bg-black text-white text-[10px] font-black rounded-lg flex items-center justify-center border-2 border-white shadow-md">
                {{ idx + 1 }}
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-black text-gray-800 truncate text-sm leading-tight tracking-tight">{{ product.name }}</p>
              <p class="text-[10px] text-gray-400 font-black uppercase mt-1 tracking-widest">{{ product.sales }} Sales</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-black text-[#fc1919] tracking-tighter">Rp {{ (product.sales * product.price).toLocaleString() }}</p>
            </div>
          </div>
        </div>
        <button @click="$emit('navigate', 'products')" class="w-full mt-10 py-5 rounded-2xl border-2 border-dashed border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:border-[#fc1919] hover:text-[#fc1919] hover:bg-red-50/50 transition-all duration-300">
          Manage Catalog
        </button>
      </div>
    </div>
  </div>
</template>
