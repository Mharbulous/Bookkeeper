// Import wizard components
import DateConfigForm from '../components/category-manager/DateConfigForm.vue';
import CurrencyConfigForm from '../components/category-manager/CurrencyConfigForm.vue';
import ListConfigForm from '../components/category-manager/ListConfigForm.vue';
import CheckboxConfigForm from '../components/category-manager/CheckboxConfigForm.vue';
import IntegerConfigForm from '../components/category-manager/IntegerConfigForm.vue';
import FloatConfigForm from '../components/category-manager/FloatConfigForm.vue';
import TextareaConfigForm from '../components/category-manager/TextareaConfigForm.vue';
import PercentageConfigForm from '../components/category-manager/PercentageConfigForm.vue';
import UniqueStringConfigForm from '../components/category-manager/UniqueStringConfigForm.vue';
import RegexConfigForm from '../components/category-manager/RegexConfigForm.vue';
import CounterConfigForm from '../components/category-manager/CounterConfigForm.vue';

// Type configuration with colors, icons, and display text
export const typeConfig = {
  date: { color: 'purple', icon: 'mdi-calendar', text: 'Date' },
  currency: { color: 'green', icon: 'mdi-currency-usd', text: 'Currency' },
  'fixed-list': { color: 'grey-darken-4', icon: 'mdi-format-list-bulleted', text: 'Fixed List' },
  'open-list': { color: 'blue', icon: 'mdi-playlist-plus', text: 'Open List' },
  checkbox: { color: 'orange', icon: 'mdi-checkbox-outline', text: 'Checkbox' },
  integer: { color: 'indigo', icon: 'mdi-numeric', text: 'Integer' },
  float: { color: 'teal', icon: 'mdi-decimal', text: 'Float' },
  textarea: { color: 'brown', icon: 'mdi-text-box', text: 'Textarea' },
  percentage: { color: 'pink', icon: 'mdi-percent', text: 'Percentage' },
  'unique-string': { color: 'deep-purple', icon: 'mdi-key-variant', text: 'Unique String' },
  regex: { color: 'red', icon: 'mdi-regex', text: 'Regex' },
  counter: { color: 'cyan', icon: 'mdi-counter', text: 'Counter' },
};

// Configuration components mapping
export const configComponents = {
  date: DateConfigForm,
  currency: CurrencyConfigForm,
  'fixed-list': ListConfigForm,
  'open-list': ListConfigForm,
  checkbox: CheckboxConfigForm,
  integer: IntegerConfigForm,
  float: FloatConfigForm,
  textarea: TextareaConfigForm,
  percentage: PercentageConfigForm,
  'unique-string': UniqueStringConfigForm,
  regex: RegexConfigForm,
  counter: CounterConfigForm,
};

// Types that skip the configuration step
export const skipConfigurationTypes = ['currency'];

// Wizard steps configuration
export const wizardSteps = [
  { title: 'Basic Info', subtitle: 'Category details' },
  { title: 'Configuration', subtitle: 'Type-specific options' },
];

// Helper function to format numeric ranges
export const formatRange = (min, max) =>
  min != null && max != null
    ? `${min} to ${max}`
    : min != null
      ? `${min} and above`
      : max != null
        ? `${max} and below`
        : 'Any value';

// Helper function to get counter type labels
export const getCounterTypeLabel = (type) =>
  ({
    numeric: 'Numeric sequence',
    letters: 'Letter sequence',
    'roman-lower': 'Roman numerals (lowercase)',
    'roman-upper': 'Roman numerals (uppercase)',
  })[type] || 'Auto sequence';

// Helper function to get type configuration
export const getTypeColor = (type) => typeConfig[type]?.color || 'grey';
export const getTypeIcon = (type) => typeConfig[type]?.icon || 'mdi-folder';
export const getTypeText = (type) => typeConfig[type]?.text || 'Legacy';
export const getConfigComponent = (type) => configComponents[type];

// Helper function to check if type is a list type
export const isListType = (type) => ['fixed-list', 'open-list', null, undefined].includes(type);

// Helper function to get empty tags message
export const getEmptyTagsMessage = (type) =>
  ({
    'fixed-list': 'No tags defined yet.',
    'open-list': 'No initial tags defined. AI can create tags when processing documents.',
  })[type] || 'No tags defined yet.';
