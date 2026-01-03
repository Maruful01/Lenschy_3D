export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    "@nuxt/ui",
    "@nuxt/image",
    "@ant-design-vue/nuxt",
    "@pinia/nuxt",
    "nuxt-swiper",
    "@clerk/nuxt",
    "@nuxtjs/sitemap",
    "@nuxtjs/robots",
    "@tresjs/nuxt",
  ],

  sitemap: {
    sources: ["/api/urls"],
    exclude: [
      "/_document",
      "/about",
      "/cart",
      "/checkout",
      "/error",
      "/products",
      "/user",
    ],
  },
  // sitemap: {
  //   sources: ["/api/urls"],
  //   exclude: [
  //     "/_document",
  //     "/about",
  //     "/cart",
  //     "/checkout",
  //     "/error",
  //     "/products",
  //     "/user",
  //   ],
  // },
  app: {
    head: {
      title: "Lenschy",
    },
  },
  components: true,

  image: {
    domains: ["cloud.appwrite.io"],
  },

  robots: {
    groups: [{ userAgent: "*", allow: "/" }],
    sitemap: ["https://www.lenschy.com/sitemap.xml"],
  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  css: ["swiper/css"],
  site: {
    url: "https://www.lenschy.com", // no trailing slash
  },

  // vue: {
  //   compilerOptions: {
  //     isCustomElement: (tag) => tag === 'Button',
  //   },
  // },

  ssr: true,
  // compatibilityDate: '2025-02-14',
  runtimeConfig: {
    public: {
      appwriteStorage: "https://cloud.appwrite.io/v1/storage/buckets",
      APPWRITE_ENDPOINT: process.env.NUXT_PUBLIC_APPWRITE_ENDPOINT,
      APPWRITE_PRESCRIPTION_BUCKET:
        process.env.NUXT_PUBLIC_APPWRITE_PRESCRIPTION_BUCKET,
      APPWRITE_DB_ID: process.env.NUXT_PUBLIC_APPWRITE_DB_ID,
      APPWRITE_PRODUCT_COLLECTION_ID:
        process.env.NUXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID,
      APPWRITE_ORDER_COLLECTION_ID:
        process.env.NUXT_PUBLIC_APPWRITE_ORDER_COLLECTION_ID,
      APPWRITE_PROJECT_ID: process.env.NUXT_PUBLIC_APPWRITE_PROJECT_ID,
      APPWRITE_CAROSUL_COLLECTION_ID:
        process.env.NUXT_PUBLIC_APPWRITE_CAROSUL_COLLECTION_ID,
      APPWRITE_API_KEY: process.env.NUXT_PUBLIC_APPWRITE_API_KEY,
      GOOGLE_GEMINI_API_KEY: process.env.NUXT_PUBLIC_GOOGLE_GEMINI_API_KEY,
      clerkPublishableKey: process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      clerkFrontendApi: process.env.NUXT_CLERK_SECRET_KEY,
      AI_PROMPT: process.env.NUXT_PUBLIC_AI_PROMPT,
    },
  },

  compatibilityDate: "2025-09-29",
});
