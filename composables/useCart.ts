import { ref } from 'vue'
import type { Product } from '~/constants'

export function useCart() {
  const cartItems = ref<Product[]>([])
  const cartCount = ref(0)

  const loadCart = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          cartItems.value = parsed;
        } else {
          cartItems.value = [];
        }
      } catch {
        cartItems.value = [];
      }
    }
  };

  const saveCart = () => {
    if (import.meta.client) {
      localStorage.setItem('cart', JSON.stringify(cartItems.value))
      cartCount.value = cartItems.value.length
    }
  }

  watch(cartItems, () => {
    cartCount.value = cartItems.value.length;
    saveCart();
  }, { deep: true });
  
  

  const addToCart = (product: Product) => {
    if (import.meta.client) {
      loadCart()
      if (cartItems.value) {
        cartItems.value.push(product)
        saveCart()
      } else {
        alert('Maximum 5 items allowed in the cart')
      }
    }
  }

  if (import.meta.client) {
    loadCart()
  }

  return {
    cartItems,
    cartCount,
    addToCart,
  }
}
