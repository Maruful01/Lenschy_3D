// stores/productStore.ts
import { defineStore } from 'pinia'
import type { Product } from '~/constants';

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [] as Product[],
  }),

  actions: {
    setProducts(products: Product[]) {
      this.products = products
    },

    getProductBySlug(slug: string): Product | null {
      const slugify = (text: string) =>
        text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      return this.products.find(
        (product) => slugify(product.title) === slug
      ) || null;
    }
  }
})
