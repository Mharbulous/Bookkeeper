<template>
  <v-container fluid class="pa-6">
    <div class="max-w-6xl mx-auto">
      <!-- Demo Header -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center">
          <v-icon :icon="icon" class="me-2" />
          {{ title }}
          <v-spacer />
          <v-chip color="primary" size="small" variant="outlined">
            DEV ONLY
          </v-chip>
        </v-card-title>
        <v-card-subtitle v-if="subtitle">
          {{ subtitle }}
        </v-card-subtitle>
        
        <v-card-text v-if="description">
          <v-alert color="info" variant="tonal" class="mb-3">
            {{ description }}
          </v-alert>
          
          <!-- Tags -->
          <div v-if="tags && tags.length" class="d-flex flex-wrap gap-2 mb-3">
            <v-chip 
              v-for="tag in tags" 
              :key="tag" 
              size="small" 
              color="secondary" 
              variant="outlined"
            >
              {{ tag }}
            </v-chip>
          </div>
          
          <!-- Navigation -->
          <div class="d-flex gap-2">
            <v-btn 
              to="/dev" 
              color="secondary" 
              variant="outlined" 
              size="small"
              prepend-icon="mdi-arrow-left"
            >
              All Demos
            </v-btn>
            
            <v-btn 
              v-if="sourceUrl"
              :href="sourceUrl" 
              target="_blank" 
              color="secondary" 
              variant="outlined" 
              size="small"
              prepend-icon="mdi-code-tags"
            >
              View Source
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
      
      <!-- Demo Content -->
      <slot />
      
      <!-- Performance Notes -->
      <v-card v-if="showPerformanceNotes" class="mt-4">
        <v-card-title class="text-h6">
          <v-icon icon="mdi-speedometer" class="me-2" />
          Performance Notes
        </v-card-title>
        <v-card-text>
          <v-alert color="warning" variant="tonal" class="mb-3">
            <strong>Development Mode:</strong> Performance measurements in development mode 
            include Vue DevTools overhead and hot-reload monitoring. Production builds will 
            show improved performance.
          </v-alert>
          
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-console">
              <v-list-item-title>Console Logging</v-list-item-title>
              <v-list-item-subtitle>
                Open browser DevTools Console to see detailed performance measurements
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-memory">
              <v-list-item-title>Memory Usage</v-list-item-title>
              <v-list-item-subtitle>
                Use DevTools Memory tab to monitor memory consumption patterns
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-timer">
              <v-list-item-title>Timing Precision</v-list-item-title>
              <v-list-item-subtitle>
                Measurements use performance.now() for microsecond precision
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: 'mdi-flask-outline'
  },
  tags: {
    type: Array,
    default: () => []
  },
  sourceUrl: {
    type: String,
    default: ''
  },
  showPerformanceNotes: {
    type: Boolean,
    default: false
  }
})
</script>