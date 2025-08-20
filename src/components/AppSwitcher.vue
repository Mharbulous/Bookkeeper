<template>
  <div class="relative">
    <!-- Trigger Button -->
    <button
      ref="triggerButton"
      @click="toggleDropdown"
      @keydown="handleTriggerKeydown"
      @blur="handleBlur"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      :aria-controls="dropdownId"
      class="app-switcher-trigger"
      :class="{ 'bg-brand-blue text-white': $route.path === '/' || $route.path === '' || $route.name === 'home' || $route.name === 'Home' }"
    >
      <div class="min-w-[30px] h-[30px] mr-3 flex items-center justify-center">📚</div>
      <span 
        class="whitespace-nowrap transition-opacity duration-300 ease-in-out"
        :class="{ 'opacity-100': props.isHovered, 'opacity-0': !props.isHovered }"
      >
        Book Keeper
      </span>
      <div 
        class="dropdown-arrow"
        :class="{ 'rotate-180': isOpen }"
      >
        ▼
      </div>
    </button>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-1 scale-95"
    >
      <div
        v-if="isOpen"
        ref="dropdown"
        :id="dropdownId"
        class="app-switcher-dropdown"
        role="menu"
        :aria-labelledby="dropdownId + '-trigger'"
      >
        <!-- Dropdown Header -->
        <div class="app-switcher-header">
          <h3 class="text-sm font-medium text-slate-200">Switch Apps</h3>
        </div>
        
        <!-- App List -->
        <div class="app-list" role="none">
          <a 
            v-for="(app, index) in availableApps" 
            :key="app.name"
            :href="getAppUrl(app.subdomain)"
            class="app-item"
            role="menuitem"
            :tabindex="isOpen ? 0 : -1"
            @click="handleAppSwitch(app)"
            @keydown="handleItemKeydown($event, index)"
            :ref="el => { if (el) menuItems[index] = el }"
          >
            <div class="app-icon">{{ app.icon }}</div>
            <div class="app-details">
              <div class="app-name">{{ app.name }}</div>
              <div class="app-description">{{ app.description }}</div>
            </div>
          </a>
        </div>
        
        <!-- Team Info -->
        <div v-if="authStore.currentTeam" class="team-info">
          <div class="text-xs text-slate-400">
            Team: {{ authStore.currentTeam }}
          </div>
        </div>
      </div>
    </Transition>

    <!-- Mobile Backdrop -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40 lg:hidden"
      @click="closeDropdown"
      aria-hidden="true"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Props
const props = defineProps({
  isHovered: {
    type: Boolean,
    default: false
  }
})

const $route = useRoute()
const authStore = useAuthStore()

// Component state
const isOpen = ref(false)
const triggerButton = ref(null)
const dropdown = ref(null)
const menuItems = reactive([])
const focusedIndex = ref(-1)

// Generate unique ID for accessibility
const dropdownId = `app-switcher-${Math.random().toString(36).substr(2, 9)}`

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
 * Toggle dropdown open/closed state
 */
const toggleDropdown = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      focusedIndex.value = -1
    })
  } else {
    focusedIndex.value = -1
  }
}

/**
 * Close dropdown and return focus to trigger
 */
const closeDropdown = () => {
  isOpen.value = false
  focusedIndex.value = -1
  nextTick(() => {
    triggerButton.value?.focus()
  })
}

/**
 * Handle blur event to close dropdown when focus leaves button
 */
const handleBlur = (event) => {
  // Small delay to allow click events to register
  setTimeout(() => {
    if (isOpen.value) {
      closeDropdown()
    }
  }, 150)
}

/**
 * Handle keyboard navigation on trigger button
 */
const handleTriggerKeydown = (event) => {
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (!isOpen.value) {
        toggleDropdown()
        nextTick(() => {
          focusFirstItem()
        })
      } else {
        closeDropdown()
      }
      break
    case 'ArrowDown':
      event.preventDefault()
      if (!isOpen.value) {
        toggleDropdown()
        nextTick(() => {
          focusFirstItem()
        })
      } else {
        focusFirstItem()
      }
      break
    case 'ArrowUp':
      event.preventDefault()
      if (!isOpen.value) {
        toggleDropdown()
        nextTick(() => {
          focusLastItem()
        })
      } else {
        focusLastItem()
      }
      break
    case 'Escape':
      if (isOpen.value) {
        event.preventDefault()
        closeDropdown()
      }
      break
  }
}

/**
 * Handle keyboard navigation within menu items
 */
const handleItemKeydown = (event, index) => {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusNextItem(index)
      break
    case 'ArrowUp':
      event.preventDefault()
      focusPreviousItem(index)
      break
    case 'Escape':
      event.preventDefault()
      closeDropdown()
      break
    case 'Home':
      event.preventDefault()
      focusFirstItem()
      break
    case 'End':
      event.preventDefault()
      focusLastItem()
      break
    case 'Tab':
      // Allow natural tab flow, but close dropdown
      closeDropdown()
      break
    case 'Enter':
    case ' ':
      // Let the default link behavior handle navigation
      break
  }
}

/**
 * Focus management helpers
 */
const focusFirstItem = () => {
  if (availableApps.length > 0) {
    focusedIndex.value = 0
    menuItems[0]?.focus()
  }
}

const focusLastItem = () => {
  if (availableApps.length > 0) {
    focusedIndex.value = availableApps.length - 1
    menuItems[availableApps.length - 1]?.focus()
  }
}

const focusNextItem = (currentIndex) => {
  const nextIndex = currentIndex < availableApps.length - 1 ? currentIndex + 1 : 0
  focusedIndex.value = nextIndex
  menuItems[nextIndex]?.focus()
}

const focusPreviousItem = (currentIndex) => {
  const prevIndex = currentIndex > 0 ? currentIndex - 1 : availableApps.length - 1
  focusedIndex.value = prevIndex
  menuItems[prevIndex]?.focus()
}

/**
 * Handle clicks outside the dropdown
 */
const handleClickOutside = (event) => {
  if (isOpen.value && 
      !triggerButton.value?.contains(event.target) && 
      !dropdown.value?.contains(event.target)) {
    closeDropdown()
  }
}

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
  console.log(`Switching to app: ${app.name}`)
  closeDropdown()
  
  // In the future, you could add analytics tracking here
  // analytics.track('app_switch', { from: getCurrentApp(), to: app.name })
}

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true)
})
</script>

<style scoped>
.app-switcher-trigger {
  @apply flex items-center w-full py-3 px-3 text-slate-300 no-underline transition-all duration-200 ease-in-out relative cursor-pointer hover:bg-slate-600 hover:text-white focus:outline-none;
}

.dropdown-arrow {
  @apply absolute right-2 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100 text-slate-400 transform;
}

.app-switcher-dropdown {
  @apply fixed top-20 z-[2000] bg-slate-800 border border-slate-600 rounded-lg shadow-lg min-w-[280px] max-w-[320px] transition-all duration-300 ease-in-out;
  left: 60px; /* Default collapsed state */
  /* Material Design elevation styles */
  box-shadow: 
    0px 5px 5px -3px rgba(0, 0, 0, 0.2),
    0px 8px 10px 1px rgba(0, 0, 0, 0.14),
    0px 3px 14px 2px rgba(0, 0, 0, 0.12);
}

/* Position dropdown based on sidebar state */
#app-sidebar:hover ~ * .app-switcher-dropdown,
#app-sidebar:hover .app-switcher-dropdown {
  left: 280px; /* Expanded state */
}

.app-switcher-header {
  @apply px-4 py-3 border-b border-slate-600;
}

.app-list {
  @apply divide-y divide-slate-700;
}

.app-item {
  @apply flex items-center px-4 py-3 hover:bg-slate-700 transition-colors no-underline text-slate-300 focus:outline-none focus:bg-slate-700 focus:ring-2 focus:ring-brand-blue focus:ring-inset;
}

.app-item:first-child {
  @apply rounded-t-lg;
}

.app-item:last-child {
  @apply rounded-b-lg;
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

.team-info {
  @apply px-4 py-2 border-t border-slate-600 bg-slate-700 rounded-b-lg;
}

/* Ensure proper hover behavior in sidebar */
:global(.group:hover) .dropdown-arrow {
  @apply opacity-100;
}
</style>