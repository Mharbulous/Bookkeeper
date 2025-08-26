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
import { onUnmounted } from 'vue'
import { useAuthStore } from './stores/auth'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppHeader from './components/layout/AppHeader.vue'
import { useFavicon } from './composables/useFavicon'
import { useAsyncInspector } from './composables/useAsyncInspector'
import { useAsyncRegistry } from './composables/useAsyncRegistry'

export default {
  name: 'App',
  components: {
    AppSidebar,
    AppHeader,
  },
  setup() {
    const authStore = useAuthStore()
    const registry = useAsyncRegistry()
    
    // Initialize favicon switching
    useFavicon()
    
    // Development inspector integration
    const inspector = useAsyncInspector()
    
    // Optional: Auto-log stats every 30 seconds in development
    let statsIntervalId = null
    if (inspector.isEnabled) {
      const intervalId = setInterval(() => {
        if (inspector.stats.value.total > 0) {
          inspector.logStats()
        }
      }, 30000)
      
      // Register the monitoring interval with the async registry
      statsIntervalId = registry.register(
        registry.generateId('async-monitoring'),
        'async-monitoring',
        () => {
          clearInterval(intervalId)
        },
        {
          component: 'App',
          purpose: 'stats-logging',
          interval: 30000
        }
      )
    }
    
    onUnmounted(() => {
      if (statsIntervalId) {
        registry.unregister(statsIntervalId)
      }
    })
    
    return { authStore, inspector }
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

