// import type { RuntimeConfig } from '@nuxt/schema';

// interface Product {
//     $id: string;
//     title: string;
//     material: string;
//     lensWidth: number;
//     lensHeight: number;
//     bridge: number;
//     templeLength: number;
//     frameWidth: number;
//     description: string;
//     img1: string;
//     img2: string;
//     img3: string;
//     img4: string;
//   }

//   export const fetchProducts = async (config: RuntimeConfig['public']): Promise<Product[]> => {
//     const endpoint = config.APPWRITE_ENDPOINT
//     const databaseId = config.APPWRITE_DB_ID
//     const collectionId = config.APPWRITE_PRODUCT_COLLECTION_ID
//     const projectId = config.APPWRITE_PROJECT_ID
//     const apiKey = config.APPWRITE_API_KEY

//     const limit = 250
//     let offset = 0
//     let products: Product[] = []

//     try {
//       while (true) {
//         const res = await fetch(`${endpoint}/databases/${databaseId}/collections/${collectionId}/documents?limit=${limit}&offset=${offset}`, {
//           method: 'GET',
//           headers: {
//             'X-Appwrite-Project': `${projectId}` || '',
//             'X-Appwrite-Key': `${apiKey}` || ''
//              'Access-Control-Origin': '*'

//           }
//         })

//         if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

//         const data = await res.json()
//         products = products.concat(data.documents as Product[])

//         if (data.total <= offset + limit) break
//         offset += limit
//       }

//       return products
//     } catch (error) {
//       console.error("Failed to fetch products:", error)
//       throw error
//     }
//   }

import type { RuntimeConfig } from "@nuxt/schema";
import type { Product } from "~/constants";

export const fetchProducts = async (
  config: RuntimeConfig["public"]
): Promise<Product[]> => {
  const endpoint = config.APPWRITE_ENDPOINT;
  const databaseId = config.APPWRITE_DB_ID;
  const collectionId = config.APPWRITE_PRODUCT_COLLECTION_ID;
  const projectId = config.APPWRITE_PROJECT_ID;
  const apiKey = config.APPWRITE_API_KEY;

  const limit = 250;
  let offset = 0;
  let products: Product[] = [];

  try {
    while (true) {
      const res = await fetch(
        `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents?limit=${limit}&offset=${offset}`,
        {
          method: "GET",
          headers: {
            "X-Appwrite-Project": projectId,
            "X-Appwrite-Key": apiKey,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`❌ HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      const formatted = (data.documents as any[]).map(
        (doc): Product => ({
          ...doc,
          product: typeof doc.product === "number" ? doc.product : 0, // Ensure 'product' field
        })
      );

      products = products.concat(formatted);

      if (data.total <= offset + limit) break;
      offset += limit;
    }

    return products;
  } catch (error) {
    console.error("❌ Failed to fetch products:", error);
    throw error;
  }
};
