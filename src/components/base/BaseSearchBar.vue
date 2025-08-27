<template>
  <div class="relative max-w-sm flex-1 mx-10 md:mx-2 min-w-[200px]">
    <div
      class="absolute left-4 top-1/2 transform -translate-y-1/2"
      :class="disabled ? 'text-gray-300' : 'text-gray-400'"
    >
      🔍
    </div>
    <input
      type="text"
      :disabled="disabled"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      @keyup.enter="handleSearch"
      :class="[
        'w-full py-3 px-4 pl-11 border rounded-lg text-sm',
        disabled
          ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'border-gray-300 bg-gray-50 transition-all duration-200 focus:outline-none focus:border-brand-blue focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]',
      ]"
      :placeholder="disabled ? 'Search (coming soon)...' : placeholder"
    />
  </div>
</template>

<script>
export default {
  name: 'BaseSearchBar',
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
    modelValue: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: 'Search...',
    },
  },
  emits: ['update:modelValue', 'search'],
  methods: {
    handleSearch() {
      if (!this.disabled) {
        this.$emit('search', this.modelValue);
      }
    },
  },
};
</script>
