<template>
  <div class="currency-category-input">
    <div class="currency-input-group">
      <!-- Currency Selector -->
      <div 
        class="currency-selector"
        :class="{ 'is-open': isCurrencyOpen, 'is-disabled': disabled }"
        @click="toggleCurrencyDropdown"
      >
        <span class="currency-symbol">{{ selectedCurrencySymbol }}</span>
        <span class="currency-code">{{ selectedCurrency }}</span>
        <i class="mdi mdi-chevron-down toggle-icon" :class="{ rotated: isCurrencyOpen }" />
      </div>

      <!-- Amount Input -->
      <div class="amount-input-wrapper">
        <input
          v-model="amountInput"
          type="text"
          class="amount-input"
          :class="{ 'has-error': hasAmountError, 'is-disabled': disabled }"
          :placeholder="amountPlaceholder"
          :disabled="disabled"
          @input="handleAmountInput"
          @blur="handleAmountBlur"
          @focus="handleAmountFocus"
        />
        <div v-if="hasAmountError" class="error-message">
          {{ amountError }}
        </div>
      </div>
    </div>

    <!-- Currency Dropdown -->
    <Teleport to="body">
      <div
        v-show="isCurrencyOpen"
        ref="currencyDropdownEl"
        class="currency-dropdown"
        :style="currencyDropdownStyle"
      >
        <div class="currency-search">
          <input
            v-model="currencySearch"
            type="text"
            class="search-input"
            placeholder="Search currencies..."
            @input="filterCurrencies"
          />
        </div>
        <div class="currency-options">
          <button
            v-for="currency in filteredCurrencies"
            :key="currency.code"
            type="button"
            class="currency-option"
            :class="{ selected: currency.code === selectedCurrency }"
            @click="selectCurrency(currency.code)"
          >
            <span class="currency-symbol">{{ currency.symbol }}</span>
            <span class="currency-info">
              <span class="currency-code">{{ currency.code }}</span>
              <span class="currency-name">{{ currency.name }}</span>
            </span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: [Object, null],
    default: null
  },
  categoryConfig: {
    type: Object,
    default: () => ({
      defaultCurrency: 'USD',
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD'],
      allowNegative: true,
      decimalPlaces: 2
    })
  },
  placeholder: {
    type: String,
    default: '0.00'
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

// Currency definitions
const currencyDefinitions = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  CHF: { symbol: 'Fr', name: 'Swiss Franc' },
  CNY: { symbol: '¥', name: 'Chinese Yuan' },
  BTC: { symbol: '₿', name: 'Bitcoin' },
  ETH: { symbol: 'Ξ', name: 'Ethereum' }
};

// Refs
const currencyDropdownEl = ref(null);
const isCurrencyOpen = ref(false);
const currencyDropdownStyle = ref({});
const currencySearch = ref('');
const amountInput = ref('');
const amountError = ref('');
const selectedCurrency = ref(props.categoryConfig.defaultCurrency);

// Computed
const selectedCurrencySymbol = computed(() => {
  return currencyDefinitions[selectedCurrency.value]?.symbol || '$';
});

const amountPlaceholder = computed(() => {
  const decimals = props.categoryConfig.decimalPlaces;
  return `0.${'0'.repeat(decimals)}`;
});

const supportedCurrencies = computed(() => {
  return props.categoryConfig.supportedCurrencies || ['USD', 'EUR', 'GBP', 'CAD'];
});

const availableCurrencies = computed(() => {
  return supportedCurrencies.value.map(code => ({
    code,
    symbol: currencyDefinitions[code]?.symbol || '$',
    name: currencyDefinitions[code]?.name || code
  }));
});

const filteredCurrencies = computed(() => {
  if (!currencySearch.value) return availableCurrencies.value;
  
  const search = currencySearch.value.toLowerCase();
  return availableCurrencies.value.filter(currency => 
    currency.code.toLowerCase().includes(search) ||
    currency.name.toLowerCase().includes(search)
  );
});

const currentAmount = computed(() => {
  return props.modelValue?.amount || null;
});

const currentCurrency = computed(() => {
  return props.modelValue?.currency || props.categoryConfig.defaultCurrency;
});

const hasAmountError = computed(() => {
  return Boolean(amountError.value);
});

const displayValue = computed(() => {
  if (!props.modelValue?.amount) return '';
  return formatCurrencyDisplay(props.modelValue.amount, props.modelValue.currency);
});

// Methods
const formatCurrencyDisplay = (amount, currency) => {
  const symbol = currencyDefinitions[currency]?.symbol || '$';
  const formattedAmount = formatAmount(amount);
  return `${symbol}${formattedAmount} ${currency}`;
};

const formatAmount = (amount) => {
  const decimals = props.categoryConfig.decimalPlaces;
  return Number(amount).toFixed(decimals);
};

const parseAmount = (input) => {
  // Remove currency symbols and non-numeric characters except decimal point and minus
  const cleaned = input.replace(/[^\d.-]/g, '');
  const number = parseFloat(cleaned);
  return isNaN(number) ? null : number;
};

const validateAmount = (amount) => {
  if (amount === null || amount === undefined) {
    return null;
  }

  if (!props.categoryConfig.allowNegative && amount < 0) {
    return 'Negative amounts are not allowed';
  }

  // Check decimal places
  const decimals = props.categoryConfig.decimalPlaces;
  const decimalString = amount.toString().split('.')[1];
  if (decimalString && decimalString.length > decimals) {
    return `Maximum ${decimals} decimal places allowed`;
  }

  return null;
};

const handleAmountInput = () => {
  const amount = parseAmount(amountInput.value);
  amountError.value = validateAmount(amount) || '';
  
  if (!hasAmountError.value && amount !== null) {
    updateValue(amount, selectedCurrency.value);
  } else if (amountInput.value === '') {
    updateValue(null, selectedCurrency.value);
  }
};

const handleAmountFocus = () => {
  // Select all text on focus for easy editing
  const input = event.target;
  setTimeout(() => input.select(), 0);
};

const handleAmountBlur = () => {
  if (currentAmount.value !== null && !hasAmountError.value) {
    amountInput.value = formatAmount(currentAmount.value);
  }
};

const toggleCurrencyDropdown = () => {
  if (props.disabled) return;
  isCurrencyOpen.value = !isCurrencyOpen.value;
  if (isCurrencyOpen.value) {
    currencySearch.value = '';
    updateCurrencyDropdownPosition();
  }
};

const selectCurrency = (currency) => {
  selectedCurrency.value = currency;
  isCurrencyOpen.value = false;
  currencySearch.value = '';
  
  if (currentAmount.value !== null) {
    updateValue(currentAmount.value, currency);
  }
};

const filterCurrencies = () => {
  // Filtering is handled by computed property
};

const updateValue = (amount, currency) => {
  const value = amount !== null ? {
    amount,
    currency,
    formatted: formatAmount(amount)
  } : null;

  emit('update:modelValue', value);
  emit('change', {
    tagName: value ? formatCurrencyDisplay(amount, currency) : null,
    tagValue: value,
    displayValue: value ? formatCurrencyDisplay(amount, currency) : null
  });
};

const updateCurrencyDropdownPosition = () => {
  // Simplified positioning
  currencyDropdownStyle.value = {
    position: 'fixed',
    zIndex: 9999
  };
};

const handleOutsideClick = (event) => {
  if (isCurrencyOpen.value && currencyDropdownEl.value && !currencyDropdownEl.value.contains(event.target)) {
    const trigger = event.target.closest('.currency-selector');
    if (!trigger) {
      isCurrencyOpen.value = false;
    }
  }
};

// Initialize
onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
  
  // Set initial values if provided
  if (props.modelValue) {
    selectedCurrency.value = props.modelValue.currency || props.categoryConfig.defaultCurrency;
    if (props.modelValue.amount !== null) {
      amountInput.value = formatAmount(props.modelValue.amount);
    }
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    selectedCurrency.value = newValue.currency || props.categoryConfig.defaultCurrency;
    if (newValue.amount !== null) {
      amountInput.value = formatAmount(newValue.amount);
    } else {
      amountInput.value = '';
    }
  } else {
    amountInput.value = '';
    selectedCurrency.value = props.categoryConfig.defaultCurrency;
  }
  amountError.value = '';
}, { deep: true });

watch(() => props.categoryConfig.defaultCurrency, (newCurrency) => {
  if (!props.modelValue) {
    selectedCurrency.value = newCurrency;
  }
});
</script>

<style scoped>
.currency-category-input {
  position: relative;
  width: 100%;
}

.currency-input-group {
  display: flex;
  gap: 0;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  background: white;
  transition: all 0.2s ease;
}

.currency-input-group:hover {
  border-color: #c0c4cc;
}

.currency-input-group:focus-within {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.currency-selector {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-right: 1px solid #dcdfe6;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.currency-selector:hover:not(.is-disabled) {
  background: #e6f7ff;
}

.currency-selector.is-open {
  background: #e6f7ff;
}

.currency-selector.is-disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.currency-symbol {
  font-weight: 600;
  color: #303133;
}

.currency-code {
  font-size: 12px;
  color: #606266;
}

.toggle-icon {
  margin-left: auto;
  color: #c0c4cc;
  transition: transform 0.2s ease;
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

.amount-input-wrapper {
  flex: 1;
  position: relative;
}

.amount-input {
  width: 100%;
  padding: 8px 12px;
  border: none;
  outline: none;
  background: transparent;
  color: #303133;
  font-size: 14px;
  text-align: right;
}

.amount-input.has-error {
  color: #f56c6c;
}

.amount-input.is-disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.amount-input::placeholder {
  color: #c0c4cc;
  font-style: italic;
}

.error-message {
  position: absolute;
  top: 100%;
  right: 12px;
  font-size: 12px;
  color: #f56c6c;
  margin-top: 2px;
}

.currency-dropdown {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  width: 250px;
}

.currency-search {
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
}

.search-input {
  width: 100%;
  padding: 6px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  outline: none;
  font-size: 14px;
}

.search-input:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.currency-options {
  max-height: 200px;
  overflow-y: auto;
}

.currency-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.currency-option:hover {
  background: #f5f7fa;
}

.currency-option.selected {
  background: #e6f7ff;
  color: #409eff;
}

.currency-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.currency-option .currency-code {
  font-weight: 600;
  color: #303133;
}

.currency-option.selected .currency-code {
  color: #409eff;
}

.currency-name {
  font-size: 12px;
  color: #909399;
}

.currency-option.selected .currency-name {
  color: rgba(64, 158, 255, 0.7);
}

.currency-options::-webkit-scrollbar {
  width: 6px;
}

.currency-options::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}
</style>