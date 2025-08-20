<template>
  <div class="flex min-h-screen">
    <!-- Loading state during initialization -->
    <div v-if="!authStore.isInitialized" class="flex items-center justify-center w-full h-screen">
      <div class="text-center">
        <div class="loading-spinner mx-auto mb-4"></div>
        <p class="text-gray-600">Initializing...</p>
      </div>
    </div>
    
    <!-- Normal app content -->
    <template v-else>
      <template v-if="$route.path !== '/login'">
        <AppSidebar />
      </template>
      <div class="flex-grow flex flex-col" :class="{ 'justify-center items-center': $route.path === '/login', 'ml-[60px]': $route.path !== '/login' }">
        <template v-if="$route.path !== '/login'">
          <AppHeader />
        </template>
        <router-view />
      </div>
      <template v-if="$route.path !== '/login'">
        <div class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-[99]" :class="{ 'hidden': !isMobileMenuOpen, 'block': isMobileMenuOpen }" @click="closeMobileMenu"></div>
      </template>
    </template>
  </div>
</template>

<script>
import { useAuthStore } from './stores/auth'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppHeader from './components/layout/AppHeader.vue'

export default {
  name: 'App',
  components: {
    AppSidebar,
    AppHeader,
  },
  setup() {
    const authStore = useAuthStore()
    return { authStore }
  },
  data() {
    return {
      isMobileMenuOpen: false,
    }
  },
  methods: {
    closeMobileMenu() {
      this.isMobileMenuOpen = false
    },
  },
}
</script>

<style scoped>
.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(59, 130, 246, 0.3);
  border-radius: 50%;
  border-top-color: #3b82f6;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

