<template>
  <div class="p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-slate-800 mb-8">Settings</h1>
      
      <div class="space-y-6">
        <!-- General Settings -->
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 class="text-xl font-semibold text-slate-800 mb-4">General Settings</h2>
          
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-medium text-slate-800">Email Notifications</h3>
                <p class="text-sm text-slate-600">Receive email notifications for important updates</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer" checked>
                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-blue/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
              </label>
            </div>
            
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-medium text-slate-800">Dark Mode</h3>
                <p class="text-sm text-slate-600">Switch to dark theme</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer">
                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-blue/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
              </label>
            </div>
          </div>
        </div>
        
        <!-- Account Settings -->
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 class="text-xl font-semibold text-slate-800 mb-4">Account Settings</h2>
          
          <div class="space-y-4">
            <button class="inline-flex items-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue">
              Change Password
            </button>
            
            <button class="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SettingsView',
}
</script>