import { defineNuxtRouteMiddleware, navigateTo } from "#app";

export default defineNuxtRouteMiddleware((to) => {
  const user = useState("user", () => null);
  // ✅ Define public pages
  const publicPages = ["/login",]; // Add any public routes here
  const isPublicPage = publicPages.includes(to.path);

  // 🚫 If user is NOT logged in and trying to access a protected page, redirect to login
  if (!user.value && !isPublicPage) {
    return navigateTo("/login");
  }
  // ✅ If user is logged in and trying to access the login page, redirect to home
  if (user.value && to.path === "/login") {
    return navigateTo("/");
  }
  // ✅ Otherwise, allow navigation
});
