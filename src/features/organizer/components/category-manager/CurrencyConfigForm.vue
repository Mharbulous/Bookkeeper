<template>
  <div class="currency-config-form">
    <h3 class="text-h6 mb-4">Currency Category Configuration</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Currency categories are automatically configured with optimal settings for financial data.
    </p>

    <!-- Automatic Configuration Display -->
    <v-card variant="tonal" color="success" class="mb-4">
      <v-card-text class="pa-4">
        <div class="d-flex align-center mb-3">
          <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
          <h4 class="text-subtitle-1">Automatic Configuration</h4>
        </div>
        
        <v-row>
          <v-col cols="12" md="6">
            <div class="config-item">
              <v-icon color="grey-darken-1" class="mr-2">mdi-currency-usd</v-icon>
              <div>
                <div class="text-subtitle-2">Supported Currencies</div>
                <div class="text-body-2 text-medium-emphasis">All major currencies (USD, EUR, GBP, CAD, AUD, JPY, CHF, CNY, INR, BTC, ETH)</div>
              </div>
            </div>
          </v-col>
          
          <v-col cols="12" md="6">
            <div class="config-item">
              <v-icon color="grey-darken-1" class="mr-2">mdi-decimal</v-icon>
              <div>
                <div class="text-subtitle-2">Decimal Places</div>
                <div class="text-body-2 text-medium-emphasis">2 decimal places (standard for currency)</div>
              </div>
            </div>
          </v-col>
        </v-row>
        
        <v-row>
          <v-col cols="12">
            <div class="config-item">
              <v-icon color="grey-darken-1" class="mr-2">mdi-format-list-bulleted</v-icon>
              <div>
                <div class="text-subtitle-2">Default Currency</div>
                <div class="text-body-2 text-medium-emphasis">USD (can be changed per document)</div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Currency Examples -->
    <v-alert
      type="info"
      variant="tonal"
      class="mt-4"
    >
      <v-icon start>mdi-information</v-icon>
      <strong>Ready to use:</strong> Users can enter amounts in any supported currency format (e.g., $123.45, €99.99, £75.50) and the system will automatically handle conversion and display.
    </v-alert>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      defaultCurrency: 'USD',
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BTC', 'ETH'],
      allowNegative: true,
      allowZero: true,
      decimalPlaces: 2
    })
  }
});

const emit = defineEmits(['update:modelValue']);

// Local reactive config with all currencies auto-supported
const localConfig = ref({
  defaultCurrency: 'USD',
  supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BTC', 'ETH'],
  allowNegative: true,
  allowZero: true,
  decimalPlaces: 2,
  ...props.modelValue
});

// Watch for changes and emit the automatic configuration
watch(localConfig, (newConfig) => {
  emit('update:modelValue', { ...newConfig });
}, { deep: true });

// Initialize with props but ensure automatic configuration
watch(() => props.modelValue, (newValue) => {
  localConfig.value = {
    defaultCurrency: 'USD',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BTC', 'ETH'],
    allowNegative: true,
    allowZero: true,
    decimalPlaces: 2,
    ...newValue
  };
}, { immediate: true });
</script>

<style scoped>
.currency-config-form {
  width: 100%;
}

.config-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
}

.config-item:last-child {
  margin-bottom: 0;
}
</style>