import { Client, Account, ID, Databases, Query, Storage } from "appwrite";

// Note: useRuntimeConfig() is only available within the Nuxt context (composables, components, etc.)
// For this utility file, we can export a function to initialize or use a client,
// or rely on the fact that it's mostly used in a way that Nuxt will handle.
// However, to keep it simple and fix the immediate issue of process.env and leaking keys:

export const getAppwriteClient = () => {
  const config = useRuntimeConfig().public;
  const client = new Client()
    .setEndpoint(config.APPWRITE_ENDPOINT)
    .setProject(config.APPWRITE_PROJECT_ID);

  // Only set the API key on the server to prevent leaking it to the client
  if (import.meta.server && config.APPWRITE_API_KEY) {
    client.setKey(config.APPWRITE_API_KEY);
  }

  return client;
};

// Services initialized on demand to ensure they use the correct config
export const getAccount = () => new Account(getAppwriteClient());
export const getDatabases = () => new Databases(getAppwriteClient());
export const getStorage = () => new Storage(getAppwriteClient());

export { Query, ID };

// Example: How to use databases.listDocuments
export const listDocuments = async () => {
  const config = useRuntimeConfig().public;
  const databases = getDatabases();
  try {
    const response = await databases.listDocuments(
      config.APPWRITE_DB_ID,
      config.APPWRITE_PRODUCT_COLLECTION_ID,
      [Query.equal("title", "Hamlet")]
    );
    console.log("Documents listed successfully:", response);
    return response;
  } catch (error) {
    console.error("Error listing documents:", error);
    throw error;
  }
};

export const createDocument = async (data) => {
  const config = useRuntimeConfig().public;
  const databases = getDatabases();

  const newOrder = { data: data };
  const response = await databases.createDocument(
    config.APPWRITE_DB_ID,
    config.APPWRITE_ORDER_COLLECTION_ID,
    ID.unique(),
    data // Assuming data is the document body
  );

  return {
    $id: response.$id,
    $createdAt: response.$createdAt,
    order: response,
  };
};
