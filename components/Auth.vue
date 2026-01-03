<template>
  <!-- Sign In -->
  <div class="py-16" v-if="!dSignUpComponent">
    <div
      class="flex bg-white rounded-lg shadow-lg overflow-hidden mx-auto max-w-sm lg:max-w-4xl"
    >
      <div
        class="hidden lg:block lg:w-1/2 bg-cover"
        style="
          background-image: url('https://images.unsplash.com/photo-1546514714-df0ccc50d7bf?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=667&q=80');
        "
      ></div>
      <div class="w-full p-8 lg:w-1/2">
        <p class="text-xl text-gray-600 text-center">
          {{
            loggedInUser ? `Logged in as ${loggedInUser.name}` : "Welcome back!"
          }}
        </p>

        <a
          href="#"
          class="flex items-center justify-center mt-4 text-white rounded-lg shadow-md hover:bg-gray-100"
          v-if="!loggedInUser"
        >
          <div class="px-4 py-3">
            <svg class="h-6 w-6" viewBox="0 0 40 40">
              <path
                d="M36.3425 16.7358H35V16.6667H20V23.3333H29.4192C28.045 27.2142 24.3525 30 20 30C14.4775 30 10 25.5225 10 20C10 14.4775 14.4775 9.99999 20 9.99999C22.5492 9.99999 24.8683 10.9617 26.6342 12.5325L31.3483 7.81833C28.3717 5.04416 24.39 3.33333 20 3.33333C10.7958 3.33333 3.33335 10.7958 3.33335 20C3.33335 29.2042 10.7958 36.6667 20 36.6667C29.2042 36.6667 36.6667 29.2042 36.6667 20C36.6667 18.8825 36.5517 17.7917 36.3425 16.7358Z"
                fill="#FFC107"
              />
              <path
                d="M5.25497 12.2425L10.7308 16.2583C12.2125 12.59 15.8008 9.99999 20 9.99999C22.5491 9.99999 24.8683 10.9617 26.6341 12.5325L31.3483 7.81833C28.3716 5.04416 24.39 3.33333 20 3.33333C13.5983 3.33333 8.04663 6.94749 5.25497 12.2425Z"
                fill="#FF3D00"
              />
              <path
                d="M20 36.6667C24.305 36.6667 28.2167 35.0192 31.1742 32.34L26.0159 27.975C24.3425 29.2425 22.2625 30 20 30C15.665 30 11.9842 27.2359 10.5975 23.3784L5.16254 27.5659C7.92087 32.9634 13.5225 36.6667 20 36.6667Z"
                fill="#4CAF50"
              />
              <path
                d="M36.3425 16.7358H35V16.6667H20V23.3333H29.4192C28.7592 25.1975 27.56 26.805 26.0133 27.9758C26.0142 27.975 26.015 27.975 26.0158 27.9742L31.1742 32.3392C30.8092 32.6708 36.6667 28.3333 36.6667 20C36.6667 18.8825 36.5517 17.7917 36.3425 16.7358Z"
                fill="#1976D2"
              />
            </svg>
          </div>
          <h1
            class="px-4 py-3 w-5/6 text-center text-gray-600 font-bold"
            v-if="!loggedInUser"
            @click="loginWithGoogle"
          >
            Sign in with Google
          </h1>
        </a>
        <div
          class="mt-4 flex items-center justify-between"
          v-if="!loggedInUser"
        >
          <span class="border-b w-1/5 lg:w-1/4"></span>
          <a href="#" class="text-xs text-center text-gray-700 uppercase"
            >or login with email</a
          >
          <span class="border-b w-1/5 lg:w-1/4"></span>
        </div>
        <div class="mt-4" v-if="!loggedInUser">
          <label class="block text-gray-700 text-sm font-bold mb-2"
            >Email Address</label
          >
          <input
            v-model="email"
            class="bg-gray-200 text-gray-700 focus:outline-none focus:shadow-outline border border-gray-300 rounded py-2 px-4 block w-full appearance-none"
            type="email"
            placeholder="example@gmail.com"
          />
        </div>
        <div class="mt-4" v-if="!loggedInUser">
          <div class="flex justify-between">
            <label class="block text-gray-700 text-sm font-bold mb-2"
              >Password</label
            >
            <a href="#" class="text-xs text-gray-500">Forget Password?</a>
          </div>
          <input
            v-model="password"
            class="bg-gray-200 text-gray-700 focus:outline-none focus:shadow-outline border border-gray-300 rounded py-2 px-4 block w-full appearance-none"
            type="password"
            placeholder="********"
          />
        </div>
        <div class="mt-8" v-if="!loggedInUser">
          <button
            type="button"
            @click="login"
            class="bg-gray-700 text-white font-bold py-2 px-4 w-full rounded hover:bg-gray-600"
          >
            Login
          </button>
        </div>

        <div class="mt-8" v-if="loggedInUser">
          <button
            type="button"
            @click="logout"
            class="bg-gray-700 text-white font-bold py-2 px-4 w-full rounded hover:bg-gray-600"
          >
            Sign Out
          </button>
        </div>
        <div
          class="mt-4 flex items-center justify-between"
          v-if="!loggedInUser"
        >
          <span class="border-b w-1/5 md:w-1/4"></span>
          <a
            href="#"
            @click.prevent="dSignUpComponent = !dSignUpComponent"
            class="text-xs text-gray-500 uppercase cursor-pointer"
            >or sign up</a
          >
          <span class="border-b w-1/5 md:w-1/4"></span>
        </div>
      </div>
    </div>
  </div>

  <!-- Sign Up -->
  <div v-if="dSignUpComponent" class="h-full bg-gray-400 dark:bg-gray-400">
    <!-- Container -->
    <div class="mx-auto">
      <div class="flex justify-center px-2 md:px-6 py-6 md:py-12">
        <!-- Row -->
        <div class="w-full xl:w-3/4 lg:w-11/12 flex">
          <!-- Col -->
          <div
            class="w-full h-auto bg-gray-400 dark:bg-gray-200 hidden lg:block lg:w-5/12 bg-cover rounded-l-lg"
            style="
              background-image: url('https://images.unsplash.com/photo-1546514714-df0ccc50d7bf?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=667&q=80');
            "
          ></div>
          <!-- Col -->
          <div
            class="w-full lg:w-7/12 bg-white dark:bg-gray-400 p-4 md:p-5 rounded-lg lg:rounded-l-none"
          >
            <h3 class="py-4 text-2xl text-center text-gray-800 dark:text-white">
              Create an Account!
            </h3>
            <form
              class="px-0 md:px-8 pt-2 md:pt-6 pb-8 mb-4 bg-white dark:bg-gray-400 rounded"
            >
              <div class="mb-4 md:flex md:justify-between">
                <div class="mb-4 md:mr-2 md:mb-0">
                  <label
                    class="block mb-2 text-sm font-bold text-gray-700 dark:text-white"
                    for="firstName"
                  >
                    First Name
                  </label>
                  <input
                    class="w-full px-3 py-2 text-sm leading-tight bg-gray-200 dark:text-white border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
                    v-model="name"
                    type="text"
                    placeholder="First Name"
                  />
                </div>
                <div class="md:ml-2">
                  <label
                    class="block mb-2 text-sm font-bold text-gray-700 dark:text-white"
                    for="lastName"
                  >
                    Last Name
                  </label>
                  <input
                    class="w-full px-3 py-2 text-sm leading-tight bg-gray-200 dark:text-white border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
                    id="lastName"
                    type="text"
                    placeholder="Last Name"
                  />
                </div>
              </div>
              <div class="mb-4">
                <label
                  class="block mb-2 text-sm font-bold text-gray-700 dark:text-white"
                  for="email"
                >
                  Email
                </label>
                <input
                  class="w-full px-3 py-2 mb-3 text-sm leading-tight bg-gray-200 dark:text-white border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
                  id="email"
                  v-model="email"
                  type="email"
                  placeholder="Email"
                />
              </div>

              <div class="mb-4">
                <label
                  class="block mb-2 text-sm font-bold text-gray-700 dark:text-white"
                  for="phone"
                >
                  Phone
                </label>
                <input
                  class="w-full px-3 py-2 mb-3 text-sm leading-tight bg-gray-200 dark:text-white border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
                  id="phone"
                  v-model="phone"
                  type="number"
                  placeholder="Phone"
                />
              </div>
              <div class="mb-4 md:flex md:justify-between">
                <div class="mb-4 md:mr-2 md:mb-0">
                  <label
                    class="block mb-2 text-sm font-bold text-gray-700 dark:text-white"
                    for="password"
                  >
                    Password
                  </label>
                  <input
                    class="w-full px-3 py-2 mb-3 text-sm leading-tight bg-gray-200 dark:text-white border border-red-500 rounded shadow appearance-none focus:outline-none focus:shadow-outline"
                    v-model="password"
                    type="password"
                    placeholder="Password"
                  />
                  <p class="text-xs italic text-red-500">
                    Please choose a password.
                  </p>
                </div>
                <div class="md:ml-2">
                  <label
                    class="block mb-2 text-sm font-bold text-gray-700 dark:text-white"
                    for="c_password"
                  >
                    Confirm Password
                  </label>
                  <input
                    class="w-full px-3 py-2 mb-3 text-sm leading-tight bg-gray-200 dark:text-white border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
                    id="c_password"
                    v-model="newPassword"
                    type="password"
                    placeholder="Password"
                  />
                </div>
              </div>
              <div class="mb-6 text-center">
                <button
                  class="w-full px-4 py-2 font-bold text-white bg-blue-500 rounded-full hover:bg-blue-700 dark:bg-blue-700 dark:text-white dark:hover:bg-blue-900 focus:outline-none focus:shadow-outline"
                  type="button"
                  @click="register"
                >
                  Register Account
                </button>
              </div>
              <hr class="mb-6 border-t" />
              <div class="text-center">
                <a
                  class="inline-block text-sm text-blue-500 dark:text-blue-500 align-baseline hover:text-blue-800"
                  href="#"
                >
                  Forgot Password?
                </a>
              </div>
              <div class="text-center">
                <a
                  class="inline-block text-sm text-blue-500 dark:text-blue-500 align-baseline hover:text-blue-800"
                  href="./index.html"
                  @click.prevent="dSignUpComponent = !dSignUpComponent"
                >
                  Already have an account? Login!
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useNuxtApp, useState } from "#app";
import { ID, OAuthProvider } from "appwrite";

const dSignUpComponent = ref(false);

definePageMeta({ middleware: "auth" });

const loggedInUser = useState("user", () => null);
const email = ref("");
const name = ref("");
const errorMessage = ref("");
const password = ref("");
const confirmPassword = ref("");
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
    await $account.createEmailPasswordSession(email.value, password.value);
    loggedInUser.value = await $account.get();
  } catch (error) {
    errorMessage.value = "Login failed: " + error.message;
  }
  console.log("user clicked", loggedInUser.value);
};

const loginWithGoogle = async () => {
  if (!$account) return;
  try {
    errorMessage.value = "Failed";
    await $account.createOAuth2Session(
      OAuthProvider.Google,
      "http://localhost:3000/products",
      "http://localhost:3000/"
    );
    loggedInUser.value = await $account.get();
  } catch (error) {
    errorMessage.value = "Login failed: " + error.message;
  }
  console.log("user clicked", loggedInUser.value);
};

const createPhoneOTP = async () => {
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

// ✅ OAuth 2 login Function
const oauthLogin = async () => {
  console.log("Clicked!");
  if (!$account) return;
  try {
    errorMessage.value = "Problem!";
    await $account.createOAuth2Session(
      OAuthProvider.Github, // provider
      "/", // redirect here on success
      "https://example.com/failed", // redirect here on failure
      ["repo", "user"] // scopes (optional)
    );
    loggedInUser.value = await $account.get();
  } catch (error) {
    errorMessage.value = "Registration failed: " + error.message;
  }
};

// ✅ Logout Function
const logout = async () => {
  if (!$account) return;
  try {
    errorMessage.value = "";
    await $account.deleteSession("current");
    loggedInUser.value = null;
  } catch (error) {
    errorMessage.value = "Logout failed: " + error.message;
  }
};
</script>
