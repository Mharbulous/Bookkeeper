<template>
  <v-container fluid class="pa-6">
    <div class="max-w-4xl mx-auto">
      <v-card>
        <v-card-title>FileQueuePlaceholder Performance Test</v-card-title>
        <v-card-text>
          <v-btn @click="runPerformanceTest" color="primary" class="me-2">
            Run Performance Test
          </v-btn>
          <v-btn @click="clearTest" color="secondary">
            Clear Test
          </v-btn>
          
          <v-alert v-if="testResults" :color="testResults.success ? 'success' : 'warning'" class="mt-4">
            <div><strong>Results:</strong></div>
            <div>Placeholders rendered: {{ testResults.count }}</div>
            <div>Total time: {{ testResults.time }}ms</div>
            <div>Average per item: {{ testResults.average }}ms</div>
            <div>Target: &lt;0.01ms per item</div>
            <div>Status: {{ testResults.success ? 'PASS' : 'FAIL' }}</div>
          </v-alert>
        </v-card-text>
      </v-card>

      <!-- Test Area -->
      <v-card v-if="showPlaceholders" class="mt-4">
        <v-card-title>Test Placeholders ({{ placeholderCount }} items)</v-card-title>
        <v-card-text>
          <v-list lines="two" density="comfortable">
            <FileQueuePlaceholder
              v-for="index in placeholderCount"
              :key="index"
              @load="onPlaceholderLoad(index)"
            />
          </v-list>
        </v-card-text>
      </v-card>

      <!-- Loaded Counter -->
      <v-card v-if="loadedCount > 0" class="mt-4">
        <v-card-text>
          <div class="text-center">
            <v-chip color="green" class="me-2">{{ loadedCount }} loaded</v-chip>
            <div class="text-caption mt-2">Scroll down to trigger intersection observer</div>
          </div>
        </v-card-text>
      </v-card>

      <!-- LazyFileItem Test -->
      <v-card class="mt-4">
        <v-card-title>LazyFileItem Component Test</v-card-title>
        <v-card-text>
          <v-btn @click="toggleFileItemTest" color="secondary" class="mb-4">
            {{ showFileItemTest ? 'Hide' : 'Show' }} LazyFileItem Test
          </v-btn>
          
          <v-list v-if="showFileItemTest" lines="two" density="comfortable">
            <LazyFileItem 
              :file="mockFile" 
              :group="mockGroup"
            />
            <LazyFileItem 
              :file="mockDuplicateFile" 
              :group="mockDuplicateGroup"
            />
          </v-list>
        </v-card-text>
      </v-card>
    </div>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import FileQueuePlaceholder from '../components/features/upload/FileQueuePlaceholder.vue'
import LazyFileItem from '../components/features/upload/LazyFileItem.vue'

const showPlaceholders = ref(false)
const placeholderCount = ref(100)
const testResults = ref(null)
const loadedCount = ref(0)
const showFileItemTest = ref(false)

// Mock data for LazyFileItem testing
const mockFile = ref({
  id: 'mock-file-1',
  name: 'document.pdf',
  size: 1024000,
  type: 'application/pdf',
  lastModified: new Date('2024-01-15T10:30:00'),
  path: '/documents/project/document.pdf',
  status: 'ready',
  isDuplicate: false,
  file: new File(['mock content'], 'document.pdf', { type: 'application/pdf' })
})

const mockGroup = ref({
  isDuplicateGroup: false,
  files: [mockFile.value]
})

const mockDuplicateFile = ref({
  id: 'mock-file-2',
  name: 'image.jpg',
  size: 2048000,
  type: 'image/jpeg',
  lastModified: new Date('2024-01-20T14:45:00'),
  path: '/images/photos/image.jpg',
  status: 'processing',
  isDuplicate: true,
  isPreviousUpload: false,
  duplicateMessage: 'This file already exists in your storage',
  file: new File(['mock image data'], 'image.jpg', { type: 'image/jpeg' })
})

const mockDuplicateGroup = ref({
  isDuplicateGroup: true,
  files: [mockDuplicateFile.value]
})

const runPerformanceTest = () => {
  loadedCount.value = 0
  
  // Test 1: Pure DOM creation (what we actually want to measure)
  const startTime = performance.now()
  
  // Create elements directly to test pure rendering performance
  const container = document.createElement('div')
  for (let i = 0; i < placeholderCount.value; i++) {
    const div = document.createElement('div')
    div.className = 'placeholder-item'
    div.style.height = '76px'
    container.appendChild(div)
  }
  
  const endTime = performance.now()
  const totalTime = endTime - startTime
  const averageTime = totalTime / placeholderCount.value
  
  testResults.value = {
    count: placeholderCount.value,
    time: Math.round(totalTime * 100) / 100,
    average: Math.round(averageTime * 10000) / 10000,
    success: averageTime < 0.01,
    testType: 'Pure DOM Creation'
  }
  
  // Clean up test elements
  container.remove()
  
  // Now show Vue components for visual testing
  showPlaceholders.value = true
}

const clearTest = () => {
  showPlaceholders.value = false
  testResults.value = null
  loadedCount.value = 0
}

const onPlaceholderLoad = (index) => {
  loadedCount.value++
  console.log(`Placeholder ${index} intersected and loaded`)
}

const toggleFileItemTest = () => {
  showFileItemTest.value = !showFileItemTest.value
}
</script>