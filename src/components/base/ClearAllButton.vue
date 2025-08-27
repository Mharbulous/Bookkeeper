<template>
  <v-btn
    variant="elevated"
    color="white"
    class="text-black"
    prepend-icon="mdi-broom"
    :disabled="disabled"
    @click="handleClick"
  >
    Clear All
  </v-btn>
</template>

<script setup>
const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['click']);

const handleClick = () => {
  window.location.reload();
};
</script>
