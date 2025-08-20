<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 p-5">
    <div class="bg-white rounded-xl shadow-md p-10 w-full max-w-md border border-gray-200">
      <div class="text-center mb-8">
        <div class="text-5xl mb-4 text-brand-blue">🔐</div>
        <h1 class="text-brand-blue mb-2 text-3xl font-semibold">Vue Template</h1>
        <p class="text-slate-600 text-sm">Please sign in to access the application</p>
      </div>

      <form @submit.prevent="handleLogin" class="flex flex-col gap-5">
        <div class="flex flex-col gap-1.5">
          <label for="email" class="font-medium text-slate-700 text-sm">Email Address</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="py-3 px-4 border border-gray-300 rounded-lg text-base transition-colors duration-200 bg-white focus:outline-none focus:border-brand-blue focus:ring-3 focus:ring-brand-blue/10 disabled:bg-gray-50 disabled:text-slate-600 disabled:cursor-not-allowed"
            placeholder="Enter your email"
            required
            :disabled="isLoading"
            @input="clearError"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="password" class="font-medium text-slate-700 text-sm">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="py-3 px-4 border border-gray-300 rounded-lg text-base transition-colors duration-200 bg-white focus:outline-none focus:border-brand-blue focus:ring-3 focus:ring-brand-blue/10 disabled:bg-gray-50 disabled:text-slate-600 disabled:cursor-not-allowed"
            placeholder="Enter your password"
            required
            :disabled="isLoading"
            @input="clearError"
          />
        </div>

        <button type="submit" class="bg-brand-blue text-white border-none py-3.5 px-5 rounded-lg text-base font-medium cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 mt-2.5 hover:bg-brand-blue-dark hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-blue/20 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none" :disabled="isLoading || !email || !password">
          <span v-if="isLoading" class="animate-spin">⏳</span>
          <span v-else>Sign In</span>
        </button>

        <div v-if="errorMessage" class="bg-red-50 text-red-600 py-3 px-4 rounded-lg border border-red-200 text-sm text-center">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="bg-green-50 text-green-600 py-3 px-4 rounded-lg border border-green-200 text-sm text-center">
          {{ successMessage }}
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'

export default {
  name: 'LoginForm',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const authStore = useAuthStore()

    return {
      router,
      route,
      authStore
    }
  },
  data() {
    return {
      email: '',
      password: '',
      isLoading: false,
      errorMessage: '',
      successMessage: '',
    }
  },
  methods: {
    async handleLogin() {
      if (!this.email || !this.password) {
        this.errorMessage = 'Please enter both email and password'
        return
      }

      this.isLoading = true
      this.errorMessage = ''
      this.successMessage = ''

      try {
        // Use the auth store login method
        await this.authStore.login(this.email, this.password)
        this.successMessage = 'Login successful! Welcome to the Coryphaeus Vue Template.'

        // Clear form data
        this.email = ''
        this.password = ''

        // Handle redirect after successful login
        const redirectPath = this.route.query.redirect
          ? decodeURIComponent(this.route.query.redirect)
          : '/'

        // Navigate to intended destination
        setTimeout(() => {
          this.router.push(redirectPath)
        }, 1000) // Small delay to show success message
      } catch (error) {
        console.error('Login error:', error)

        // Map Firebase error codes to user-friendly messages
        switch (error.code) {
          case 'auth/user-not-found':
            this.errorMessage = 'No account found with this email address'
            break
          case 'auth/wrong-password':
            this.errorMessage = 'Incorrect password'
            break
          case 'auth/invalid-email':
            this.errorMessage = 'Please enter a valid email address'
            break
          case 'auth/too-many-requests':
            this.errorMessage = 'Too many failed attempts. Please try again later'
            break
          default:
            this.errorMessage = 'Login failed. Please check your credentials and try again'
        }
      } finally {
        this.isLoading = false
      }
    },

    clearError() {
      this.errorMessage = ''
      this.successMessage = ''
    },
  },
}
</script>
