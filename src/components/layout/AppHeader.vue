<template>
  <header
    class="bg-white px-8 py-5 border-b border-slate-200 flex items-center justify-between h-20 w-full box-border"
  >
    <button
      class="md:hidden bg-transparent border-none text-2xl cursor-pointer text-slate-600 mr-4"
      id="mobileMenuBtn"
    >
      ☰
    </button>
    <h1
      class="page-title text-2xl md:text-xl font-semibold text-slate-800 transition-transform duration-300 ease-in-out mr-5 md:mr-2 flex-grow"
    >
      {{ pageTitle }}
    </h1>
    <div class="flex items-center gap-4">
      <BaseSearchBar :disabled="true" @search="handleSearch" />
    </div>
    <div class="flex items-center">
      <div class="relative inline-block cursor-pointer outline-none group" tabindex="0" id="user-dropdown-menu">
        <div
          class="w-10 h-10 md:w-9 md:h-9 bg-gradient-to-br from-brand-blue to-brand-blue-dark text-white rounded-full flex items-center justify-center font-semibold md:text-sm shadow-sm group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-200"
        >
          <div v-if="authStore.userInitials === 'loading'" class="loading-spinner"></div>
          <span v-else>{{ authStore.userInitials }}</span>
        </div>
        <div
          class="user-dropdown-menu hidden group-focus-within:block absolute top-full right-0 bg-white border border-gray-200/50 rounded-xl shadow-xl backdrop-blur-sm z-[1000] min-w-[200px] overflow-hidden mt-2"
        >
          <div class="py-1">
            <router-link
              to="/settings"
              class="flex items-center gap-3 w-full px-4 py-3 text-left bg-transparent border-none text-gray-700 text-sm font-medium cursor-pointer transition-all duration-200 whitespace-nowrap hover:bg-blue-50 hover:text-brand-blue group/item no-underline"
            >
              <div class="w-4 h-4 flex items-center justify-center text-gray-400 group-hover/item:text-brand-blue transition-colors">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                  <path fill-rule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.205 1.251l-1.18 2.044a1 1 0 01-1.186.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.205-1.251l1.18-2.044a1 1 0 011.186-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                </svg>
              </div>
              <span>Settings</span>
            </router-link>
            <router-link
              to="/profile"
              class="flex items-center gap-3 w-full px-4 py-3 text-left bg-transparent border-none text-gray-700 text-sm font-medium cursor-pointer transition-all duration-200 whitespace-nowrap hover:bg-blue-50 hover:text-brand-blue group/item no-underline"
            >
              <div class="w-4 h-4 flex items-center justify-center text-gray-400 group-hover/item:text-brand-blue transition-colors">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                  <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                </svg>
              </div>
              <span>Profile</span>
            </router-link>
          </div>
          <div class="border-t border-gray-100 py-2">
            <div class="px-4 py-2 text-right">
              <div class="text-xs text-gray-500 uppercase tracking-wide font-semibold">Signed in as</div>
              <div class="text-sm text-gray-800 font-medium mt-1">
                {{ authStore.isInitialized ? (authStore.userDisplayName || 'User') : 'Loading...' }}
              </div>
            </div>
          </div>
          <div class="border-t border-gray-100 py-1">
            <button
              class="flex items-center gap-3 w-full px-4 py-3 text-left bg-transparent border-none text-gray-700 text-sm font-medium cursor-pointer transition-all duration-200 whitespace-nowrap hover:bg-red-50 hover:text-red-600 group/item"
              @click="signOut"
            >
              <div class="w-4 h-4 flex items-center justify-center text-gray-400 group-hover/item:text-red-600 transition-colors">
                <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                  <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>

  </header>
</template>

<script>
import { useAuthStore } from '../../stores/auth'
import BaseSearchBar from '../base/BaseSearchBar.vue'

export default {
  name: 'AppHeader',
  components: {
    BaseSearchBar
  },
  setup() {
    const authStore = useAuthStore()
    
    return { 
      authStore
    }
  },
  methods: {
    handleSearch(query) {
      console.log('Search query:', query)
    },
    async signOut() {
      try {
        await this.authStore.logout()
        this.$router.push('/login')
      } catch (error) {
        console.error('Sign out failed:', error)
      }
    }
  },
  computed: {
    pageTitle() {
      switch (this.$route.path) {
        case '/about':
          return 'About';
        case '/settings':
          return 'Settings';
        case '/profile':
          return 'Profile';
        case '/':
        case '/home':
          return 'Home';
        default:
          return 'Home';
      }
    },
  },
};
</script>

<style scoped>
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
