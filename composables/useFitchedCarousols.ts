import type { RuntimeConfig } from "@nuxt/schema";
import type { Carousol } from "~/constants";

export const fetchCarosuls = async (
  config: RuntimeConfig["public"]
): Promise<Carousol[]> => {
  const endpoint = config.APPWRITE_ENDPOINT;
  const databaseId = config.APPWRITE_DB_ID;
  const collectionId = config.APPWRITE_CAROSUL_COLLECTION_ID;
  const projectId = config.APPWRITE_PROJECT_ID;
  const apiKey = config.APPWRITE_API_KEY;

  const limit = 250;
  let offset = 0;
  let carousols: Carousol[] = [];

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
        (doc): Carousol => ({
          ...doc,
          carouso: typeof doc.carouso === "number" ? doc.carouso : 0, // Ensure 'product' field
        })
      );

      carousols = carousols.concat(formatted);

      if (data.total <= offset + limit) break;
      offset += limit;
    }
    return carousols;
  } catch (error) {
    console.error("❌ Failed to fetch products:", error);
    throw error;
  }
};
