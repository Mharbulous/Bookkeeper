<template>
  <div class="category-type-selector">
    <v-select
      :model-value="modelValue"
      label="Category Type"
      :items="categoryTypeOptions"
      variant="outlined"
      density="compact"
      placeholder="Select category type..."
      @update:model-value="selectType"
    >
      <template #item="{ props: itemProps, item }">
        <v-list-item v-bind="itemProps">
          <template #prepend>
            <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
          </template>
        </v-list-item>
      </template>
      <template #selection="{ item }">
        <div class="d-flex align-center">
          <v-icon :color="item.raw.color" class="mr-2">{{ item.raw.icon }}</v-icon>
          {{ item.raw.title }}
        </div>
      </template>
    </v-select>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['update:modelValue']);

// Ordered from most frequently used to least frequently used
const categoryTypeOptions = [
  {
    title: 'Open List',
    value: 'open-list',
    icon: 'mdi-playlist-plus',
    color: 'blue'
  },
  {
    title: 'Fixed List',
    value: 'fixed-list',
    icon: 'mdi-format-list-bulleted',
    color: 'grey-darken-4'
  },
  {
    title: 'Date',
    value: 'date',
    icon: 'mdi-calendar',
    color: 'purple'
  },
  {
    title: 'Currency',
    value: 'currency',
    icon: 'mdi-currency-usd',
    color: 'green'
  },
  {
    title: 'Checkbox',
    value: 'checkbox',
    icon: 'mdi-checkbox-outline',
    color: 'orange'
  },
  {
    title: 'Textarea',
    value: 'textarea',
    icon: 'mdi-text-box',
    color: 'brown'
  },
  {
    title: 'Unique String',
    value: 'unique-string',
    icon: 'mdi-key-variant',
    color: 'deep-purple'
  },
  {
    title: 'Integer',
    value: 'integer',
    icon: 'mdi-numeric',
    color: 'indigo'
  },
  {
    title: 'Percentage',
    value: 'percentage',
    icon: 'mdi-percent',
    color: 'pink'
  },
  {
    title: 'Float',
    value: 'float',
    icon: 'mdi-decimal',
    color: 'teal'
  },
  {
    title: 'Counter',
    value: 'counter',
    icon: 'mdi-counter',
    color: 'cyan'
  },
  {
    title: 'Regex',
    value: 'regex',
    icon: 'mdi-regex',
    color: 'red'
  }
];

const selectType = (value) => {
  emit('update:modelValue', value);
};
</script>

<style scoped>
.category-type-selector {
  width: 100%;
}
</style>