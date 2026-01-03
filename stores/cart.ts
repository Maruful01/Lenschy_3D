import { defineStore } from "pinia";
import type { CartProduct } from "~/constants/index";
import type { LensSelection } from "~/constants/index";
// Define LensSelection interface

// Define CartProduct interface

// Define CartItem interface
export interface CartItem extends CartProduct {
  quantity: number;
}

export const useCartStore = defineStore("cart", {
  state: () => ({
    items: [] as CartItem[],
  }),
  getters: {
    cartCount: (state) => state.items.length,
    cartTotal: (state) => {
      return state.items.reduce((total, item) => {
        const basePrice = item.price * item.quantity;
        const lensPrice = item.package?.price || 0;
        return total + basePrice + lensPrice;
      }, 0);
    },
  },
  actions: {
    addToCart(product: CartProduct) {
      const exists = this.items.find((item) => item.$id === product.$id);

      if (!exists) {
        if (this.items.length < 15) {
          this.items.push({
            ...product,
            quantity: 1,
          });
          this.saveToLocal();
        } else {
          alert("Maximum 15 items allowed in the cart");
        }
      } else {
        if (exists.quantity < 4) {
          exists.quantity++;
          // Update lens selection if provided
          if (
            product.package ||
            product.features.length ||
            product.prescription
          ) {
            exists.package = product.package;
            exists.features = product.features;
            exists.prescription = product.prescription;
          }
          this.saveToLocal();
        }
      }
    },

    updateQuantity(id: string, newQuantity: number) {
      const item = this.items.find((item) => item.$id === id);
      if (item) {
        item.quantity = Math.max(1, Math.min(4, newQuantity));
        this.saveToLocal();
      }
    },

    removeFromCart(id: string) {
      this.items = this.items.filter((item) => item.$id !== id);
      this.saveToLocal();
    },

    clearCart() {
      this.items = [];
      this.saveToLocal();
    },

    saveToLocal() {
      localStorage.setItem("cartItems", JSON.stringify(this.items));
    },

    loadFromLocal() {
      const saved = localStorage.getItem("cartItems");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          this.items = parsed.map((item: any) => {
            // Ensure quantity exists
            if (item.quantity === undefined) {
              return { ...item, quantity: 1 };
            }
            return item;
          });
        } catch (error) {
          console.error("Failed to parse cart data from localStorage", error);
        }
      }
    },

    // Update lens selection for an existing cart item
    updateLensSelection(id: string, lensSelection: LensSelection) {
      const item = this.items.find((item) => item.$id === id);
      if (item) {
        item.package = lensSelection.package;
        item.features = lensSelection.features;
        item.prescription = lensSelection.prescription;
        this.saveToLocal();
      }
    },
  },
});
