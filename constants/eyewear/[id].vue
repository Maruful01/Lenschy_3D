<template>
    <div class="container mx-auto p-6">
      <EyewearProduct
        v-if="product"
        :image="product.image"
        :thumbnails="product.thumbnails"
        :title="product.title"
        :rating="product.rating"
        :reviews="product.reviews"
        :price="product.price"
        :rushDelivery="product.rushDelivery"
        :availableColors="product.colors"
      />
  
      <EyewearDetails
        v-if="product"
        :frameWidth="product.frameWidth"
        :bridge="product.bridge"
        :lensWidth="product.lensWidth"
        :lensHeight="product.lensHeight"
        :templeLength="product.templeLength"
        :size="product.size"
        :material="product.material"
        :weight="product.weight"
        :shape="product.shape"
        :feature="product.feature"
        :pdRange="product.pdRange"
        :prescriptionRange="product.prescriptionRange"
        :availableAsReaders="product.availableAsReaders"
        :availableAsProgressive="product.availableAsProgressive"
      />
  
      <div v-else class="text-center text-gray-500">Loading...</div>
    </div>
  </template>
  
  <script setup>
  import { useRoute } from 'vue-router';
  import { ref, onMounted } from 'vue';
  import EyewearProduct from '@/components/EyewearProduct.vue';
  import EyewearDetails from '@/components/EyewearDetails.vue';
  
  // Get route parameter
  const route = useRoute();
  const product = ref(null);
  
  const fetchProduct = async () => {
    try {
      // Simulate fetching product data from an API
      const products = [
        {
          id: '7813125',
          image: 'https://example.com/main-image.jpg',
          thumbnails: [
            'https://example.com/thumb1.jpg',
            'https://example.com/thumb2.jpg',
            'https://example.com/thumb3.jpg',
          ],
          title: 'Square Glasses',
          rating: 4.5,
          reviews: 1611,
          price: 15.95,
          rushDelivery: 19,
          colors: ['#cfcfcf', '#ffcccc', '#000000'],
          frameWidth: 130,
          bridge: 17,
          lensWidth: 53,
          lensHeight: 43,
          templeLength: 140,
          size: 'Adult Medium',
          material: 'Mixed',
          weight: 'Lightweight',
          shape: 'Square',
          feature: 'Universal Bridge Fit',
          pdRange: '57-79',
          prescriptionRange: '-20.00 to +12.00',
          availableAsReaders: true,
          availableAsProgressive: true,
        },
      ];
  
      // Find the product by ID
      product.value = products.find((p) => p.id === route.params.id);
    } catch (error) {
      console.error('Failed to fetch product:', error);
    }
  };
  
  // Fetch product when the component is mounted
  onMounted(fetchProduct);
  </script>
  
  