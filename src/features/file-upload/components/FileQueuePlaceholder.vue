<template>
  <div ref="placeholder" class="placeholder-item" :class="{ 'bg-purple-lighten-5': isDuplicate }" />
</template>

<script setup>
import { ref, nextTick, onUnmounted } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';

const props = defineProps({
  isDuplicate: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['load']);

const placeholder = ref(null);
let stopObserver = null;

// Defer observer setup to avoid impacting initial render performance
const setupObserver = () => {
  if (placeholder.value && !stopObserver) {
    const { stop } = useIntersectionObserver(
      placeholder.value,
      ([{ isIntersecting }]) => {
        if (isIntersecting) {
          emit('load');
          stop();
        }
      },
      {
        rootMargin: '50px 0px',
      }
    );
    stopObserver = stop;
  }
};

// Setup observer after render is complete
nextTick(() => {
  // Use requestIdleCallback if available, otherwise setTimeout
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(setupObserver);
  } else {
    setTimeout(setupObserver, 0);
  }
});

onUnmounted(() => {
  if (stopObserver) {
    stopObserver();
  }
});
</script>

<style scoped>
.placeholder-item {
  height: 76px;
  background-color: white;
  border-radius: 4px;
  overflow: hidden;
}
</style>