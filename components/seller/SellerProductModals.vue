<script setup lang="ts">
interface Product {
  id: number
  name: string
  price: number
  stock: number
  sales: number
  status: string
}

interface NewProduct {
  name: string
  price: number
  stock: number
  status: string
}

defineProps<{
  isAddProductModalOpen: boolean
  isEditProductModalOpen: boolean
  newProduct: NewProduct
  editingProduct: Product | null
}>()

defineEmits<{
  (e: 'update:isAddProductModalOpen', value: boolean): void
  (e: 'update:isEditProductModalOpen', value: boolean): void
  (e: 'addProduct'): void
  (e: 'updateProduct'): void
}>()
</script>

<template>
  <div>
    <!-- Add Product Modal -->
    <div v-if="isAddProductModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-gray-950/80 backdrop-blur-xl animate-in fade-in duration-300" @click="$emit('update:isAddProductModalOpen', false)"></div>
      <div class="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-400 relative border border-gray-100">
        <div class="p-10 border-b border-gray-50 flex items-center justify-between bg-white">
          <div class="flex items-center gap-4">
            <div class="w-2.5 h-10 bg-[#fc1919] rounded-full"></div>
            <h3 class="text-2xl font-black text-gray-800 uppercase tracking-tighter">New Product</h3>
          </div>
          <button @click="$emit('update:isAddProductModalOpen', false)" class="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
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
              <label class="label mb-2"><span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Unit Price (Rp) <span class="text-red-500">*</span></span></label>
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
          <button @click="$emit('update:isAddProductModalOpen', false)" class="px-10 py-5 rounded-[20px] border-2 border-gray-100 font-black text-gray-400 hover:text-gray-600 hover:bg-white transition-all uppercase text-[10px] tracking-widest">Discard</button>
          <button @click="$emit('addProduct')" class="px-10 py-5 rounded-[20px] bg-[#fc1919] text-white font-black hover:bg-red-700 transition-all shadow-2xl shadow-red-200 hover:-translate-y-1 active:translate-y-0 uppercase text-[10px] tracking-widest">Create Product</button>
        </div>
      </div>
    </div>

    <!-- Edit Product Modal -->
    <div v-if="isEditProductModalOpen && editingProduct" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-gray-950/80 backdrop-blur-xl animate-in fade-in duration-300" @click="$emit('update:isEditProductModalOpen', false)"></div>
      <div class="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-400 relative border border-gray-100">
        <div class="p-10 border-b border-gray-50 flex items-center justify-between bg-white">
          <div class="flex items-center gap-4">
            <div class="w-2.5 h-10 bg-blue-600 rounded-full"></div>
            <h3 class="text-2xl font-black text-gray-800 uppercase tracking-tighter">Edit Product</h3>
          </div>
          <button @click="$emit('update:isEditProductModalOpen', false)" class="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
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
              <label class="label mb-2"><span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Unit Price (Rp) <span class="text-red-500">*</span></span></label>
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
          <button @click="$emit('update:isEditProductModalOpen', false)" class="px-10 py-5 rounded-[20px] border-2 border-gray-100 font-black text-gray-400 hover:text-gray-600 hover:bg-white transition-all uppercase text-[10px] tracking-widest">Cancel</button>
          <button @click="$emit('updateProduct')" class="px-10 py-5 rounded-[20px] bg-blue-600 text-white font-black hover:bg-blue-700 transition-all shadow-2xl shadow-blue-700/20 hover:-translate-y-1 active:translate-y-0 uppercase text-[10px] tracking-widest">Save Changes</button>
        </div>
      </div>
    </div>
  </div>
</template>
