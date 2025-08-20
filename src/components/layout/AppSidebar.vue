<template>
  <nav
    class="w-[60px] bg-gradient-to-b from-slate-800 to-slate-700 text-white transition-all duration-300 ease-in-out fixed left-0 top-0 h-screen z-[1000] overflow-hidden hover:w-[280px] group"
    id="app-sidebar"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="p-5 border-b border-slate-600 h-20 flex items-center relative">
      <!-- Text that appears on hover -->
      <div
        class="absolute left-5 top-1/2 transform -translate-y-1/2 font-bold text-lg whitespace-nowrap text-white transition-opacity duration-300 ease-in-out"
        :class="{ 'opacity-100': isHovered, 'opacity-0': !isHovered }"
      >
Coryphaeus
      </div>
      <!-- Icon that appears when collapsed -->
      <div
        class="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ease-in-out"
        :class="{ 'opacity-0': isHovered, 'opacity-100': !isHovered }"
      >
        <img src="/src/assets/images/BDLC Logo transparent.png" alt="Logo" class="w-8 h-8 object-cover rounded" />
      </div>
      <div
        class="absolute right-2 top-1/2 transform -translate-y-1/2 text-base text-slate-400 opacity-100 transition-all duration-300 ease-in-out before:content-['❯'] group-hover:before:content-['❮']"
      ></div>
    </div>

    <div class="py-0">
      <!-- App Switcher with integrated dropdown -->
      <AppSwitcher :is-hovered="isHovered" />
    </div>

    <div class="py-0">
      <div
        class="py-5 px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 transition-opacity duration-300 ease-in-out"
        :class="{ 'opacity-100': isHovered, 'opacity-0': !isHovered }"
      >
        Main Menu
      </div>
      <router-link
        to="/upload"
        class="flex items-center py-3 px-3 text-slate-300 no-underline transition-all duration-200 ease-in-out relative cursor-pointer hover:bg-slate-600 hover:text-white"
        :class="{ 'bg-brand-blue text-white': $route.path === '/upload' }"
      >
        <div class="min-w-[30px] h-[30px] mr-3 flex items-center justify-center">📤</div>
        <span
          class="whitespace-nowrap transition-opacity duration-300 ease-in-out"
          :class="{ 'opacity-100': isHovered, 'opacity-0': !isHovered }"
          >Uploads</span
        >
      </router-link>
      <router-link
        to="/about"
        class="flex items-center py-3 px-3 text-slate-300 no-underline transition-all duration-200 ease-in-out relative cursor-pointer hover:bg-slate-600 hover:text-white"
        :class="{ 'bg-brand-blue text-white': $route.path === '/about' }"
      >
        <div class="min-w-[30px] h-[30px] mr-3 flex items-center justify-center">ℹ️</div>
        <span
          class="whitespace-nowrap transition-opacity duration-300 ease-in-out"
          :class="{ 'opacity-100': isHovered, 'opacity-0': !isHovered }"
          >Information</span
        >
      </router-link>
    </div>

  </nav>
</template>

<script>
import AppSwitcher from '../AppSwitcher.vue'

export default {
  name: 'AppSidebar',
  components: {
    AppSwitcher
  },
  data() {
    return {
      isHovered: false
    }
  }
};
</script>

<style scoped>
/* Custom styles for the sidebar */
</style>
