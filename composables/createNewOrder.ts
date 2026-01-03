import type { OrderData } from "~/constants";
import { ID } from "appwrite";
import type { RuntimeConfig } from "@nuxt/schema";

export async function postOrder(
  orderData: OrderData,
  config: RuntimeConfig["public"]
) {
  const endpoint = config.APPWRITE_ENDPOINT as string;
  const databaseId = config.APPWRITE_DB_ID as string;
  const collectionId = config.APPWRITE_ORDER_COLLECTION_ID as string;
  const projectId = config.APPWRITE_PROJECT_ID as string;
  const apiKey = config.APPWRITE_API_KEY as string;
  const url = `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents`;
  console.log("Final URL:", url);

  const payload = {
    documentId: ID.unique(),
    data: orderData,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  console.log(json);

  if (!res.ok) {
    throw new Error(`Appwrite error: ${res.status} ${JSON.stringify(json)}`);
  }

  return json;
}
