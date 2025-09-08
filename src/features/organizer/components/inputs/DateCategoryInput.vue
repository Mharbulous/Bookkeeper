<template>
  <div class="date-category-input">
    <div 
      class="date-input-trigger"
      :class="{ 'has-value': modelValue, 'is-open': isOpen, 'is-disabled': disabled }"
      @click="handleTriggerClick"
    >
      <i class="mdi mdi-calendar" />
      <span class="date-value">
        {{ displayValue || placeholder || 'Select date' }}
      </span>
      <i class="mdi mdi-chevron-down toggle-icon" :class="{ rotated: isOpen }" />
    </div>

    <Teleport to="body">
      <div
        v-show="isOpen"
        ref="calendarEl"
        class="date-picker-dropdown"
        :style="dropdownStyle"
      >
        <div class="calendar-header">
          <button 
            type="button" 
            class="nav-button"
            @click="previousMonth"
            :disabled="!canNavigatePrevious"
          >
            <i class="mdi mdi-chevron-left" />
          </button>
          <div class="month-year">
            <select v-model="selectedMonth" @change="updateCalendar">
              <option v-for="(month, index) in monthNames" :key="index" :value="index">
                {{ month }}
              </option>
            </select>
            <select v-model="selectedYear" @change="updateCalendar">
              <option v-for="year in availableYears" :key="year" :value="year">
                {{ year }}
              </option>
            </select>
          </div>
          <button 
            type="button" 
            class="nav-button"
            @click="nextMonth"
            :disabled="!canNavigateNext"
          >
            <i class="mdi mdi-chevron-right" />
          </button>
        </div>

        <div class="calendar-grid">
          <div class="weekday-headers">
            <div v-for="day in weekdays" :key="day" class="weekday-header">
              {{ day }}
            </div>
          </div>
          <div class="date-grid">
            <button
              v-for="date in calendarDates"
              :key="`${date.year}-${date.month}-${date.day}`"
              type="button"
              class="date-cell"
              :class="{
                'other-month': !date.isCurrentMonth,
                'selected': date.isSelected,
                'today': date.isToday,
                'disabled': date.isDisabled
              }"
              :disabled="date.isDisabled"
              @click="selectDate(date)"
            >
              {{ date.day }}
            </button>
          </div>
        </div>

        <div class="calendar-footer">
          <button type="button" class="clear-button" @click="clearDate">
            Clear
          </button>
          <button 
            type="button" 
            class="today-button" 
            @click="selectToday"
            :disabled="!canSelectToday"
          >
            Today
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
    type: [String, Date, null],
    default: null
  },
  categoryConfig: {
    type: Object,
    default: () => ({
      dateFormat: 'YYYY-MM-DD',
      allowFuture: true,
      allowPast: true,
      defaultToToday: false
    })
  },
  placeholder: {
    type: String,
    default: 'Select date'
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

// Refs
const calendarEl = ref(null);
const isOpen = ref(false);
const dropdownStyle = ref({});
const selectedMonth = ref(new Date().getMonth());
const selectedYear = ref(new Date().getFullYear());

// Constants
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Computed
const selectedDate = computed(() => {
  if (!props.modelValue) return null;
  return props.modelValue instanceof Date ? props.modelValue : new Date(props.modelValue);
});

const displayValue = computed(() => {
  if (!selectedDate.value) return '';
  return formatDate(selectedDate.value);
});

const availableYears = computed(() => {
  const currentYear = new Date().getFullYear();
  const years = [];
  
  // Generate year range based on configuration
  const startYear = props.categoryConfig.allowPast ? currentYear - 10 : currentYear;
  const endYear = props.categoryConfig.allowFuture ? currentYear + 5 : currentYear;
  
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }
  
  return years;
});

const canNavigatePrevious = computed(() => {
  if (!props.categoryConfig.allowPast) {
    const currentDate = new Date();
    const viewDate = new Date(selectedYear.value, selectedMonth.value, 1);
    return viewDate > new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }
  return true;
});

const canNavigateNext = computed(() => {
  if (!props.categoryConfig.allowFuture) {
    const currentDate = new Date();
    const viewDate = new Date(selectedYear.value, selectedMonth.value, 1);
    return viewDate < new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  }
  return true;
});

const canSelectToday = computed(() => {
  const today = new Date();
  return isDateAllowed(today);
});

const calendarDates = computed(() => {
  const dates = [];
  const firstDay = new Date(selectedYear.value, selectedMonth.value, 1);
  const lastDay = new Date(selectedYear.value, selectedMonth.value + 1, 0);
  const startDate = new Date(firstDay);
  
  // Go to first Sunday of the calendar
  startDate.setDate(startDate.getDate() - startDate.getDay());
  
  // Generate 6 weeks of dates
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    const isCurrentMonth = date.getMonth() === selectedMonth.value;
    const isSelected = selectedDate.value && isSameDay(date, selectedDate.value);
    const isToday = isSameDay(date, new Date());
    const isDisabled = !isDateAllowed(date);
    
    dates.push({
      day: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      date: new Date(date),
      isCurrentMonth,
      isSelected,
      isToday,
      isDisabled
    });
  }
  
  return dates;
});

// Methods
const formatDate = (date) => {
  // Simple format for now, can be enhanced based on categoryConfig.dateFormat
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isDateAllowed = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  if (!props.categoryConfig.allowPast && checkDate < today) {
    return false;
  }
  
  if (!props.categoryConfig.allowFuture && checkDate > today) {
    return false;
  }
  
  return true;
};

const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

const handleTriggerClick = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  updateDropdownPosition();
};

const updateDropdownPosition = () => {
  // Position dropdown (simplified version)
  dropdownStyle.value = {
    position: 'fixed',
    zIndex: 9999
  };
};

const updateCalendar = () => {
  // Calendar updated when month/year changes
};

const previousMonth = () => {
  if (selectedMonth.value === 0) {
    selectedMonth.value = 11;
    selectedYear.value--;
  } else {
    selectedMonth.value--;
  }
};

const nextMonth = () => {
  if (selectedMonth.value === 11) {
    selectedMonth.value = 0;
    selectedYear.value++;
  } else {
    selectedMonth.value++;
  }
};

const selectDate = (dateObj) => {
  if (dateObj.isDisabled) return;
  
  const selectedValue = formatDate(dateObj.date);
  emit('update:modelValue', selectedValue);
  emit('change', {
    tagName: selectedValue,
    tagValue: dateObj.date.toISOString(),
    displayValue: formatDate(dateObj.date)
  });
  
  isOpen.value = false;
};

const selectToday = () => {
  const today = new Date();
  if (isDateAllowed(today)) {
    selectDate({
      date: today,
      isDisabled: false
    });
  }
};

const clearDate = () => {
  emit('update:modelValue', null);
  emit('change', {
    tagName: null,
    tagValue: null,
    displayValue: null
  });
  isOpen.value = false;
};

const handleOutsideClick = (event) => {
  if (isOpen.value && calendarEl.value && !calendarEl.value.contains(event.target)) {
    const trigger = event.target.closest('.date-input-trigger');
    if (!trigger) {
      isOpen.value = false;
    }
  }
};

// Initialize
onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
  
  if (props.categoryConfig.defaultToToday && !props.modelValue) {
    selectToday();
  }
  
  if (selectedDate.value) {
    selectedMonth.value = selectedDate.value.getMonth();
    selectedYear.value = selectedDate.value.getFullYear();
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});

// Watch for external value changes
watch(() => props.modelValue, (newValue) => {
  if (newValue && selectedDate.value) {
    selectedMonth.value = selectedDate.value.getMonth();
    selectedYear.value = selectedDate.value.getFullYear();
  }
});
</script>

<style scoped>
.date-category-input {
  position: relative;
  width: 100%;
}

.date-input-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 32px;
}

.date-input-trigger:hover {
  border-color: #c0c4cc;
}

.date-input-trigger.is-open {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.date-input-trigger.is-disabled {
  background: #f5f7fa;
  color: #c0c4cc;
  cursor: not-allowed;
}

.date-value {
  flex: 1;
  color: #606266;
  font-size: 14px;
}

.date-input-trigger.has-value .date-value {
  color: #303133;
}

.toggle-icon {
  color: #c0c4cc;
  transition: transform 0.2s ease;
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

.date-picker-dropdown {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  padding: 16px;
  min-width: 280px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.nav-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-button:hover:not(:disabled) {
  background: #f5f7fa;
  color: #409eff;
}

.nav-button:disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.month-year {
  display: flex;
  gap: 8px;
}

.month-year select {
  padding: 4px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: white;
  color: #303133;
  font-size: 14px;
  cursor: pointer;
}

.calendar-grid {
  margin-bottom: 16px;
}

.weekday-headers {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 8px;
}

.weekday-header {
  text-align: center;
  padding: 8px 4px;
  font-size: 12px;
  font-weight: 600;
  color: #909399;
}

.date-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.date-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.date-cell:hover:not(:disabled) {
  background: #f5f7fa;
  color: #409eff;
}

.date-cell.other-month {
  color: #c0c4cc;
}

.date-cell.today {
  background: #409eff;
  color: white;
}

.date-cell.selected {
  background: #409eff;
  color: white;
}

.date-cell.disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.calendar-footer {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.clear-button,
.today-button {
  padding: 6px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: white;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-button:hover {
  border-color: #f56c6c;
  color: #f56c6c;
}

.today-button:hover:not(:disabled) {
  border-color: #409eff;
  color: #409eff;
}

.today-button:disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}
</style>