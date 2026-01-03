<template>
  <section
    v-if="isSignedIn"
    class="bg-white py-8 antialiased dark:bg-gray-900 md:py-16"
  >
    <form
      @submit.prevent="addNewOrder"
      class="mx-auto max-w-screen-xl px-4 2xl:px-0"
    >
      <!-- Progress indicators -->
      <ol
        class="items-center flex w-full max-w-2xl text-center text-sm font-medium text-gray-500 dark:text-gray-400 sm:text-base"
      >
        <!-- ... progress steps ... -->
      </ol>

      <div class="mt-6 sm:mt-8 lg:flex lg:items-start lg:gap-12 xl:gap-16">
        <div class="min-w-0 flex-1 space-y-8">
          <div class="space-y-4">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Delivery Details:
            </h2>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  for="your_name"
                  class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                >
                  Your name
                </label>
                <input
                  v-model="formData.name"
                  type="text"
                  id="your_name"
                  class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
                  placeholder="Your Name"
                  required
                />
              </div>

              <div>
                <div class="mb-2 flex items-center gap-2">
                  <label
                    for="select-country-input-3"
                    class="block text-sm font-medium text-gray-900 dark:text-white"
                  >
                    Country*
                  </label>
                </div>
                <select
                  v-model="formData.country"
                  id="select-country-input-3"
                  class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
                >
                  <option value="Bangladesh" selected>Bangladesh</option>
                </select>
              </div>

              <div>
                <div class="mb-2 flex items-center gap-2">
                  <label
                    for="select-city-input-3"
                    class="block text-sm font-medium text-gray-900 dark:text-white"
                  >
                    City*
                  </label>
                </div>
                <select
                  v-model="formData.city"
                  id="select-city-input-3"
                  class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
                  required
                >
                  <option value="" disabled selected>Select area</option>
                  <option value="Inside Dhaka">Inside Dhaka</option>
                  <option value="Outside Dhaka">Outside Dhaka</option>
                </select>
              </div>

              <div>
                <label
                  for="phone-input-3"
                  class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                >
                  Phone Number*
                </label>
                <div class="flex items-center">
                  <button
                    id="dropdown-phone-button-3"
                    type="button"
                    class="z-10 inline-flex shrink-0 items-center rounded-s-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-center text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-700"
                  >
                    <span>+880</span>
                  </button>
                  <div class="relative w-full">
                    <input
                      v-model="formData.phone"
                      type="tel"
                      id="phone-input"
                      class="z-20 block w-full rounded-e-lg border border-s-0 border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:border-s-gray-700 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-primary-500"
                      pattern="[0-9]{10}"
                      placeholder="1XX-XXXX-XXX"
                      required
                    />
                  </div>
                </div>
              </div>

              <!-- Address Input -->
              <div class="sm:col-span-2">
                <label
                  for="address"
                  class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                >
                  Address*
                </label>
                <textarea
                  v-model="formData.address"
                  id="address"
                  class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
                  placeholder="Your full address"
                  required
                  rows="3"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Payment and Delivery sections remain unchanged -->
          <!-- ... -->
        </div>

        <!-- Order Summary -->
        <div
          class="mt-6 w-full space-y-6 sm:mt-8 lg:mt-0 lg:max-w-xs xl:max-w-md"
        >
          <div class="flow-root">
            <div class="-my-3 divide-y divide-gray-200 dark:divide-gray-800">
              <dl class="flex items-center justify-between gap-4 py-3">
                <dt
                  class="text-base font-normal text-gray-500 dark:text-gray-400"
                >
                  Subtotal
                </dt>
                <dd
                  class="text-base font-medium text-gray-900 dark:text-white font-mono"
                >
                  ৳{{ subtotal.toFixed(2) }}
                </dd>
              </dl>

              <dl class="flex items-center justify-between gap-4 py-3">
                <dt
                  class="text-base font-normal text-gray-500 dark:text-gray-400"
                >
                  Savings
                </dt>
                <dd class="text-base font-medium text-green-500 font-mono">
                  -৳0.00
                </dd>
              </dl>

              <dl class="flex items-center justify-between gap-4 py-3">
                <dt
                  class="text-base font-normal text-gray-500 dark:text-gray-400"
                >
                  Shipping
                </dt>
                <dd
                  class="text-base font-medium text-gray-900 dark:text-white font-mono"
                >
                  ৳{{ shipping.toFixed(2) }}
                </dd>
              </dl>

              <dl class="flex items-center justify-between gap-4 py-3">
                <dt
                  class="text-base font-normal text-gray-500 dark:text-gray-400"
                >
                  Tax
                </dt>
                <dd
                  class="text-base font-medium text-gray-900 dark:text-white font-mono"
                >
                  ৳{{ tax.toFixed(2) }}
                </dd>
              </dl>

              <dl class="flex items-center justify-between gap-4 py-3">
                <dt class="text-base font-bold text-gray-900 dark:text-white">
                  Total
                </dt>
                <dd
                  class="text-base font-bold text-gray-900 dark:text-white font-mono"
                >
                  ৳{{ total.toFixed(2) }}
                </dd>
              </dl>
            </div>
          </div>

          <div class="space-y-3">
            <button
              type="submit"
              :disabled="loading"
              class="flex w-full items-center justify-center rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
            >
              <span v-if="loading">Processing...</span>
              <span v-else>Confirm Order</span>
            </button>
            <p
              v-if="message"
              :class="{
                'text-green-500': message.includes('successfully'),
                'text-red-500': message.includes('Failed'),
              }"
              class="text-center text-sm font-medium"
            >
              {{ message }}
            </p>
            <!-- ... other content ... -->
          </div>
        </div>
      </div>
    </form>
  </section>
  <NotAuthorized v-if="!isSignedIn" />
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useCartStore } from "~/stores/cart"; // Import pushOrder and OrderData/ Import useRuntimeConfig
import { postOrder } from "~/composables/createNewOrder";
import type { OrderData } from "~/constants";
const config = useRuntimeConfig().public;
import { useUser } from "@clerk/vue";
import { NotAuthorized } from "#components";
const { isLoaded, isSignedIn, user } = useUser();

// Form data structure
interface FormData {
  name: string;
  country: string;
  city: string;
  phone: string;
  address: string;
}

// Initialize form data
const formData = ref<FormData>({
  name: "",
  country: "Bangladesh",
  city: "",
  phone: "",
  address: "",
});

// State for loading and messages
const loading = ref(false);
const message = ref("");

// Cart calculations
const cartStore = useCartStore();
const shipping = 150;
const taxRate = 0.02; // 2% tax

const { items: cartItems } = storeToRefs(cartStore);

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

async function addNewOrder() {
  loading.value = true;
  message.value = "";

  if (
    !formData.value.name ||
    !formData.value.city ||
    !formData.value.phone ||
    !formData.value.address
  ) {
    message.value = "Please fill in all required delivery details.";
    loading.value = false;
    return; // Stop execution if validation fails
  }

  if (cartItems.value.length === 0) {
    message.value =
      "Your cart is empty. Please add items before confirming your order.";
    loading.value = false;
    return; // Stop execution if cart is empty
  }

  try {
    function base64ToFile(base64: string, filename: string): File {
      const arr = base64.split(",");
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      return new File([u8arr], filename, { type: mime });
    }

    // if (cartItems.value[0]?.prescription) {
    //   const prescription = cartItems.value[0]?.prescription;
    //   const file = base64ToFile(
    //     prescription,
    //     `${cartItems.value[0]?.prescription}`
    //   );
    //   const result = await uploadPrescription(file, config);
    //   prescriptions.value.prescription1 = result.$id;
    // }

    type PrescriptionsData = {
      prescription1: string;
      prescription2: string;
      prescription3: string;
      prescription4: string;
    };

    const prescriptions = ref<PrescriptionsData>({
      prescription1: "N/A",
      prescription2: "N/A",
      prescription3: "N/A",
      prescription4: "N/A",
    });

    // Upload prescriptions
    for (let i = 0; i < cartItems.value.length && i < 4; i++) {
      const prescription = cartItems.value[i]?.prescription;
      if (prescription) {
        const file = base64ToFile(prescription, `prescription${i + 1}.png`);
        const result = await uploadPrescription(file, config);

        const key = `prescription${i + 1}` as keyof PrescriptionsData;
        prescriptions.value[key] = result.$id;
      }
    }

    // const prescriptions = await uploadPrescription(cartItems.value[0]?.prescription, config.public);

    const lensDetails = cartItems.value
      .map((item) => {
        const features = item.features?.join(", ") || "N/A";
        return `package[${item.$id}]: ${
          item.package?.name || "N/A"
        } - LensType: ${features}`;
      })
      .join(" | ");

    let userEmail = "";
    if (user.value) {
      userEmail = user.value.primaryEmailAddress?.emailAddress || "N/A";
    }

    const orderData: OrderData = {
      userName: formData.value.name,
      area: formData.value.city,
      phone: formData.value.phone,
      deliveryAddress: formData.value.address,
      product1: `${cartItems.value[0]?.$id || "N/A"} - Q: ${
        cartItems.value[0]?.quantity || "N/A"
      }`,
      product2: `${cartItems.value[1]?.$id || "N/A"} - Q: ${
        cartItems.value[1]?.quantity || "N/A"
      }`,
      prescriptions: `${cartItems.value[0]?.$id}: ${prescriptions.value.prescription1} & ${cartItems.value[1]?.$id}: ${prescriptions.value.prescription2}`,
      lens: lensDetails,
      email: userEmail,
    };
    const result = await postOrder(orderData, config);
    console.log("Order placed successfully:", result);
    message.value = "Order placed successfully! 🎉";
  } catch (err: any) {
    console.error("Order failed:", err);
    message.value = "Failed to place order. Please try again. 😔";
  } finally {
    loading.value = false;
  }
}
</script>
