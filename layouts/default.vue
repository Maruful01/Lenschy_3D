<template>
  <div class="overflow-hidden">
    <header class="padding-x z-10 w-full">
      <NavBar />
    </header>

    <div class="mx-auto bg-skyblue rounded-tl-[50px] rounded-tr-[50px]">
      <slot />
    </div>
    <Footer />
  </div>
</template>
