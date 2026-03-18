<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sidebar from '~/components/seller/Sidebar.vue'
import Navbar from '~/components/seller/Navbar.vue'
import Dashboard from '~/components/seller/Dashboard.vue'
import ProductTable from '~/components/seller/ProductTable.vue'
import ProductModals from '~/components/seller/ProductModals.vue'

definePageMeta({
  layout: false
})

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

const route = useRoute()
const router = useRouter()
const userId = route.params.slug as string

// Main Layout State
const currentTab = ref('dashboard')
const isSidebarCollapsed = ref(false)
const isMobileSidebarOpen = ref(false)
const sellerName = ref('EVDesign Seller')
const searchQuery = ref('')

// Data State
const stats = reactive<Stat[]>([
  { label: 'Total Products', value: '124', icon: 'i-heroicons-shopping-bag', color: 'text-red-600', bg: 'bg-red-50' },
  { label: 'Total Orders', value: '56', icon: 'i-heroicons-shopping-cart', color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Total Sales', value: 'Rp 45.8M', icon: 'i-heroicons-banknotes', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Revenue', value: 'Rp 12.4M', icon: 'i-heroicons-presentation-chart-line', color: 'text-orange-600', bg: 'bg-orange-50' }
])

const products = ref<Product[]>([
  { id: 1, name: 'Premium Karawo Shirt', price: 450000, stock: 24, sales: 12, status: 'Active' },
  { id: 2, name: 'Padi Motif Shawl', price: 280000, stock: 18, sales: 8, status: 'Active' },
  { id: 3, name: 'Elegant Karawo Blouse', price: 380000, stock: 12, sales: 5, status: 'Active' },
  { id: 4, name: 'Karawo Handbag', price: 320000, stock: 8, sales: 3, status: 'Active' },
  { id: 5, name: 'Traditional Karawo Sarong', price: 420000, stock: 3, sales: 10, status: 'Active' },
])

const orders = ref<Order[]>([
  { id: 1, invoice: '#INV-056', customer: 'Ahmad Budi', date: '15 Jan 2024', total: 900000, status: 'New' },
  { id: 2, invoice: '#INV-055', customer: 'Sari Dewi', date: '14 Jan 2024', total: 560000, status: 'Processing' },
  { id: 3, invoice: '#INV-054', customer: 'Hendra Wijaya', date: '14 Jan 2024', total: 1250000, status: 'Shipped' },
])

// Modal State
const isAddProductModalOpen = ref(false)
const isEditProductModalOpen = ref(false)
const editingProduct = ref<Product | null>(null)
const newProduct = reactive({ name: '', price: 0, stock: 0, status: 'Active' })

// CRUD Actions
const addProduct = () => {
  if (!newProduct.name || newProduct.price <= 0) {
    alert('Please fill in all required fields.')
    return
  }
  products.value.push({ id: Date.now(), ...newProduct, sales: 0 })
  isAddProductModalOpen.value = false
  newProduct.name = ''; newProduct.price = 0; newProduct.stock = 0
}

const handleEditProduct = (product: Product) => {
  editingProduct.value = { ...product }
  isEditProductModalOpen.value = true
}

const updateProduct = () => {
  if (!editingProduct.value || !editingProduct.value.name || editingProduct.value.price <= 0) {
    alert('Please fill in all required fields.')
    return
  }
  const index = products.value.findIndex(p => p.id === editingProduct.value?.id)
  if (index !== -1) products.value[index] = { ...editingProduct.value }
  isEditProductModalOpen.value = false
}

const deleteProduct = (id: number) => {
  if (confirm('Are you sure you want to delete this product?')) {
    products.value = products.value.filter(p => p.id !== id)
  }
}

const logout = () => router.push('/seller/account')

const openAddProduct = () => {
  currentTab.value = 'products'
  isAddProductModalOpen.value = true
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
    <!-- Sidebar Component -->
    <Sidebar
      v-model:currentTab="currentTab"
      v-model:isMobileSidebarOpen="isMobileSidebarOpen"
      :isSidebarCollapsed="isSidebarCollapsed"
      @logout="logout"
      @openAddProduct="openAddProduct"
    />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
      <!-- Navbar Component -->
      <Navbar
        :pageTitle="pageTitle"
        :sellerName="sellerName"
        :userId="userId"
        @toggleSidebar="isSidebarCollapsed = !isSidebarCollapsed"
        @toggleMobileSidebar="isMobileSidebarOpen = !isMobileSidebarOpen"
        @logout="logout"
      />

      <!-- Scrollable Content Area -->
      <main class="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar bg-gray-50/50">
        <!-- Dashboard View -->
        <Dashboard
          v-if="currentTab === 'dashboard'"
          :stats="stats"
          :orders="orders"
          :products="products"
          @navigate="currentTab = $event"
        />

        <!-- Products View -->
        <ProductTable
          v-if="currentTab === 'products'"
          :products="products"
          v-model:searchQuery="searchQuery"
          @openAddProduct="isAddProductModalOpen = true"
          @editProduct="handleEditProduct"
          @deleteProduct="deleteProduct"
        />

        <!-- Placeholder Views -->
        <div v-if="currentTab === 'orders' || currentTab === 'analytics'" class="py-12 lg:py-24 max-w-2xl mx-auto text-center animate-in duration-500">
           <div class="w-28 h-28 bg-white rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-2xl border border-gray-50 rotate-6 group hover:rotate-0 transition-transform duration-500">
             <UIcon :name="currentTab === 'orders' ? 'i-heroicons-shopping-cart' : 'i-heroicons-presentation-chart-line'" class="w-14 h-14" :class="currentTab === 'orders' ? 'text-[#fc1919]' : 'text-indigo-600'" />
           </div>
           <h2 class="text-3xl lg:text-4xl font-black text-gray-800 tracking-tighter uppercase">{{ currentTab === 'orders' ? 'Order Pipeline' : 'Market Insights' }}</h2>
           <p class="text-gray-500 mt-6 font-medium leading-relaxed text-sm lg:text-base px-4">We are currently finalising the advanced logic for this module.</p>
           <button @click="currentTab = 'dashboard'" class="mt-12 px-12 py-5 bg-black text-white font-black rounded-[20px] hover:bg-[#fc1919] transition-all shadow-2xl uppercase text-[10px] tracking-[0.25em] active:scale-95">Back to Home</button>
        </div>
      </main>
    </div>

    <!-- Modals Component -->
    <ProductModals
      v-model:isAddProductModalOpen="isAddProductModalOpen"
      v-model:isEditProductModalOpen="isEditProductModalOpen"
      :newProduct="newProduct"
      :editingProduct="editingProduct"
      @addProduct="addProduct"
      @updateProduct="updateProduct"
    />
  </div>
</template>
