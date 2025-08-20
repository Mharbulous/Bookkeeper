<template>
  <div class="app-switcher">
    <div class="app-switcher-header">
      <h3 class="text-sm font-medium text-gray-900">Switch Apps</h3>
    </div>
    
    <div class="app-list">
      <a 
        v-for="app in availableApps" 
        :key="app.name"
        :href="getAppUrl(app.subdomain)"
        class="app-item"
        @click="handleAppSwitch(app)"
      >
        <div class="app-icon">
          {{ app.icon }}
        </div>
        <div class="app-details">
          <div class="app-name">{{ app.name }}</div>
          <div class="app-description">{{ app.description }}</div>
        </div>
      </a>
    </div>
    
    <div v-if="authStore.currentTeam" class="team-info">
      <div class="text-xs text-gray-500">
        Team: {{ authStore.currentTeam }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

// Available apps configuration - matches the roadmap specs
const availableApps = [
  {
    name: 'Coryphaeus',
    subdomain: 'files',
    description: 'File management system',
    icon: '🎭',
    port: '5173'
  },
  {
    name: 'Intranet',
    subdomain: 'intranet',
    description: 'Internal portal and resources',
    icon: '📇',
    port: '5175'
  }
]

// Get the base domain from environment
const baseDomain = import.meta.env.VITE_APP_DOMAIN || 'localhost:3000'

/**
 * Generate URL for an app subdomain
 */
const getAppUrl = (subdomain) => {
  // Find the app configuration for the subdomain
  const app = availableApps.find(a => a.subdomain === subdomain)
  
  // For local development - use specific ports
  if (baseDomain.includes('localhost')) {
    const port = app?.port || '5173'
    return `http://localhost:${port}`
  }
  
  // For production
  return `https://${subdomain}.${baseDomain}`
}

/**
 * Handle app switching with analytics/logging
 */
const handleAppSwitch = (app) => {
  // Log app switch for analytics
  console.log(`Switching to app: ${app.name}`)
  
  // In the future, you could add analytics tracking here
  // analytics.track('app_switch', { from: getCurrentApp(), to: app.name })
}
</script>

<style scoped>
.app-switcher {
  @apply bg-slate-800 border border-slate-600 rounded-lg shadow-lg;
  min-width: 250px;
}

.app-switcher-header {
  @apply px-4 py-3 border-b border-slate-600;
}

.app-switcher-header h3 {
  @apply text-slate-200;
}

.app-list {
  @apply divide-y divide-slate-700;
}

.app-item {
  @apply flex items-center px-4 py-3 hover:bg-slate-700 transition-colors no-underline text-slate-300;
}

.app-item.current {
  @apply bg-brand-blue hover:bg-brand-blue text-white;
}

.app-icon {
  @apply text-xl mr-3 flex-shrink-0;
}

.app-details {
  @apply flex-1 min-w-0;
}

.app-name {
  @apply text-sm font-medium;
}

.app-description {
  @apply text-xs text-slate-400 mt-1;
}

.current-indicator {
  @apply ml-2 flex-shrink-0;
}

.team-info {
  @apply px-4 py-2 border-t border-slate-600 bg-slate-700;
}

.team-info .text-xs {
  @apply text-slate-400;
}
</style>