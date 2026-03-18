<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

definePageMeta({
  layout: false // Custom dashboard layout
})

const route = useRoute()
const router = useRouter()
const userId = route.params.slug as string

// Sidebar & Navigation State
const currentTab = ref('dashboard')
const isSidebarCollapsed = ref(false)
const isMobileSidebarOpen = ref(false)

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

const toggleMobileSidebar = () => {
  isMobileSidebarOpen.value = !isMobileSidebarOpen.value
}

// Mock Data State
const sellerName = ref('EVDesign Seller')
const searchQuery = ref('')

const stats = reactive([
  { label: 'Total Products', value: '124', icon: 'i-heroicons-shopping-bag', color: 'text-red-600', bg: 'bg-red-50' },
  { label: 'Total Orders', value: '56', icon: 'i-heroicons-shopping-cart', color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Total Sales', value: '$45.8k', icon: 'i-heroicons-banknotes', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Revenue', value: '$12.4k', icon: 'i-heroicons-presentation-chart-line', color: 'text-orange-600', bg: 'bg-orange-50' }
])

const products = ref([
  { id: 1, name: 'Premium Karawo Shirt', price: 450, stock: 24, sales: 12, status: 'Active' },
  { id: 2, name: 'Padi Motif Shawl', price: 280, stock: 18, sales: 8, status: 'Active' },
  { id: 3, name: 'Elegant Karawo Blouse', price: 380, stock: 12, sales: 5, status: 'Active' },
  { id: 4, name: 'Karawo Handbag', price: 320, stock: 8, sales: 3, status: 'Active' },
  { id: 5, name: 'Traditional Karawo Sarong', price: 420, stock: 3, sales: 10, status: 'Active' },
])

const filteredProducts = computed(() => {
  if (!searchQuery.value) return products.value
  return products.value.filter(p =>
    p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const orders = ref([
  { id: 1, invoice: '#INV-056', customer: 'Ahmad Budi', date: '15 Jan 2024', total: 900, status: 'New' },
  { id: 2, invoice: '#INV-055', customer: 'Sari Dewi', date: '14 Jan 2024', total: 560, status: 'Processing' },
  { id: 3, invoice: '#INV-054', customer: 'Hendra Wijaya', date: '14 Jan 2024', total: 1250, status: 'Shipped' },
])

// Modal State
const isAddProductModalOpen = ref(false)
const isEditProductModalOpen = ref(false)
const editingProduct = ref<any>(null)

const newProduct = reactive({
  name: '',
  price: 0,
  stock: 0,
  status: 'Active'
})

// Actions logic
const addProduct = () => {
  if (!newProduct.name || newProduct.price <= 0) {
    alert('Please fill in all required fields.')
    return
  }
  products.value.push({
    id: Date.now(),
    ...newProduct,
    sales: 0
  })
  isAddProductModalOpen.value = false
  newProduct.name = ''
  newProduct.price = 0
  newProduct.stock = 0
}

const openEditModal = (product: any) => {
  editingProduct.value = { ...product }
  isEditProductModalOpen.value = true
}

const updateProduct = () => {
  if (!editingProduct.value.name || editingProduct.value.price <= 0) {
    alert('Please fill in all required fields.')
    return
  }
  const index = products.value.findIndex(p => p.id === editingProduct.value.id)
  if (index !== -1) {
    products.value[index] = { ...editingProduct.value }
  }
  isEditProductModalOpen.value = false
}

const deleteProduct = (id: number) => {
  if (confirm('Are you sure you want to delete this product?')) {
    products.value = products.value.filter(p => p.id !== id)
  }
}

const logout = () => {
  router.push('/seller/account')
}

const navigate = (tab: string) => {
  currentTab.value = tab
  isMobileSidebarOpen.value = false
}

const openAddProduct = () => {
  currentTab.value = 'products'
  isAddProductModalOpen.value = true
  isMobileSidebarOpen.value = false
}

const pageTitle = computed(() => {
  switch (currentTab.value) {
    case 'dashboard': return 'Seller Dashboard'
    case 'products': return 'Product Management'
    case 'orders': return 'Order History'
    case 'analytics': return 'Analytics Overview'
    default: return 'Dashboard'
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex overflow-hidden font-sans antialiased text-gray-900">
    <!-- Desktop Sidebar -->
    <aside
      class="hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 z-30 shrink-0"
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
          @click="logout"
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
      @click="isMobileSidebarOpen = false"
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
        <button @click="isMobileSidebarOpen = false" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
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
        <button @click="logout" class="w-full flex items-center gap-4 p-4 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-black uppercase text-xs tracking-widest">
          <UIcon name="i-heroicons-arrow-left-on-rectangle" class="w-6 h-6" /> <span>Logout</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
      <!-- Navbar -->
      <header class="bg-white border-b border-gray-200 h-[72px] flex items-center justify-between px-4 lg:px-8 z-20 shrink-0">
        <div class="flex items-center gap-4">
          <button @click="toggleMobileSidebar" class="lg:hidden p-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">
            <UIcon name="i-heroicons-bars-3" class="w-6 h-6 text-gray-700" />
          </button>
          <button @click="toggleSidebar" class="hidden lg:block p-2 rounded-lg hover:bg-gray-100 transition-colors">
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
            <ul tabindex="0" class="mt-3 z-[1] p-2 shadow-2xl menu menu-sm dropdown-content bg-base-100 rounded-2xl w-60 border border-gray-100 animate-in slide-in-from-top-2 duration-200">
              <li class="p-3 border-b border-gray-50 bg-gray-50/50 rounded-t-xl mb-2">
                <div class="flex flex-col gap-0.5">
                  <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Signed in as</span>
                  <span class="font-black text-gray-800 text-sm truncate">{{ sellerName }}</span>
                </div>
              </li>
              <li><a class="py-2.5 rounded-lg hover:bg-red-50 hover:text-[#fc1919] transition-colors font-bold text-xs uppercase tracking-widest"><UIcon name="i-heroicons-user" class="w-4 h-4" /> Profile</a></li>
              <li><a class="py-2.5 rounded-lg hover:bg-red-50 hover:text-[#fc1919] transition-colors font-bold text-xs uppercase tracking-widest"><UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4" /> Settings</a></li>
              <div class="h-px bg-gray-100 my-2"></div>
              <li><a @click="logout" class="py-2.5 rounded-lg text-red-600 font-black hover:bg-red-50 transition-colors text-xs uppercase tracking-widest"><UIcon name="i-heroicons-arrow-left-on-rectangle" class="w-4 h-4" /> Logout</a></li>
            </ul>
          </div>
        </div>
      </header>

      <!-- Scrollable Content -->
      <main class="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar bg-gray-50/50">
        <div class="max-w-[1600px] mx-auto">
          <!-- Dashboard Content -->
          <div v-if="currentTab === 'dashboard'" class="space-y-8 animate-in duration-500">
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

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
              <div class="xl:col-span-2 bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                <div class="p-6 lg:p-8 border-b border-gray-100 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-2 h-6 bg-[#fc1919] rounded-full"></div>
                    <h3 class="font-black text-gray-800 text-lg uppercase tracking-tight">Recent Orders</h3>
                  </div>
                  <button @click="navigate('orders')" class="text-[10px] font-black text-[#fc1919] uppercase tracking-widest hover:underline underline-offset-4">View All</button>
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
                              {{ order.customer.split(' ').map(n => n[0]).join('') }}
                            </div>
                            <span class="font-black text-gray-800 text-sm tracking-tight">{{ order.customer }}</span>
                          </div>
                        </td>
                        <td class="px-8 py-6 text-center text-[11px] font-bold text-gray-500 uppercase tracking-tighter">{{ order.date }}</td>
                        <td class="px-8 py-6 text-right font-black text-gray-800 text-sm tracking-tighter">${{ order.total.toLocaleString() }}</td>
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
                      <p class="text-sm font-black text-[#fc1919] tracking-tighter">${{ (product.sales * product.price).toLocaleString() }}</p>
                    </div>
                  </div>
                </div>
                <button @click="navigate('products')" class="w-full mt-10 py-5 rounded-2xl border-2 border-dashed border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:border-[#fc1919] hover:text-[#fc1919] hover:bg-red-50/50 transition-all duration-300">
                  Manage Catalog
                </button>
              </div>
            </div>
          </div>

          <!-- Products Content -->
          <div v-if="currentTab === 'products'" class="space-y-6 animate-in duration-500 pb-12">
            <div class="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white p-5 rounded-[28px] border border-gray-200 shadow-sm sticky top-0 z-10">
              <div class="relative flex-1 max-w-md group">
                <UIcon name="i-heroicons-magnifying-glass" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#fc1919] transition-colors" />
                <input v-model="searchQuery" type="text" placeholder="Search by product name..." class="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#fc1919]/5 focus:border-[#fc1919] transition-all font-bold text-sm text-gray-800">
              </div>
              <button @click="isAddProductModalOpen = true" class="flex items-center justify-center gap-3 px-8 py-4 bg-[#fc1919] text-white font-black rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-100 hover:shadow-red-200 hover:-translate-y-1 active:translate-y-0 uppercase text-[10px] tracking-widest shrink-0">
                <UIcon name="i-heroicons-plus-circle" class="w-5 h-5" /> Add New Product
              </button>
            </div>

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
                      <td class="px-8 py-6 font-black text-gray-800 text-sm tracking-tighter">${{ product.price.toLocaleString() }}</td>
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
                          <button @click="openEditModal(product)" class="p-3 rounded-2xl text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all active:scale-90" title="Edit"><UIcon name="i-heroicons-pencil-square" class="w-5 h-5" /></button>
                          <button @click="deleteProduct(product.id)" class="p-3 rounded-2xl text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all active:scale-90" title="Delete"><UIcon name="i-heroicons-trash" class="w-5 h-5" /></button>
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
                          <button @click="searchQuery = ''" class="text-xs text-[#fc1919] font-black uppercase tracking-widest hover:underline underline-offset-8">Reset Search</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

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

          <!-- Placeholders -->
          <div v-if="currentTab === 'orders' || currentTab === 'analytics'" class="py-12 lg:py-24 max-w-2xl mx-auto text-center animate-in zoom-in-95 duration-500">
             <div class="w-28 h-28 bg-white rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-2xl border border-gray-50 rotate-6 group hover:rotate-0 transition-transform duration-500">
               <UIcon :name="currentTab === 'orders' ? 'i-heroicons-shopping-cart' : 'i-heroicons-presentation-chart-line'" class="w-14 h-14" :class="currentTab === 'orders' ? 'text-[#fc1919]' : 'text-indigo-600'" />
             </div>
             <h2 class="text-3xl lg:text-4xl font-black text-gray-800 tracking-tighter uppercase">{{ currentTab === 'orders' ? 'Order Pipeline' : 'Market Insights' }}</h2>
             <p class="text-gray-500 mt-6 font-medium leading-relaxed text-sm lg:text-base px-4">We are currently finalising the advanced logic for this module. You will soon be able to manage your business with enterprise-grade tools right here.</p>
             <button @click="navigate('dashboard')" class="mt-12 px-12 py-5 bg-black text-white font-black rounded-[20px] hover:bg-[#fc1919] transition-all shadow-2xl uppercase text-[10px] tracking-[0.25em] active:scale-95">Back to Home</button>
          </div>
        </div>
      </main>
    </div>

    <!-- Modals (Global Level) -->
    <!-- Add Product Modal -->
    <div v-if="isAddProductModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-gray-950/80 backdrop-blur-xl animate-in fade-in duration-300" @click="isAddProductModalOpen = false"></div>
      <div class="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-400 relative border border-gray-100">
        <div class="p-10 border-b border-gray-50 flex items-center justify-between bg-white">
          <div class="flex items-center gap-4">
            <div class="w-2.5 h-10 bg-[#fc1919] rounded-full"></div>
            <h3 class="text-2xl font-black text-gray-800 uppercase tracking-tighter">New Product</h3>
          </div>
          <button @click="isAddProductModalOpen = false" class="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>
        <div class="p-10 space-y-8">
          <div class="form-control">
            <label class="label mb-2"><span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Product Name <span class="text-red-500">*</span></span></label>
            <input v-model="newProduct.name" type="text" placeholder="e.g. Traditional Shawl" class="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[20px] focus:outline-none focus:ring-8 focus:ring-[#fc1919]/5 focus:border-[#fc1919] transition-all font-bold text-gray-800 shadow-inner">
          </div>
          <div class="grid grid-cols-2 gap-8">
            <div class="form-control">
              <label class="label mb-2"><span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Unit Price ($) <span class="text-red-500">*</span></span></label>
              <input v-model.number="newProduct.price" type="number" class="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[20px] focus:outline-none focus:ring-8 focus:ring-[#fc1919]/5 focus:border-[#fc1919] transition-all font-black text-gray-800 shadow-inner">
            </div>
            <div class="form-control">
              <label class="label mb-2"><span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Inventory <span class="text-red-500">*</span></span></label>
              <input v-model.number="newProduct.stock" type="number" class="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[20px] focus:outline-none focus:ring-8 focus:ring-[#fc1919]/5 focus:border-[#fc1919] transition-all font-black text-gray-800 shadow-inner">
            </div>
          </div>
          <div class="form-control">
            <label class="label mb-2"><span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Visibility</span></label>
            <select v-model="newProduct.status" class="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[20px] focus:outline-none focus:ring-8 focus:ring-[#fc1919]/5 focus:border-[#fc1919] transition-all font-black text-gray-800 appearance-none shadow-inner cursor-pointer">
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
        <div class="p-10 bg-gray-50/50 border-t border-gray-50 flex gap-4 justify-end">
          <button @click="isAddProductModalOpen = false" class="px-10 py-5 rounded-[20px] border-2 border-gray-100 font-black text-gray-400 hover:text-gray-600 hover:bg-white transition-all uppercase text-[10px] tracking-widest">Discard</button>
          <button @click="addProduct" class="px-10 py-5 rounded-[20px] bg-[#fc1919] text-white font-black hover:bg-red-700 transition-all shadow-2xl shadow-red-200 hover:-translate-y-1 active:translate-y-0 uppercase text-[10px] tracking-widest">Create Product</button>
        </div>
      </div>
    </div>

    <!-- Edit Product Modal -->
    <div v-if="isEditProductModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-gray-950/80 backdrop-blur-xl animate-in fade-in duration-300" @click="isEditProductModalOpen = false"></div>
      <div class="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-400 relative border border-gray-100">
        <div class="p-10 border-b border-gray-50 flex items-center justify-between bg-white">
          <div class="flex items-center gap-4">
            <div class="w-2.5 h-10 bg-blue-600 rounded-full"></div>
            <h3 class="text-2xl font-black text-gray-800 uppercase tracking-tighter">Edit Product</h3>
          </div>
          <button @click="isEditProductModalOpen = false" class="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>
        <div class="p-10 space-y-8">
          <div class="form-control">
            <label class="label mb-2"><span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Product Name <span class="text-red-500">*</span></span></label>
            <input v-model="editingProduct.name" type="text" class="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[20px] focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-600 transition-all font-bold text-gray-800 shadow-inner">
          </div>
          <div class="grid grid-cols-2 gap-8">
            <div class="form-control">
              <label class="label mb-2"><span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Unit Price ($) <span class="text-red-500">*</span></span></label>
              <input v-model.number="editingProduct.price" type="number" class="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[20px] focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-600 transition-all font-black text-gray-800 shadow-inner">
            </div>
            <div class="form-control">
              <label class="label mb-2"><span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Inventory <span class="text-red-500">*</span></span></label>
              <input v-model.number="editingProduct.stock" type="number" class="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[20px] focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-600 transition-all font-black text-gray-800 shadow-inner">
            </div>
          </div>
          <div class="form-control">
            <label class="label mb-2"><span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Visibility</span></label>
            <select v-model="editingProduct.status" class="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[20px] focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-600 transition-all font-black text-gray-800 appearance-none shadow-inner cursor-pointer">
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
        <div class="p-10 bg-gray-50/50 border-t border-gray-50 flex gap-4 justify-end">
          <button @click="isEditProductModalOpen = false" class="px-10 py-5 rounded-[20px] border-2 border-gray-100 font-black text-gray-400 hover:text-gray-600 hover:bg-white transition-all uppercase text-[10px] tracking-widest">Cancel</button>
          <button @click="updateProduct" class="px-10 py-5 rounded-[20px] bg-blue-600 text-white font-black hover:bg-blue-700 transition-all shadow-2xl shadow-blue-700/20 hover:-translate-y-1 active:translate-y-0 uppercase text-[10px] tracking-widest">Save Changes</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

@keyframes slide-in-bottom {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.animate-in {
  animation: slide-in-bottom 0.5s ease-out forwards;
}
</style>
