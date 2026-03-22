<script setup lang="ts">
import { ref, provide } from "vue";
import { navigation } from "@/constants";
import Logo from "@/assets/Lenschy_logo1.png";
import {
  CloseOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  MenuOutlined,
} from "@ant-design/icons-vue";
import { NuxtLink } from "#components";
import { useCartStore } from "~/stores/cart";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nuxt/components";
import { useUser } from "@clerk/vue";
const { isLoaded, isSignedIn, user } = useUser();
const cartStore = useCartStore();
onMounted(() => {
  cartStore.loadFromLocal();
});

withDefaults(
  defineProps<{
    currentTab?: string;
    isSidebarCollapsed?: boolean;
    isMobileSidebarOpen?: boolean;
  }>(),
  {
    currentTab: "dashboard",
    isSidebarCollapsed: false,
    isMobileSidebarOpen: false,
  }
);

const emit = defineEmits<{
  (e: "update:currentTab", tab: string): void;
  (e: "update:isMobileSidebarOpen", value: boolean): void;
  (e: "logout"): void;
  (e: "openAddProduct"): void;
}>();

const navigate = (tab: string) => {
  emit("update:currentTab", tab);
  emit("update:isMobileSidebarOpen", false);
};

const openAddProduct = () => {
  emit("openAddProduct");
};

const open = ref<boolean>(false);
provide("modalOpen", open);

const showModal = () => {
  open.value = true;
};

const handleOk = (e: MouseEvent) => {
  console.log(e);
  open.value = false;
};
</script>

<template>
  <div>
    <!-- Top Navbar -->
    <div
      class="navbar_top flex items-center justify-center bg-[#272343] min-h-[40px] sm:h-[45px] w-full px-2"
    >
      <div
        class="container max-w-screen-xl mx-auto px-2 sm:px-4 flex justify-between items-center"
      >
        <p
          class="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-inter font-normal text-white capitalize"
        >
          Free ৳150
        </p>
        <div
          class="navbar_top_right flex items-center gap-2 sm:gap-4 text-white text-xs sm:text-sm"
        >
          <select
            class="h-[28px] sm:h-[30px] text-blue-300 text-xs sm:text-sm font-inter font-normal bg-transparent"
          >
            <option>eng</option>
            <option>bangla</option>
          </select>
          <button class="font-inter font-normal capitalize">Faqs</button>
          <button class="flex items-center font-inter font-normal capitalize">
            Need help
          </button>
        </div>
      </div>
    </div>

    <!-- Middle Navbar -->
    <div
      class="navbar_middle flex justify-between bg-[#f0f2f3] w-full h-[75px]"
    >
      <div
        class="container max-w-screen-xl mx-auto px-4 grid grid-cols-2 md:grid-cols-3 items-center"
      >
        <!-- Logo -->
        <div class="logo_wrapper">
          <NuxtLink
            to="/"
            class="text-3xl text-black font-inter font-medium capitalize flex items-center gap-2"
          >
            <img :src="Logo" class="h-12" alt="logo" />
          </NuxtLink>
        </div>

        <!-- Search -->
        <div class="search_box hidden md:block">
          <form action="#" class="max-w-[443px] h-[44px] relative">
            <input
              type="text"
              placeholder="Search here..."
              class="w-full h-full bg-white rounded-lg pl-4"
            />
            <button class="absolute top-1/2 right-4 -translate-y-1/2 transform">
              <SearchOutlined
                class="text-lg text-gray-800 hover:text-gray-500"
              />
            </button>
          </form>
        </div>

        <!-- Right Nav -->
      </div>
      <button
        v-if="!isMobileSidebarOpen"
        class="md:hidden block text-teal-600 mr-5"
        @click="emit('update:isMobileSidebarOpen', true)"
      >
        <MenuOutlined class="text-2xl" />
      </button>
    </div>

    <!-- Bottom Navbar -->
    <div
      class="navbar_bottom flex items-center justify-center w-full h-[55px] border-b border-[#e1e3e5]"
    >
      <div
        class="flex container max-w-screen-xl mx-auto px-4 flex-row justify-between items-center"
      >
        <div
          class="navbar_bottom_left flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-8 mt-4 md:mt-0"
        ></div>

        <div class="navbar_bottom_right">
          <div class="navbar_middle_right flex justify-end gap-3">
            <NuxtLink>
              <button
                class="btn bg-slate-50 capitalize flex items-center gap-2 text-gray-800"
                @click="showModal"
              >
                <ShoppingCartOutlined /> Cart
                <div
                  v-if="isSignedIn"
                  class="badge badge-sm bg-teal-500 text-white"
                >
                  {{ cartStore.cartCount ? cartStore.cartCount : 0 }}
                </div>
              </button>
            </NuxtLink>

            <ClientOnly>
              <SignedIn>
                <UserButton />
              </SignedIn>
              <SignedOut>
                <SignInButton>
                  <div class="dropdown relative">
                    <div
                      class="btn bg-slate-50 cursor-pointer font-semibold text-teal-500"
                    >
                      <UserOutlined />
                    </div>
                  </div>
                </SignInButton>
              </SignedOut>
            </ClientOnly>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Sidebar Drawer -->
    <div>
      <!-- Desktop Sidebar -->
      <aside
        class="hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 z-30 shrink-0 h-screen sticky top-0"
        :class="[isSidebarCollapsed ? 'w-20' : 'w-64']"
      >
        <div
          class="p-6 flex items-center gap-3 border-b border-gray-100 h-[72px] shrink-0"
        >
          <div
            class="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm shadow-red-100"
          >
            <UIcon
              name="i-heroicons-building-storefront"
              class="w-6 h-6 text-white"
            />
          </div>
          <div
            v-if="!isSidebarCollapsed"
            class="overflow-hidden whitespace-nowrap"
          >
            <h2 class="font-bold text-gray-800 tracking-tight">EVDesign</h2>
            <p
              class="text-[10px] text-gray-400 font-bold uppercase tracking-widest"
            >
              Seller Panel
            </p>
          </div>
        </div>

        <nav class="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <button
            @click="navigate('dashboard')"
            class="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative"
            :class="[
              currentTab === 'dashboard'
                ? 'bg-red-50 text-teal-500 font-bold'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
            ]"
          >
            <UIcon name="i-heroicons-home" class="w-5 h-5 shrink-0" />
            <span v-if="!isSidebarCollapsed" class="text-sm whitespace-nowrap"
              >Dashboard</span
            >
            <div
              v-if="currentTab === 'dashboard' && !isSidebarCollapsed"
              class="absolute left-0 w-1 h-6 bg-teal-500 rounded-r-full"
            ></div>
          </button>

          <button
            @click="navigate('products')"
            class="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative"
            :class="[
              currentTab === 'products'
                ? 'bg-red-50 text-teal-500 font-bold'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
            ]"
          >
            <UIcon name="i-heroicons-shopping-bag" class="w-5 h-5 shrink-0" />
            <span v-if="!isSidebarCollapsed" class="text-sm whitespace-nowrap"
              >Products</span
            >
            <div
              v-if="currentTab === 'products' && !isSidebarCollapsed"
              class="absolute left-0 w-1 h-6 bg-teal-500 rounded-r-full"
            ></div>
          </button>

          <button
            @click="openAddProduct"
            class="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group text-gray-500 hover:bg-gray-50 hover:text-gray-800"
          >
            <UIcon name="i-heroicons-plus-circle" class="w-5 h-5 shrink-0" />
            <span v-if="!isSidebarCollapsed" class="text-sm whitespace-nowrap"
              >Add Product</span
            >
          </button>

          <button
            @click="navigate('orders')"
            class="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative"
            :class="[
              currentTab === 'orders'
                ? 'bg-red-50 text-teal-500 font-bold'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
            ]"
          >
            <UIcon name="i-heroicons-shopping-cart" class="w-5 h-5 shrink-0" />
            <span v-if="!isSidebarCollapsed" class="text-sm whitespace-nowrap"
              >Orders</span
            >
            <div
              v-if="currentTab === 'orders' && !isSidebarCollapsed"
              class="absolute left-0 w-1 h-6 bg-teal-500 rounded-r-full"
            ></div>
          </button>

          <button
            @click="navigate('analytics')"
            class="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 group relative"
            :class="[
              currentTab === 'analytics'
                ? 'bg-red-50 text-teal-500 font-bold'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
            ]"
          >
            <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 shrink-0" />
            <span v-if="!isSidebarCollapsed" class="text-sm whitespace-nowrap"
              >Analytics</span
            >
            <div
              v-if="currentTab === 'analytics' && !isSidebarCollapsed"
              class="absolute left-0 w-1 h-6 bg-teal-500 rounded-r-full"
            ></div>
          </button>
        </nav>

        <div class="p-4 border-t border-gray-100 shrink-0">
          <button
            @click="$emit('logout')"
            class="w-full flex items-center gap-3 p-3.5 rounded-xl text-teal-500 hover:bg-red-50 transition-colors font-bold text-sm"
          >
            <UIcon
              name="i-heroicons-arrow-left-on-rectangle"
              class="w-5 h-5 shrink-0"
            />
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
        <div
          class="p-6 flex items-center gap-3 border-b border-gray-100 h-[72px]"
        >
          <div
            class="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-200"
          >
            <UIcon
              name="i-heroicons-building-storefront"
              class="w-6 h-6 text-white"
            />
          </div>
          <div class="flex-1">
            <h2 class="font-black text-gray-800 tracking-tight">EVDesign</h2>
            <p
              class="text-[10px] text-gray-400 font-black uppercase tracking-widest"
            >
              Seller Panel
            </p>
          </div>
          <button
            @click="$emit('update:isMobileSidebarOpen', false)"
            class="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <nav
          class="p-4 space-y-1 overflow-y-auto h-[calc(100%-144px)] custom-scrollbar"
        >
          <button
            @click="navigate('dashboard')"
            class="w-full flex items-center gap-4 p-4 rounded-xl transition-all"
            :class="[
              currentTab === 'dashboard'
                ? 'bg-red-50 text-teal-500 font-bold shadow-sm'
                : 'text-gray-600 hover:bg-gray-50',
            ]"
          >
            <UIcon name="i-heroicons-home" class="w-6 h-6" />
            <span>Dashboard</span>
          </button>
          <button
            @click="navigate('products')"
            class="w-full flex items-center gap-4 p-4 rounded-xl transition-all"
            :class="[
              currentTab === 'products'
                ? 'bg-red-50 text-teal-500 font-bold shadow-sm'
                : 'text-gray-600 hover:bg-gray-50',
            ]"
          >
            <UIcon name="i-heroicons-shopping-bag" class="w-6 h-6" />
            <span>Products</span>
          </button>
          <button
            @click="openAddProduct"
            class="w-full flex items-center gap-4 p-4 rounded-xl transition-all text-gray-600 hover:bg-gray-50"
          >
            <UIcon name="i-heroicons-plus-circle" class="w-6 h-6" />
            <span>Add Product</span>
          </button>
          <button
            @click="navigate('orders')"
            class="w-full flex items-center gap-4 p-4 rounded-xl transition-all"
            :class="[
              currentTab === 'orders'
                ? 'bg-red-50 text-teal-500 font-bold shadow-sm'
                : 'text-gray-600 hover:bg-gray-50',
            ]"
          >
            <UIcon name="i-heroicons-shopping-cart" class="w-6 h-6" />
            <span>Orders</span>
          </button>
          <button
            @click="navigate('analytics')"
            class="w-full flex items-center gap-4 p-4 rounded-xl transition-all"
            :class="[
              currentTab === 'analytics'
                ? 'bg-red-50 text-teal-500 font-bold shadow-sm'
                : 'text-gray-600 hover:bg-gray-50',
            ]"
          >
            <UIcon name="i-heroicons-chart-bar" class="w-6 h-6" />
            <span>Analytics</span>
          </button>
        </nav>

        <div
          class="p-4 border-t border-gray-100 absolute bottom-0 w-full bg-white"
        >
          <button
            @click="$emit('logout')"
            class="w-full flex items-center gap-4 p-4 rounded-xl text-teal-500 hover:bg-red-50 transition-colors font-black uppercase text-xs tracking-widest"
          >
            <UIcon name="i-heroicons-arrow-left-on-rectangle" class="w-6 h-6" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </div>
  </div>

  <div>
    <a-modal
      @ok="handleOk"
      okText="Continue Shopping"
      v-model:open="open"
      title="Shopping Cart"
      width="100%"
      wrap-class-name="full-modal"
    >
      <!-- <Auth />
      <PhoneAuth /> -->
      <ShoppingCart @close-modal="open = false" />
    </a-modal>
  </div>
</template>
