<template>
  <div class="max-w-7xl mx-auto p-8">
    <!-- Page Header -->
    <div class="text-center mb-12">
      <div class="inline-flex items-center px-4 py-2 rounded-full text-lg font-medium bg-red-100 text-red-800 mb-6">
        🚫 Page Not Found
      </div>
      <h1 class="text-4xl font-bold text-slate-900 mb-4">404 - Page Not Found</h1>
      <p class="text-xl text-slate-600">
        The page you're looking for doesn't exist.
      </p>
    </div>

    <!-- Error Details -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm mb-8">
      <div class="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <span class="text-2xl">📍</span>
        <h2 class="text-xl font-semibold text-slate-800">What Happened?</h2>
      </div>
      <div class="p-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-slate-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-slate-800 mb-4">Possible Reasons</h3>
            <ul class="space-y-3 text-slate-600">
              <li class="flex items-start gap-3">
                <span class="text-red-500 text-lg">•</span>
                <span>The URL was typed incorrectly</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-red-500 text-lg">•</span>
                <span>The page has been moved or deleted</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-red-500 text-lg">•</span>
                <span>You followed a broken link</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-red-500 text-lg">•</span>
                <span>You don't have permission to access this page</span>
              </li>
            </ul>
          </div>
          
          <div class="bg-slate-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-slate-800 mb-4">What You Can Do</h3>
            <ul class="space-y-3 text-slate-600">
              <li class="flex items-start gap-3">
                <span class="text-blue-500 text-lg">→</span>
                <span>Check the URL for typos</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-blue-500 text-lg">→</span>
                <span>Use the navigation menu to find what you need</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-blue-500 text-lg">→</span>
                <span>Go back to the previous page</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-blue-500 text-lg">→</span>
                <span>Return to the homepage</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Help -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm mb-8">
      <div class="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <span class="text-2xl">🗺️</span>
        <h2 class="text-xl font-semibold text-slate-800">Popular Sections</h2>
      </div>
      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <router-link 
            to="/responsibilities" 
            class="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors border border-transparent"
          >
            <span class="text-2xl">📜</span>
            <span class="font-medium text-slate-800">Responsibilities</span>
          </router-link>
          
          <router-link 
            to="/learning" 
            class="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors border border-transparent"
          >
            <span class="text-2xl">📚</span>
            <span class="font-medium text-slate-800">Learning</span>
          </router-link>
          
          <router-link 
            to="/services" 
            class="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors border border-transparent"
          >
            <span class="text-2xl">⚖️</span>
            <span class="font-medium text-slate-800">Services</span>
          </router-link>
          
          <router-link 
            to="/responsibilities" 
            class="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors border border-transparent"
          >
            <span class="text-2xl">✅</span>
            <span class="font-medium text-slate-800">Responsibilities</span>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Current Page Info -->
    <div class="bg-red-50 rounded-xl border border-red-200 p-6 mb-8">
      <h3 class="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <span>ℹ️</span>
        Request Information
      </h3>
      <div class="space-y-2 text-slate-700">
        <p><strong>Requested URL:</strong> <code class="bg-white px-2 py-1 rounded text-sm">{{ displayPath }}</code></p>
        <p><strong>Status:</strong> Not Found (404)</p>
        <p><strong>Time:</strong> {{ currentTime }}</p>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <button 
        @click="goBack" 
        class="inline-flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
      >
        ←
        Go Back
      </button>
      
      <router-link 
        to="/" 
        class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        🏠
        Go to Homepage
      </router-link>
      
      <router-link 
        to="/sitemap" 
        class="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        🗺️
        View Sitemap
      </router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PageNotFound',
  data() {
    return {
      currentTime: new Date().toLocaleString()
    }
  },
  computed: {
    displayPath() {
      // Return the original requested path for display
      // Prioritize query parameter for legacy URLs, but use current path for new direct rendering
      return this.$route.query.originalPath || this.$route.path
    }
  },
  methods: {
    goBack() {
      // Check if there's a history to go back to
      if (window.history.length > 1) {
        this.$router.go(-1)
      } else {
        // If no history (direct URL access), go to homepage
        this.$router.push('/')
      }
    }
  }
}
</script>