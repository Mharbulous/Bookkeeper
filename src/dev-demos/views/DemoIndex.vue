<template>
  <v-container fluid class="pa-6">
    <div class="max-w-4xl mx-auto">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-flask-outline" class="me-2" />
          Development Demonstrations
        </v-card-title>
        <v-card-subtitle>
          Tangible demonstrations and testing pages for development features
        </v-card-subtitle>
        
        <v-card-text>
          <v-alert color="info" class="mb-4">
            <v-icon icon="mdi-information" class="me-2" />
            These pages are only available in development mode and are excluded from production builds.
          </v-alert>

          <div class="mb-6">
            <h3 class="text-h6 mb-3">Available Demonstrations</h3>
            
            <v-row>
              <v-col v-for="demo in availableDemos" :key="demo.route" cols="12" md="6">
                <v-card variant="outlined" class="h-100">
                  <v-card-title class="text-h6">{{ demo.title }}</v-card-title>
                  <v-card-text>
                    <p class="text-body-2 mb-3">{{ demo.description }}</p>
                    
                    <div class="d-flex flex-wrap gap-1 mb-3">
                      <v-chip 
                        v-for="tag in demo.tags" 
                        :key="tag" 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      >
                        {{ tag }}
                      </v-chip>
                    </div>
                    
                    <v-btn 
                      :to="demo.route" 
                      color="primary" 
                      variant="elevated"
                      size="small"
                      append-icon="mdi-arrow-right"
                    >
                      Open Demo
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>
          
          <v-divider class="my-4" />
          
          <div class="mb-6">
            <h3 class="text-h6 mb-3">Demo Development Guidelines</h3>
            <v-list density="compact">
              <v-list-item prepend-icon="mdi-eye">
                <v-list-item-title>Make it Visual</v-list-item-title>
                <v-list-item-subtitle>Use charts, progress bars, animations to show concepts</v-list-item-subtitle>
              </v-list-item>
              <v-list-item prepend-icon="mdi-speedometer">
                <v-list-item-title>Include Metrics</v-list-item-title>
                <v-list-item-subtitle>Always show concrete performance numbers</v-list-item-subtitle>
              </v-list-item>
              <v-list-item prepend-icon="mdi-database">
                <v-list-item-title>Realistic Data</v-list-item-title>
                <v-list-item-subtitle>Use representative test data, not trivial examples</v-list-item-subtitle>
              </v-list-item>
              <v-list-item prepend-icon="mdi-cursor-pointer">
                <v-list-item-title>Interactive Controls</v-list-item-title>
                <v-list-item-subtitle>Let users adjust parameters and see results</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
          
          <div class="text-center">
            <v-btn 
              href="https://github.com/your-repo/tree/main/src/dev-demos" 
              target="_blank"
              color="secondary" 
              variant="outlined"
              prepend-icon="mdi-github"
            >
              View Demo Source Code
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
import { computed } from 'vue'

const availableDemos = computed(() => [
  {
    title: 'Lazy Loading Performance',
    description: 'Demonstrates 99%+ performance improvement in file queue rendering. Compare 13+ second delays vs instant responsiveness.',
    route: '/dev/lazy-loading',
    tags: ['Performance', 'UI Optimization', 'Lazy Loading', 'Vue 3'],
    status: 'Active'
  }
  // Future demos will be added here
])
</script>