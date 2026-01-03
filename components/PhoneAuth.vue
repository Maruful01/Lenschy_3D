<template>
  <form class="px-8 pt-6 pb-8 mb-4 bg-white dark:bg-gray-800 rounded">
    <label
      class="block mb-2 text-sm font-bold text-gray-700 dark:text-white"
      for="firstName"
    >
      Signin with your phone number
    </label>
    <input
      class="w-full px-3 py-2 text-sm leading-tight text-gray-200 dark:text-white border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
      id="phone"
      v-model="phone"
      type="number"
      placeholder="Phone"
    />
    <button
      type="button"
      class="bg-gray-700 text-white font-bold py-2 px-4 w-full rounded hover:bg-gray-600"
      @click="login"
    >
      Send verification code
    </button>
  </form>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useNuxtApp, useState } from "#app";
import { ID } from "appwrite";

const loggedInUser = useState("user", () => null);
const phone = ref("");
const token = ref("");

const { $account } = useNuxtApp();
if (!$account) {
  console.error("Appwrite account is not initialized!");
}

// ✅ Ensure Appwrite is loaded before calling API
onMounted(async () => {
  if ($account) {
    try {
      loggedInUser.value = await $account.get();
    } catch (error) {
      loggedInUser.value = null;
    }
  }
});

// ✅ Login Function
const login = async () => {
  if (!$account) return;
  try {
    errorMessage.value = "Failed";
    token.value = await $account.createPhoneToken(
      ID.unique(),
      "+8801799827366"
    );
    console.log(token);
  } catch (error) {
    console.log(error);
  }
};

// ✅ Register Function
const register = async () => {
  console.log("Clicked!");
  if (!$account) return;
  try {
    errorMessage.value = "Problem!";
    await $account.create(
      ID.unique(),
      email.value,
      password.value,
      name.value,
      "+8801799827366"
    );
    loggedInUser.value = await $account.get();
  } catch (error) {
    errorMessage.value = "Registration failed: " + error.message;
  }
};
</script>
