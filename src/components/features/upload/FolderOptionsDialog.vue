<template>
  <v-dialog :model-value="show" @update:model-value="$emit('update:show', $event)" max-width="500">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-folder-open" class="me-2" />
        Folder Upload Options
      </v-card-title>
      
      <v-card-text>
        <p class="mb-4">
          This folder contains {{ subfolderCount }} subfolder(s). 
          How would you like to proceed?
        </p>
        
        <v-radio-group :model-value="includeSubfolders" @update:model-value="$emit('update:includeSubfolders', $event)">
          <v-radio
            :value="false"
            color="primary"
          >
            <template #label>
              <div>
                <div class="font-weight-medium">Main folder only</div>
                <div class="text-caption text-grey-darken-1">
                  Upload only files in the main folder
                </div>
              </div>
            </template>
          </v-radio>
          
          <v-radio
            :value="true"
            color="primary"
          >
            <template #label>
              <div>
                <div class="font-weight-medium">Include subfolders</div>
                <div class="text-caption text-grey-darken-1">
                  Upload all files including those in subfolders
                </div>
              </div>
            </template>
          </v-radio>
        </v-radio-group>
      </v-card-text>
      
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="$emit('cancel')"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          @click="$emit('confirm')"
        >
          Continue
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    required: true
  },
  subfolderCount: {
    type: Number,
    required: true
  },
  includeSubfolders: {
    type: Boolean,
    required: true
  }
})

defineEmits(['confirm', 'cancel', 'update:includeSubfolders', 'update:show'])
</script>