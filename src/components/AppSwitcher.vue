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
        :class="[
          'app-item',
          { 'current': isCurrentApp(app.subdomain) }
        ]"
        @click="handleAppSwitch(app)"
      >
        <div class="app-icon">
          {{ app.icon }}
        </div>
        <div class="app-details">
          <div class="app-name">{{ app.name }}</div>
          <div class="app-description">{{ app.description }}</div>
        </div>
        <div v-if="isCurrentApp(app.subdomain)" class="current-indicator">
          <svg class="w-4 h-4 text-brand-blue" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
          </svg>
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

// Available apps configuration - in production this could come from team settings
const availableApps = [
  {
    name: 'Intranet',
    subdomain: 'intranet',
    description: 'Internal portal and resources',
    icon: '📋'
  },
  {
    name: 'Bookkeeping',
    subdomain: 'bookkeeping',
    description: 'Financial documents and records',
    icon: '📁'
  },
  {
    name: 'Files',
    subdomain: 'files',
    description: 'Document management',
    icon: '📄'
  }
]

// Get the base domain from environment
const baseDomain = import.meta.env.VITE_APP_DOMAIN || 'localhost:3000'

/**
 * Generate URL for an app subdomain
 */
const getAppUrl = (subdomain) => {
  // For local development
  if (baseDomain.includes('localhost')) {
    const port = baseDomain.split(':')[1] || '3000'
    return `http://${subdomain}.localhost:${port}`
  }
  
  // For production
  return `https://${subdomain}.${baseDomain}`
}

/**
 * Check if current app matches the subdomain
 */
const isCurrentApp = (subdomain) => {
  const currentHost = window.location.hostname
  return currentHost.includes(subdomain)
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
  @apply bg-white border border-gray-200 rounded-lg shadow-md;
  min-width: 280px;
}

.app-switcher-header {
  @apply px-4 py-3 border-b border-gray-200;
}

.app-list {
  @apply divide-y divide-gray-100;
}

.app-item {
  @apply flex items-center px-4 py-3 hover:bg-gray-50 transition-colors;
  @apply text-decoration-none;
}

.app-item.current {
  @apply bg-blue-50 hover:bg-blue-50;
}

.app-icon {
  @apply text-2xl mr-3 flex-shrink-0;
}

.app-details {
  @apply flex-1 min-w-0;
}

.app-name {
  @apply text-sm font-medium text-gray-900;
}

.app-description {
  @apply text-xs text-gray-500 mt-1;
}

.current-indicator {
  @apply ml-2 flex-shrink-0;
}

.team-info {
  @apply px-4 py-2 border-t border-gray-200 bg-gray-50;
}
</style>