// uploadPrescription.ts
import { ID } from "appwrite";
import type { RuntimeConfig } from "@nuxt/schema";

/**
 * Uploads a prescription image to Appwrite storage.
 * @param file - The File object to upload (e.g., from an <input type="file" />).
 * @param config - Runtime public config containing Appwrite credentials.
 * @returns The uploaded file's details from Appwrite.
 */
export async function uploadPrescription(
  file: File,
  config: RuntimeConfig["public"]
) {
  const endpoint = "https://fra.cloud.appwrite.io/v1";
  const bucketId = config.APPWRITE_PRESCRIPTION_BUCKET as string;
  const projectId = config.APPWRITE_PROJECT_ID as string;
  const apiKey = config.APPWRITE_API_KEY as string;

  const url = `${endpoint}/storage/buckets/${bucketId}/files`;
  console.log("Upload URL:", url);

  // Prepare multipart form data
  const formData = new FormData();
  formData.append("fileId", ID.unique());
  formData.append("file", file);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
    },
    body: formData,
  });

  const json = await res.json();
  console.log(json);

  if (!res.ok) {
    throw new Error(
      `Appwrite upload error: ${res.status} ${JSON.stringify(json)}`
    );
  }

  return json; // Returns the uploaded file details
}
