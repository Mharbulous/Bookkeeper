<template>
  <div class="max-w-4xl mx-auto p-8 text-center">
    <div class="mb-8">
      <div class="inline-flex items-center px-4 py-2 rounded-full text-lg font-medium bg-amber-100 text-amber-800 mb-6">
        🚧 Under Construction
      </div>
      <h1 class="text-4xl font-bold text-slate-900 mb-4">Page Under Construction</h1>
      <p class="text-xl text-slate-600 mb-8">
        This page is currently being developed and will be available soon.
      </p>
      <p class="text-lg text-slate-500">Thank you for your patience.</p>
    </div>
    
    <div class="text-center">
      <button
        @click="goBack"
        class="inline-flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
      >
        ← Go Back
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UnderConstruction',
  methods: {
    goBack() {
      this.$router.go(-1);
    },
  },
};
</script>