<template>
  <div class="p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-slate-800 mb-8">Profile</h1>

      <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div class="flex items-center space-x-4 mb-6">
          <div
            class="w-16 h-16 bg-gradient-to-br from-brand-blue to-brand-blue-dark text-white rounded-full flex items-center justify-center font-semibold text-xl"
          >
            {{ userInitials }}
          </div>
          <div>
            <h2 class="text-xl font-semibold text-slate-800">{{ user?.displayName || 'User' }}</h2>
            <p class="text-slate-600">{{ user?.email || 'user@example.com' }}</p>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Display Name</label>
            <input
              type="text"
              :value="user?.displayName || ''"
              class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              readonly
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
            <input
              type="email"
              :value="user?.email || ''"
              class="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              readonly
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from '../stores/auth';

export default {
  name: 'ProfileView',
  setup() {
    const authStore = useAuthStore();
    return { authStore };
  },
  computed: {
    user() {
      return this.authStore.user;
    },
    userInitials() {
      return this.authStore.userInitials;
    },
  },
};
</script>
