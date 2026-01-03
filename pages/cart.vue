<template>
  <!-- Empty Cart -->
  <div
    v-if="cartItems.length === 0"
    class="bg-white rounded-lg shadow-md p-6 text-center"
  >
    <i class="fas fa-shopping-cart text-gray-300 text-5xl mb-4"></i>
    <p class="text-xl text-gray-500">Your cart is empty</p>
    <router-link
      to="/"
      class="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
    >
      Continue Shopping
    </router-link>
  </div>

  <!-- List of items -->
  <div v-else class="bg-gray-100 h-screen py-8">
    <div class="container mx-auto px-4">
      <h1 class="text-2xl font-semibold mb-4">Shopping Cart</h1>

      <div class="bg-white p-4 mb-4 rounded shadow-md text-black">
        <div class="flex flex-col md:flex-row gap-4">
          <div class="md:w-3/4">
            <div
              class="bg-white rounded-lg shadow-md p-6 mb-4"
              v-for="(item, index) in cartItems"
              :key="index"
            >
              <table class="w-full">
                <thead>
                  <tr>
                    <th class="text-left font-semibold">Product</th>
                    <th class="text-left font-semibold">Price</th>
                    <th class="text-left font-semibold">Quantity</th>
                    <th class="text-left font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="py-4">
                      <div class="flex items-center">
                        <img
                          class="h-16 w-16 mr-4"
                          src="https://via.placeholder.com/150"
                          alt="Product image"
                        />
                        <span class="font-semibold">{{ item.name }}</span>
                      </div>
                    </td>
                    <td class="py-4">{{ item.perPieceRate }}</td>
                    <td class="py-4">
                      <div class="flex items-center">
                        <button class="border rounded-md py-2 px-4 mr-2">
                          -
                        </button>
                        <span class="text-center w-8">1</span>
                        <button class="border rounded-md py-2 px-4 ml-2">
                          +
                        </button>
                      </div>
                    </td>
                    <td class="py-4">$19.99</td>
                  </tr>
                  <!-- More product rows -->
                </tbody>
              </table>
            </div>
          </div>
          <div class="md:w-1/4">
            <div class="bg-white rounded-lg shadow-md p-6">
              <h2 class="text-lg font-semibold mb-4">Summary</h2>
              <div class="flex justify-between mb-2">
                <span>Subtotal</span>
                <span>$19.99</span>
              </div>
              <div class="flex justify-between mb-2">
                <span>Taxes</span>
                <span>$1.99</span>
              </div>
              <div class="flex justify-between mb-2">
                <span>Shipping</span>
                <span>$0.00</span>
              </div>
              <hr class="my-2" />
              <div class="flex justify-between mb-2">
                <span class="font-semibold">Total</span>
                <span class="font-semibold">$21.98</span>
              </div>
              <button
                class="bg-blue-500 text-white py-2 px-4 rounded-lg mt-4 w-full"
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from "vue";

interface CartItem {
  name: string;
  model: string;
  hsCode: string;
  quantity: number;
  weight: number;
  perPieceRate: number;
  totalPrice: number;
  color: string;
  deliveryMethod: string;
  description: string;
  image?: string;
}

const cartItems = reactive<CartItem[]>([
  {
    name: "Laptop",
    model: "XPS 13",
    hsCode: "847130",
    quantity: 1,
    weight: 2.5,
    perPieceRate: 999.99,
    totalPrice: 999.99,
    color: "Silver",
    deliveryMethod: "Air",
    description:
      "A powerful and lightweight laptop with excellent performance.",
    image: "https://via.placeholder.com/150",
  },
  {
    name: "Smartphone",
    model: "iPhone 14",
    hsCode: "851712",
    quantity: 2,
    weight: 0.5,
    perPieceRate: 799.99,
    totalPrice: 1599.98,
    color: "Black",
    deliveryMethod: "Ship",
    description: "The latest iPhone with advanced camera and processing power.",
    image: "https://via.placeholder.com/150",
  },
]);

function removeItem(index: number) {
  if (confirm("Are you sure you want to remove this item?")) {
    cartItems.splice(index, 1);
  }
}

function incrementQuantity(index: number) {
  cartItems[index].quantity++;
  updateTotalPrice(index);
}

function decrementQuantity(index: number) {
  if (cartItems[index].quantity > 1) {
    cartItems[index].quantity--;
    updateTotalPrice(index);
  }
}

function updateTotalPrice(index: number) {
  cartItems[index].totalPrice =
    cartItems[index].quantity * cartItems[index].perPieceRate;
}

function getColorHex(color: string) {
  const colorMap: Record<string, string> = {
    Black: "#000000",
    Silver: "#C0C0C0",
    Blue: "#0047AB",
    Red: "#FF0000",
    White: "#FFFFFF",
  };
  return colorMap[color] || "#000000";
}

const discount = 0; // Optional promo feature placeholder

const subtotal = computed(() =>
  cartItems.reduce((sum, item) => sum + item.totalPrice, 0)
);

const shippingCost = computed(() => 5); // Could be dynamic

const tax = computed(() => (subtotal.value - discount) * 0.075);

const total = computed(
  () => subtotal.value + shippingCost.value + tax.value - discount
);
</script>

<style scoped>
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
