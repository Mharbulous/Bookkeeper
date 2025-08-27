import './styles/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import vuetify from './plugins/vuetify';
import { useAuthStore } from './stores/auth';
import { useGlobalAsyncRegistry } from './composables/useAsyncRegistry';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(vuetify);

// Initialize auth store after Pinia is set up
const authStore = useAuthStore();
authStore.initialize();

// Setup global async process cleanup handlers
const { cleanupAll } = useGlobalAsyncRegistry();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  cleanupAll();
});

// Cleanup on router navigation (optional - prevents process accumulation)
router.beforeEach((to, from) => {
  if (from.path !== to.path) {
    cleanupAll();
  }
});

// Error boundary cleanup for emergency situations
window.addEventListener('error', () => {
  if (import.meta.env.DEV) {
    console.warn('[AsyncTracker] Error detected, performing emergency cleanup');
  }
  cleanupAll();
});

app.mount('#app');
