<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

definePageMeta({
  layout: false // Custom layout for the dashboard
})

const route = useRoute()
const router = useRouter()
const userId = route.params.slug as string

// Navigation
const currentTab = ref('dashboard')
const isSidebarCollapsed = ref(false)
const isMobileSidebarOpen = ref(false)

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

const toggleMobileSidebar = () => {
  isMobileSidebarOpen.value = !isMobileSidebarOpen.value
}

// Mock Data
const sellerName = ref('EVDesign Seller')
const searchQuery = ref('')

const stats = reactive([
  { label: 'Total Produk', value: '124', icon: 'i-heroicons-shopping-bag', color: 'text-red-600', bg: 'bg-red-50' },
  { label: 'Total Pesanan', value: '56', icon: 'i-heroicons-shopping-cart', color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Total Penjualan', value: 'Rp 45,8Jt', icon: 'i-heroicons-banknotes', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Pendapatan', value: 'Rp 12,4Jt', icon: 'i-heroicons-presentation-chart-line', color: 'text-orange-600', bg: 'bg-orange-50' }
])

const products = ref([
  { id: 1, name: 'Kemeja Karawo Premium', price: 450000, stock: 24, sales: 12, status: 'Aktif' },
  { id: 2, name: 'Selendang Motif Padi', price: 280000, stock: 18, sales: 8, status: 'Aktif' },
  { id: 3, name: 'Blouse Karawo Elegan', price: 380000, stock: 12, sales: 5, status: 'Aktif' },
  { id: 4, name: 'Tas Tangan Karawo', price: 320000, stock: 8, sales: 3, status: 'Aktif' },
  { id: 5, name: 'Sarung Karawo Tradisional', price: 420000, stock: 3, sales: 10, status: 'Aktif' },
])

const filteredProducts = computed(() => {
  if (!searchQuery.value) return products.value
  return products.value.filter(p =>
    p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const orders = ref([
  { id: 1, invoice: '#INV-056', customer: 'Ahmad Budi', date: '15 Jan 2024', total: 900000, status: 'Baru' },
  { id: 2, invoice: '#INV-055', customer: 'Sari Dewi', date: '14 Jan 2024', total: 560000, status: 'Diproses' },
  { id: 3, invoice: '#INV-054', customer: 'Hendra Wijaya', date: '14 Jan 2024', total: 1250000, status: 'Dikirim' },
])

// Modals
const isAddProductModalOpen = ref(false)
const isEditProductModalOpen = ref(false)
const editingProduct = ref<any>(null)

const newProduct = reactive({
  name: '',
  price: 0,
  stock: 0,
  status: 'Aktif'
})

// Actions
const addProduct = () => {
  if (!newProduct.name || newProduct.price <= 0) {
    alert('Harap isi semua bidang yang diperlukan.')
    return
  }
  products.value.push({
    id: Date.now(),
    ...newProduct,
    sales: 0
  })
  isAddProductModalOpen.value = false
  // Reset form
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
    alert('Harap isi semua bidang yang diperlukan.')
    return
  }
  const index = products.value.findIndex(p => p.id === editingProduct.value.id)
  if (index !== -1) {
    products.value[index] = { ...editingProduct.value }
  }
  isEditProductModalOpen.value = false
}

const deleteProduct = (id: number) => {
  if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
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
    case 'dashboard': return 'Dashboard Penjual'
    case 'products': return 'Manajemen Produk'
    case 'orders': return 'Riwayat Pesanan'
    case 'analytics': return 'Ikhtisar Analitik'
    default: return 'Dashboard'
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Desktop Sidebar -->
    <aside
      class="hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 z-30"
      :class="[isSidebarCollapsed ? 'w-20' : 'w-64']"
    >
      <div class="p-6 flex items-center gap-3 border-b border-gray-100 h-[72px]">
        <div class="w-10 h-10 bg-[#fc1919] rounded-lg flex items-center justify-center flex-shrink-0">
          <UIcon name="i-heroicons-building-storefront" class="w-6 h-6 text-white" />
        </div>
        <div v-if="!isSidebarCollapsed" class="overflow-hidden whitespace-nowrap">
          <h2 class="font-bold text-gray-800">EVDesign</h2>
          <p class="text-xs text-gray-500">Panel Penjual</p>
        </div>
      </div>

      <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
        <button
          @click="navigate('dashboard')"
          class="w-full flex items-center gap-3 p-3 rounded-xl transition-colors group"
          :class="[currentTab === 'dashboard' ? 'bg-red-50 text-[#fc1919] font-semibold' : 'text-gray-600 hover:bg-gray-100']"
        >
          <UIcon name="i-heroicons-home" class="w-6 h-6" />
          <span v-if="!isSidebarCollapsed">Dashboard</span>
        </button>

        <button
          @click="navigate('products')"
          class="w-full flex items-center gap-3 p-3 rounded-xl transition-colors group"
          :class="[currentTab === 'products' ? 'bg-red-50 text-[#fc1919] font-semibold' : 'text-gray-600 hover:bg-gray-100']"
        >
          <UIcon name="i-heroicons-shopping-bag" class="w-6 h-6" />
          <span v-if="!isSidebarCollapsed">Produk</span>
        </button>

        <button
          @click="openAddProduct"
          class="w-full flex items-center gap-3 p-3 rounded-xl transition-colors group text-gray-600 hover:bg-gray-100"
        >
          <UIcon name="i-heroicons-plus-circle" class="w-6 h-6" />
          <span v-if="!isSidebarCollapsed">Tambah Produk</span>
        </button>

        <button
          @click="navigate('orders')"
          class="w-full flex items-center gap-3 p-3 rounded-xl transition-colors group"
          :class="[currentTab === 'orders' ? 'bg-red-50 text-[#fc1919] font-semibold' : 'text-gray-600 hover:bg-gray-100']"
        >
          <UIcon name="i-heroicons-shopping-cart" class="w-6 h-6" />
          <span v-if="!isSidebarCollapsed">Pesanan</span>
        </button>

        <button
          @click="navigate('analytics')"
          class="w-full flex items-center gap-3 p-3 rounded-xl transition-colors group"
          :class="[currentTab === 'analytics' ? 'bg-red-50 text-[#fc1919] font-semibold' : 'text-gray-600 hover:bg-gray-100']"
        >
          <UIcon name="i-heroicons-chart-bar" class="w-6 h-6" />
          <span v-if="!isSidebarCollapsed">Analitik</span>
        </button>
      </nav>

      <div class="p-4 border-t border-gray-100">
        <button
          @click="logout"
          class="w-full flex items-center gap-3 p-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
        >
          <UIcon name="i-heroicons-arrow-left-on-rectangle" class="w-6 h-6" />
          <span v-if="!isSidebarCollapsed">Logout</span>
        </button>
      </div>
    </aside>

    <!-- Mobile Sidebar -->
    <div
      v-if="isMobileSidebarOpen"
      class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
      @click="isMobileSidebarOpen = false"
    ></div>

    <aside
      class="fixed top-0 left-0 h-full w-64 bg-white z-50 transform transition-transform duration-300 lg:hidden"
      :class="[isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full']"
    >
      <div class="p-6 flex items-center gap-3 border-b border-gray-100">
        <div class="w-10 h-10 bg-[#fc1919] rounded-lg flex items-center justify-center flex-shrink-0">
          <UIcon name="i-heroicons-building-storefront" class="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 class="font-bold text-gray-800">EVDesign</h2>
          <p class="text-xs text-gray-500">Panel Penjual</p>
        </div>
        <button @click="isMobileSidebarOpen = false" class="ml-auto p-2">
          <UIcon name="i-heroicons-x-mark" class="w-6 h-6 text-gray-500" />
        </button>
      </div>

      <nav class="p-4 space-y-2">
        <button
          @click="navigate('dashboard')"
          class="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
          :class="[currentTab === 'dashboard' ? 'bg-red-50 text-[#fc1919] font-semibold' : 'text-gray-600 hover:bg-gray-100']"
        >
          <UIcon name="i-heroicons-home" class="w-6 h-6" />
          <span>Dashboard</span>
        </button>
        <button
          @click="navigate('products')"
          class="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
          :class="[currentTab === 'products' ? 'bg-red-50 text-[#fc1919] font-semibold' : 'text-gray-600 hover:bg-gray-100']"
        >
          <UIcon name="i-heroicons-shopping-bag" class="w-6 h-6" />
          <span>Produk</span>
        </button>
        <button
          @click="openAddProduct"
          class="w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-gray-600 hover:bg-gray-100"
        >
          <UIcon name="i-heroicons-plus-circle" class="w-6 h-6" />
          <span>Tambah Produk</span>
        </button>
        <button
          @click="navigate('orders')"
          class="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
          :class="[currentTab === 'orders' ? 'bg-red-50 text-[#fc1919] font-semibold' : 'text-gray-600 hover:bg-gray-100']"
        >
          <UIcon name="i-heroicons-shopping-cart" class="w-6 h-6" />
          <span>Pesanan</span>
        </button>
        <button
          @click="navigate('analytics')"
          class="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
          :class="[currentTab === 'analytics' ? 'bg-red-50 text-[#fc1919] font-semibold' : 'text-gray-600 hover:bg-gray-100']"
        >
          <UIcon name="i-heroicons-chart-bar" class="w-6 h-6" />
          <span>Analitik</span>
        </button>
        <div class="pt-4 border-t border-gray-100 mt-4">
          <button
            @click="logout"
            class="w-full flex items-center gap-3 p-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
          >
            <UIcon name="i-heroicons-arrow-left-on-rectangle" class="w-6 h-6" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Navbar -->
      <header class="bg-white border-b border-gray-200 h-[72px] flex items-center justify-between px-4 lg:px-8 z-20">
        <div class="flex items-center gap-4">
          <button @click="toggleMobileSidebar" class="lg:hidden p-2 rounded-lg bg-gray-100">
            <UIcon name="i-heroicons-bars-3" class="w-6 h-6 text-gray-700" />
          </button>
          <button @click="toggleSidebar" class="hidden lg:block p-2 rounded-lg hover:bg-gray-100">
            <UIcon name="i-heroicons-bars-3" class="w-6 h-6 text-gray-700" />
          </button>
          <h1 class="text-xl font-bold text-gray-800 truncate hidden sm:block">{{ pageTitle }}</h1>
        </div>

        <div class="flex items-center gap-4">
          <div class="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full border border-gray-200">
            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span class="text-xs font-medium text-gray-600">Toko Aktif</span>
          </div>

          <div class="dropdown dropdown-end">
            <label tabindex="0" class="btn btn-ghost btn-circle avatar border border-gray-200">
              <div class="w-10 rounded-full bg-red-100 flex items-center justify-center text-[#fc1919] font-bold">
                {{ sellerName.charAt(0) }}
              </div>
            </label>
            <ul tabindex="0" class="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52 border border-gray-100">
              <li class="p-2 border-b border-gray-100">
                <div class="font-bold">{{ sellerName }}</div>
                <div class="text-xs text-gray-500">ID: {{ userId }}</div>
              </li>
              <li><a>Pengaturan Profil</a></li>
              <li><a @click="logout" class="text-red-600 font-semibold">Logout</a></li>
            </ul>
          </div>
        </div>
      </header>

      <main class="p-4 lg:p-8 flex-1 overflow-y-auto">
        <!-- Dashboard Section -->
        <div v-if="currentTab === 'dashboard'" class="space-y-8 animate-in fade-in duration-500">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
              v-for="stat in stats"
              :key="stat.label"
              class="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div class="flex justify-between items-start">
                <div>
                  <p class="text-sm font-medium text-gray-500">{{ stat.label }}</p>
                  <h3 class="text-2xl font-bold text-gray-800 mt-1">{{ stat.value }}</h3>
                </div>
                <div :class="[stat.bg, stat.color]" class="p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <UIcon :name="stat.icon" class="w-6 h-6" />
                </div>
              </div>
              <div class="mt-4 flex items-center gap-2 text-xs font-medium text-green-600">
                <UIcon name="i-heroicons-arrow-trending-up" class="w-4 h-4" />
                <span>+12% dari bulan lalu</span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <!-- Recent Orders Table -->
            <div class="xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div class="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 class="font-bold text-gray-800">Pesanan Terkini</h3>
                <button @click="navigate('orders')" class="text-sm text-[#fc1919] font-semibold hover:underline">Lihat Semua</button>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-gray-50 border-b border-gray-100">
                      <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Invoice</th>
                      <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Pelanggan</th>
                      <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Tanggal</th>
                      <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Total</th>
                      <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-50">
                    <tr v-for="order in orders" :key="order.id" class="hover:bg-gray-50 transition-colors">
                      <td class="px-6 py-4 font-bold text-[#fc1919]">{{ order.invoice }}</td>
                      <td class="px-6 py-4 font-medium text-gray-800">{{ order.customer }}</td>
                      <td class="px-6 py-4 text-gray-500">{{ order.date }}</td>
                      <td class="px-6 py-4 font-bold">Rp {{ order.total.toLocaleString('id-ID') }}</td>
                      <td class="px-6 py-4">
                        <span
                          class="px-3 py-1 rounded-full text-xs font-bold"
                          :class="{
                            'bg-blue-100 text-blue-600': order.status === 'Baru',
                            'bg-orange-100 text-orange-600': order.status === 'Diproses',
                            'bg-green-100 text-green-600': order.status === 'Dikirim'
                          }"
                        >
                          {{ order.status }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Top Products -->
            <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 class="font-bold text-gray-800 mb-6">Produk Terlaris</h3>
              <div class="space-y-6">
                <div v-for="product in products.slice(0, 3)" :key="product.id" class="flex items-center gap-4">
                  <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-[#fc1919]">
                    <UIcon name="i-heroicons-photo" class="w-6 h-6" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-gray-800 truncate">{{ product.name }}</p>
                    <p class="text-xs text-gray-500">{{ product.sales }} Terjual · Rp {{ product.price.toLocaleString('id-ID') }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-bold text-[#fc1919]">Rp {{ (product.sales * product.price).toLocaleString('id-ID') }}</p>
                  </div>
                </div>
              </div>
              <button @click="navigate('products')" class="w-full mt-8 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 font-semibold hover:border-[#fc1919] hover:text-[#fc1919] transition-colors">
                Kelola Semua Produk
              </button>
            </div>
          </div>
        </div>

        <!-- Products Section -->
        <div v-if="currentTab === 'products'" class="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div class="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div class="relative w-full sm:w-80">
              <UIcon name="i-heroicons-magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input v-model="searchQuery" type="text" placeholder="Cari produk..." class="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fc1919] transition-all">
            </div>
            <button
              @click="isAddProductModalOpen = true"
              class="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-[#fc1919] text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-sm hover:shadow-md"
            >
              <UIcon name="i-heroicons-plus-circle" class="w-5 h-5" />
              Tambah Produk Baru
            </button>
          </div>

          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-gray-50 border-b border-gray-100">
                    <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Detail Produk</th>
                    <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Harga</th>
                    <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Stok</th>
                    <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Penjualan</th>
                    <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                    <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                  <tr v-for="product in filteredProducts" :key="product.id" class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-[#fc1919]">
                          <UIcon name="i-heroicons-photo" class="w-6 h-6" />
                        </div>
                        <span class="font-bold text-gray-800">{{ product.name }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 font-semibold text-gray-700">Rp {{ product.price.toLocaleString('id-ID') }}</td>
                    <td class="px-6 py-4">
                      <span :class="product.stock < 5 ? 'text-red-500 font-bold' : 'text-gray-600 font-medium'">
                        {{ product.stock }} pcs
                      </span>
                    </td>
                    <td class="px-6 py-4 font-medium text-gray-600">{{ product.sales }} terjual</td>
                    <td class="px-6 py-4">
                      <span class="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-bold">
                        {{ product.status }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center justify-center gap-2">
                        <button @click="openEditModal(product)" class="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                          <UIcon name="i-heroicons-pencil-square" class="w-5 h-5" />
                        </button>
                        <button @click="deleteProduct(product.id)" class="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors" title="Hapus">
                          <UIcon name="i-heroicons-trash" class="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Pagination Placeholder -->
            <div class="p-4 border-t border-gray-100 flex items-center justify-between">
              <span class="text-sm text-gray-500 font-medium">Menampilkan {{ filteredProducts.length }} produk</span>
              <div class="flex items-center gap-2">
                <button class="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-400 cursor-not-allowed">Sebelumnya</button>
                <button class="px-4 py-2 rounded-xl bg-[#fc1919] text-white text-sm font-bold shadow-sm">1</button>
                <button class="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Berikutnya</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Orders Section (Placeholder) -->
        <div v-if="currentTab === 'orders'" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center animate-in zoom-in-95 duration-500">
           <div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <UIcon name="i-heroicons-shopping-cart" class="w-10 h-10 text-[#fc1919]" />
           </div>
           <h2 class="text-2xl font-bold text-gray-800">Manajemen Pesanan</h2>
           <p class="text-gray-500 mt-2 max-w-md mx-auto">Bagian ini sedang dikembangkan untuk pemrosesan dan pelacakan pesanan yang lebih rinci.</p>
           <button @click="navigate('dashboard')" class="mt-8 px-8 py-3 bg-[#fc1919] text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-xl">Kembali ke Ikhtisar</button>
        </div>

        <!-- Analytics Section (Placeholder) -->
        <div v-if="currentTab === 'analytics'" class="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center animate-in zoom-in-95 duration-500">
           <div class="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <UIcon name="i-heroicons-presentation-chart-line" class="w-10 h-10 text-indigo-600" />
           </div>
           <h2 class="text-2xl font-bold text-gray-800">Analitik Penjualan</h2>
           <p class="text-gray-500 mt-2 max-w-md mx-auto">Grafik rinci dan laporan intelijen bisnis akan muncul di sini.</p>
           <button @click="navigate('dashboard')" class="mt-8 px-8 py-3 bg-[#fc1919] text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-xl">Kembali ke Ikhtisar</button>
        </div>
      </main>
    </div>

    <!-- Modals Section -->
    <!-- Add Product Modal -->
    <div v-if="isAddProductModalOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-[#fc1919]">
          <h3 class="text-lg font-bold text-white">Tambah Produk Baru</h3>
          <button @click="isAddProductModalOpen = false" class="text-white/80 hover:text-white transition-colors">
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div class="form-control">
            <label class="label"><span class="label-text font-bold text-gray-700">Nama Produk *</span></label>
            <input v-model="newProduct.name" type="text" placeholder="e.g. Kemeja Karawo" class="input input-bordered w-full rounded-xl focus:border-[#fc1919] focus:ring-[#fc1919]">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text font-bold text-gray-700">Harga (Rp) *</span></label>
              <input v-model.number="newProduct.price" type="number" class="input input-bordered w-full rounded-xl focus:border-[#fc1919] focus:ring-[#fc1919]">
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-bold text-gray-700">Stok (pcs) *</span></label>
              <input v-model.number="newProduct.stock" type="number" class="input input-bordered w-full rounded-xl focus:border-[#fc1919] focus:ring-[#fc1919]">
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-bold text-gray-700">Status</span></label>
            <select v-model="newProduct.status" class="select select-bordered w-full rounded-xl focus:border-[#fc1919]">
              <option>Aktif</option>
              <option>Non-aktif</option>
            </select>
          </div>
        </div>
        <div class="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
          <button @click="isAddProductModalOpen = false" class="px-6 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-100 transition-colors">Batal</button>
          <button @click="addProduct" class="px-6 py-2.5 rounded-xl bg-[#fc1919] text-white font-bold hover:bg-red-700 transition-all shadow-md">Simpan Produk</button>
        </div>
      </div>
    </div>

    <!-- Edit Product Modal -->
    <div v-if="isEditProductModalOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-600">
          <h3 class="text-lg font-bold text-white">Edit Produk</h3>
          <button @click="isEditProductModalOpen = false" class="text-white/80 hover:text-white transition-colors">
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div class="form-control">
            <label class="label"><span class="label-text font-bold text-gray-700">Nama Produk *</span></label>
            <input v-model="editingProduct.name" type="text" class="input input-bordered w-full rounded-xl focus:border-blue-500 focus:ring-blue-500">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text font-bold text-gray-700">Harga (Rp) *</span></label>
              <input v-model.number="editingProduct.price" type="number" class="input input-bordered w-full rounded-xl focus:border-blue-500 focus:ring-blue-500">
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text font-bold text-gray-700">Stok (pcs) *</span></label>
              <input v-model.number="editingProduct.stock" type="number" class="input input-bordered w-full rounded-xl focus:border-blue-500 focus:ring-blue-500">
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text font-bold text-gray-700">Status</span></label>
            <select v-model="editingProduct.status" class="select select-bordered w-full rounded-xl focus:border-blue-500">
              <option>Aktif</option>
              <option>Non-aktif</option>
            </select>
          </div>
        </div>
        <div class="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
          <button @click="isEditProductModalOpen = false" class="px-6 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-100 transition-colors">Batal</button>
          <button @click="updateProduct" class="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md">Perbarui Produk</button>
        </div>
      </div>
    </div>
  </div>
</template>
