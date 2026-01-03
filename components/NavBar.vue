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

const isMobileMenuOpen = ref(false);

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
        v-if="!isMobileMenuOpen"
        class="md:hidden block text-teal-600 mr-5"
        @click="isMobileMenuOpen = true"
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

    <!-- Mobile Slide Menu -->
    <transition name="slide-fade">
      <div
        v-if="isMobileMenuOpen"
        class="fixed inset-0 z-10"
        @click.self="isMobileMenuOpen = false"
      >
        <!-- Dimmed background overlay -->
        <div
          class="absolute inset-0 transition-opacity duration-300"
          @click.self="isMobileMenuOpen = false"
        ></div>

        <!-- Drawer that slides from the right -->
        <div
          class="absolute left-0 h-full w-3/4 max-w-xs bg-gray-200 p-6 shadow-lg transition-transform duration-300"
          @click.stop
        >
          <button
            v-if="isMobileMenuOpen"
            class="md:hidden block text-teal-600 mr-5 mb-5 ml-1"
            @click="isMobileMenuOpen = false"
          >
            <CloseOutlined class="text-2xl text-teal-500" />
          </button>
          <!-- Search -->
          <div class="search_box mb-4">
            <form action="#" class="max-w-[443px] h-[44px] relative">
              <input
                type="text"
                placeholder="Search here..."
                class="w-full h-full bg-white rounded-lg pl-4"
              />
              <button
                class="absolute top-1/2 right-4 -translate-y-1/2 transform"
              >
                <SearchOutlined
                  class="text-lg text-gray-800 hover:text-gray-500"
                />
              </button>
            </form>
          </div>

          <!-- Menu Items -->
          <ul class="space-y-4">
            <li v-for="item in navigation" :key="item.id">
              <a
                :href="item.url"
                class="block text-gray-800 hover:text-blue-600 text-lg"
              >
                {{ item.title }}
              </a>
            </li>
          </ul>

          <!-- Login / Sign up -->
        </div>
      </div>
    </transition>
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
