<template>
  <section v-if="isSignedIn" class="bg-white antialiased">
    <div class="mx-auto max-w-screen-xl 2xl:px-0">
      <div v-if="cartItems.length === 0" class="mt-8 text-center">
        <i class="fas fa-shopping-cart text-gray-300 text-5xl mb-4"></i>
        <p class="text-xl text-gray-500">Your cart is empty</p>
        <NuxtLink
          to="/"
          class="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Continue Shopping
        </NuxtLink>
      </div>

      <div v-else class="mt-6 sm:mt-8 md:gap-6 lg:flex lg:items-start xl:gap-8">
        <div class="mx-auto w-full flex-none lg:max-w-2xl xl:max-w-4xl">
          <div class="space-y-6">
            <!-- Cart Items -->
            <div
              v-for="(item, index) in cartItems"
              :key="item.$id"
              class="rounded-lg border border-gray-200 p-4 shadow-sm md:p-6"
            >
              <div
                class="space-y-4 md:flex md:items-center md:justify-between md:gap-6 md:space-y-0"
              >
                <div class="shrink-0 md:order-1">
                  <img
                    class="h-20 w-20"
                    :src="getPinataImageUrl(item.img1)"
                    :alt="item.title"
                  />
                </div>
                <div
                  class="flex items-center justify-between md:order-3 md:justify-end"
                >
                  <div class="flex items-center">
                    <button
                      type="button"
                      @click="decrementQuantity(item)"
                      :disabled="item.quantity <= 1"
                      class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg
                        class="h-2.5 w-2.5 text-gray-900"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 18 2"
                      >
                        <path
                          stroke="currentColor"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M1 1h16"
                        />
                      </svg>
                    </button>
                    <input
                      type="text"
                      :value="item.quantity"
                      class="w-10 shrink-0 border-0 bg-transparent text-center text-sm font-medium text-gray-900 focus:outline-none focus:ring-0"
                      readonly
                    />
                    <button
                      type="button"
                      @click="incrementQuantity(item)"
                      :disabled="item.quantity >= 4"
                      class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg
                        class="h-2.5 w-2.5 text-gray-900"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 18 18"
                      >
                        <path
                          stroke="currentColor"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 1v16M1 9h16"
                        />
                      </svg>
                    </button>
                  </div>
                  <div class="text-end md:order-4 md:w-32">
                    <p class="text-base font-bold text-gray-900 font-mono">
                      ৳{{ (item.price * item.quantity).toFixed(2) }}
                    </p>
                  </div>
                </div>

                <div
                  class="w-full min-w-0 flex-1 space-y-4 md:order-2 md:max-w-md"
                >
                  <a
                    href="#"
                    class="text-base font-medium text-gray-900 hover:underline"
                  >
                    {{ item.title }}
                  </a>

                  <div class="flex items-center gap-4">
                    <button
                      type="button"
                      class="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 hover:underline"
                    >
                      <svg
                        class="me-1.5 h-5 w-5"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke="currentColor"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12.01 6.001C6.5 1 1 8 5.782 13.001L12.011 20l6.23-7C23 8 17.5 1 12.01 6.002Z"
                        />
                      </svg>
                      Add to Favorites
                    </button>

                    <button
                      type="button"
                      @click="cartStore.removeFromCart(item.$id)"
                      class="inline-flex items-center text-sm font-medium text-red-600 hover:underline"
                    >
                      <svg
                        class="me-1.5 h-5 w-5"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke="currentColor"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18 17.94 6M18 18 6.06 6"
                        />
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
              <div class="flex flex-col md:flex-row items-center gap-4">
                <!-- ------------------------ -->

                <div class="flex flex-col gap-4">
                  <div
                    class="max-w-2xl p-2 grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    <div>
                      <div class="mb-4">
                        <!-- Package Info -->
                        <div v-if="item.package" class="mt-2">
                          <p
                            class="text-sm font-medium font-mono text-gray-900"
                          >
                            Package: {{ item.package.name }} -
                            {{ item.package.subtitle }}
                            <span v-if="item.features && item.features.length">
                              <span
                                v-for="(feature, i) in item.features"
                                :key="i"
                                class="space-x-1 my-1"
                              >
                                <a-tag :bordered="false" color="cyan">
                                  {{ feature }}</a-tag
                                >

                                <!-- <p class="text-blue-500">{{ feature }}</p> -->
                              </span>
                            </span>
                          </p>

                          <p class="font-mono">৳{{ item.package.price }}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <!--  -->
                    </div>
                  </div>
                </div>

                <!-- Prescription Image -->
                <div class="shrink-0 md:order-1" v-if="item.prescription">
                  <a-image :width="100" :src="item.prescription" />
                  <p class="text-sm font-medium font-mono text-gray-900">
                    <a-tag color="#87d068">Your Prescription</a-tag>
                  </p>
                </div>
                <div v-else class="shrink-0 md:order-1">
                  <a-empty
                    description="Without prescription"
                    :image="simpleImage"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- People Also Bought (Static Section) -->
          <div class="hidden xl:mt-8 xl:block">
            <h3 class="text-2xl font-semibold text-gray-900">
              YOU MIGHT ALSO LIKE
            </h3>
            <div class="mt-6 grid grid-cols-3 gap-4 sm:mt-8">
              <!-- Product 1 -->
              <div
                class="space-y-6 overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                <a href="#" class="overflow-hidden rounded">
                  <img
                    class="mx-auto h-44 w-44"
                    src="https://flowbite.s3.amazonaws.com/blocks/e-commerce/imac-front.svg"
                    alt="imac image"
                  />
                  <img
                    class="mx-auto hidden h-44 w-44 cks/e-commerce/imac-front-dark.svg"
                    alt="imac image"
                  />
                </a>
                <div>
                  <a
                    href="#"
                    class="text-lg font-semibold leading-tight text-gray-900 hover:underline"
                    >iMac 27”</a
                  >
                  <p class="mt-2 text-base font-normal text-gray-500">
                    This generation has some improvements, including a longer
                    continuous battery life.
                  </p>
                </div>
                <div>
                  <p class="text-lg font-bold text-gray-900">
                    <span class="line-through"> $399,99 </span>
                  </p>
                  <p class="text-lg font-bold leading-tight text-red-600">
                    $299
                  </p>
                </div>
                <div class="mt-6 flex items-center gap-2.5">
                  <button
                    data-tooltip-target="favourites-tooltip-1"
                    type="button"
                    class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-primary-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100"
                  >
                    <svg
                      class="h-5 w-5"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 6C6.5 1 1 8 5.8 13l6.2 7 6.2-7C23 8 17.5 1 12 6Z"
                      ></path>
                    </svg>
                  </button>
                  <div
                    id="favourites-tooltip-1"
                    role="tooltip"
                    class="tooltip invisible absolute z-10 inline-block rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white opacity-0 shadow-sm transition-opacity duration-300"
                  >
                    Add to favourites
                    <div class="tooltip-arrow" data-popper-arrow></div>
                  </div>
                  <button
                    type="button"
                    class="inline-flex w-full items-center justify-center rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300"
                  >
                    <svg
                      class="-ms-2 me-2 h-5 w-5"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke="currentColor"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 4h1.5L9 16m0 0h8m-8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-8.5-3h9.25L19 7h-1M8 7h-.688M13 5v4m-2-2h4"
                      />
                    </svg>
                    Add to cart
                  </button>
                </div>
              </div>

              <!-- Products 2 and 3 would go here (same as your static content) -->
            </div>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="mx-auto mt-6 max-w-4xl flex-1 space-y-6 lg:mt-0 lg:w-full">
          <div
            class="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <p class="text-xl font-semibold text-gray-900">Order summary</p>

            <div class="space-y-4">
              <div class="space-y-2">
                <dl class="flex items-center justify-between gap-4">
                  <dt class="text-base font-normal text-gray-500">
                    Original price
                  </dt>
                  <dd class="text-base font-medium text-gray-900 font-mono">
                    ৳{{ subtotal.toFixed(2) }}
                  </dd>
                </dl>

                <dl class="flex items-center justify-between gap-4">
                  <dt class="text-base font-normal text-gray-500">Savings</dt>
                  <dd class="text-base font-medium text-green-600 font-mono">
                    -৳0.00
                  </dd>
                </dl>

                <dl class="flex items-center justify-between gap-4">
                  <dt class="text-base font-normal text-gray-500">Shipping</dt>
                  <dd class="text-base font-medium text-gray-900 font-mono">
                    ৳{{ shipping.toFixed(2) }}
                  </dd>
                </dl>

                <dl class="flex items-center justify-between gap-4">
                  <dt class="text-base font-normal text-gray-500">Tax</dt>
                  <dd class="text-base font-medium text-gray-900">
                    ৳{{ tax.toFixed(2) }}
                  </dd>
                </dl>
              </div>

              <dl
                class="flex items-center justify-between gap-4 border-t border-gray-200 pt-2"
              >
                <dt class="text-base font-bold text-gray-900">Total</dt>
                <dd class="text-base font-bold text-gray-900 font-mono">
                  ৳{{ total.toFixed(2) }}
                </dd>
              </dl>
            </div>

            <NuxtLink
              to="/checkout"
              @click="closeModal"
              class="flex w-full items-center justify-center rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300"
              >Proceed to Checkout</NuxtLink
            >

            <div class="flex items-center justify-center gap-2">
              <span class="text-sm font-normal text-gray-500"> or </span>
              <NuxtLink
                @click="closeModal"
                to="/"
                class="inline-flex items-center gap-2 text-sm font-medium text-primary-700 underline hover:no-underline"
              >
                Continue Shopping
                <svg
                  class="h-5 w-5"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 12H5m14 0-4 4m4-4-4-4"
                  />
                </svg>
              </NuxtLink>
            </div>
          </div>

          <div
            class="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <form class="space-y-4">
              <div>
                <label
                  for="voucher"
                  class="mb-2 block text-sm font-medium text-gray-900"
                >
                  Do you have a voucher or gift card?
                </label>
                <input
                  type="text"
                  id="voucher"
                  class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500"
                  placeholder=""
                />
              </div>
              <button
                type="submit"
                class="flex w-full items-center justify-center rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300"
              >
                Apply Code
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useCartStore, type CartItem } from "~/stores/cart"; // Import CartItem type
import { onMounted, computed } from "vue";
import { getPinataImageUrl } from "~/constants";
import { Empty } from "ant-design-vue";
import { useUser } from "@clerk/vue";
const { isLoaded, isSignedIn, user } = useUser();

const emit = defineEmits<{
  (e: "close-modal"): void;
}>();

function closeModal() {
  emit("close-modal");
}

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE;
const cartStore = useCartStore();
const shipping = 150;
const taxRate = 0.02; // 8% tax

onMounted(() => {
  cartStore.loadFromLocal();
});

const { items: cartItems } = storeToRefs(cartStore);

// Calculate cart totals
const productSubtotal = computed(() => {
  return cartItems.value.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  );
});

const packageSubtotal = computed(() => {
  return cartItems.value.reduce(
    (sum, item) => sum + (item.package?.price || 0) * (item.quantity || 1),
    0
  );
});

const subtotal = computed(() => productSubtotal.value + packageSubtotal.value);
const tax = computed(() => subtotal.value * taxRate);
const total = computed(() => subtotal.value + tax.value + shipping);

// Update item quantity with proper typing
function incrementQuantity(item: CartItem) {
  if (item.quantity < 4) {
    cartStore.updateQuantity(item.$id, item.quantity + 1);
  }
}

function decrementQuantity(item: CartItem) {
  if (item.quantity > 1) {
    cartStore.updateQuantity(item.$id, item.quantity - 1);
  }
}
</script>

<style scoped>
.tooltip {
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.3s;
}

[data-tooltip-target]:hover + .tooltip,
.tooltip:hover {
  visibility: visible;
  opacity: 1;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
