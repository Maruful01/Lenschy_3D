import { defineNuxtPlugin, useRuntimeConfig } from "#app";
import { Client, Account, Databases } from "appwrite";

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return; // Only run on client

  const config = useRuntimeConfig().public;

  // ✅ FIXED: Correct key names
  if (!config.APPWRITE_ENDPOINT || !config.APPWRITE_PROJECT_ID) {
    throw new Error("❌ Appwrite endpoint or project ID is missing!");
  }

  const client = new Client()
    .setEndpoint(config.APPWRITE_ENDPOINT)
    .setProject(config.APPWRITE_PROJECT_ID);

  const account = new Account(client);
  const databases = new Databases(client);

  nuxtApp.provide("appwrite", client);
  nuxtApp.provide("account", account);
  nuxtApp.provide("databases", databases);
});
