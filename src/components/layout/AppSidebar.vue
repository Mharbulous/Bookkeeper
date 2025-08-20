<template>
  <nav
    class="w-[60px] bg-gradient-to-b from-slate-800 to-slate-700 text-white transition-all duration-300 ease-in-out fixed left-0 top-0 h-screen z-[1000] overflow-hidden hover:w-[280px] group"
    id="app-sidebar"
  >
    <div class="p-5 border-b border-slate-600 h-20 flex items-center relative">
      <div
        class="font-bold text-lg whitespace-nowrap opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100"
      >
Vue Template
      </div>
      <div
        class="absolute right-5 top-1/2 transform -translate-y-1/2 text-base text-slate-400 opacity-100 transition-all duration-300 ease-in-out before:content-['❯'] group-hover:before:content-['❮']"
      ></div>
    </div>

    <div class="py-0">
      <router-link
        to="/"
        class="flex items-center py-3 px-3 text-slate-300 no-underline transition-all duration-200 ease-in-out relative cursor-pointer hover:bg-slate-600 hover:text-white"
        :class="{ 'bg-brand-blue text-white': $route.path === '/' || $route.path === '/home' }"
      >
        <div class="min-w-[30px] h-[30px] mr-3 flex items-center justify-center">🏠</div>
        <span
          class="whitespace-nowrap opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100"
          >Home</span
        >
      </router-link>
    </div>

    <div class="py-0">
      <div
        class="py-5 px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100"
      >
        Main Menu
      </div>
      <router-link
        to="/about"
        class="flex items-center py-3 px-3 text-slate-300 no-underline transition-all duration-200 ease-in-out relative cursor-pointer hover:bg-slate-600 hover:text-white"
        :class="{ 'bg-brand-blue text-white': $route.path === '/about' }"
      >
        <div class="min-w-[30px] h-[30px] mr-3 flex items-center justify-center">ℹ️</div>
        <span
          class="whitespace-nowrap opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100"
          >About</span
        >
      </router-link>
    </div>

  </nav>
</template>

<script>
export default {
  name: 'AppSidebar',
};
</script>
