import { Client, Account, ID, Databases, Query } from "appwrite";

// ✅ Initialize Appwrite Client
export const client = new Client()
  .setEndpoint(process.env.NUXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NUXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.NUXT_PUBLIC_APPWRITE_API_KEY);

// ✅ Initialize Services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { Query };

// Example: How to use databases.listDocuments
const listDocuments = async () => {
  try {
    const response = await databases.listDocuments(
      process.env.NUXT_PUBLIC_APPWRITE_DB_ID,
      process.env.NUXT_PUBLIC_APPWRITE_PRODUCT_COLLECTION_ID,
      [Query.equal("title", "Hamlet")]
    );
    console.log("Documents listed successfully:", response);
  } catch (error) {
    console.error("Error listing documents:", error);
  }
};

const createDocument = async (data) => {
  const newOrder = { data: data };
  const response = await databases.databases.createDocument(
    process.env.NUXT_PUBLIC_APPWRITE_DB_ID,
    process.env.NUXT_PUBLIC_APPWRITE_ORDER_COLLECTION_ID,
    ID.unique(),
    newOrder
  );
  const order = {
    $id: response.$id,
    $createdAt: response.$createdAt,
    order: response.data,
  };

  return order;
};

export { listDocuments, createDocument };
