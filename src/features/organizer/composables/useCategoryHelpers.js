import { formatRange, getCounterTypeLabel } from '../utils/categoryConfig.js';

export function useCategoryHelpers() {
  // Main function to generate type configuration summary
  const getTypeConfigSummary = (category, detailed = false) => {
    const cfg = category.typeConfig || {};
    const type = category.categoryType;
    const sep = detailed ? ' • ' : ', ';

    const configs = {
      date: () => {
        const format = cfg.dateFormat || 'YYYY-MM-DD';
        const dates =
          cfg.allowPast && cfg.allowFuture
            ? 'Any date allowed'
            : cfg.allowPast
              ? 'Past dates only'
              : cfg.allowFuture
                ? 'Future dates only'
                : 'No dates';
        return detailed
          ? `<strong>Date Format:</strong> ${format}${sep}${dates}`
          : `Calendar picker${sep}${format} format${sep}${dates.toLowerCase()}`;
      },
      currency: () => {
        const currencies = (cfg.supportedCurrencies || []).length || 1;
        const decimals = cfg.decimalPlaces || 2;
        return detailed
          ? `<strong>Default:</strong> ${cfg.defaultCurrency || 'USD'}${sep}<strong>${currencies} currencies</strong>${sep}<strong>${decimals} decimals</strong>`
          : `Currency selector${sep}${currencies} currencies${sep}${decimals} decimal places`;
      },
      'fixed-list': () => {
        const tagCount = (category.tags || []).length;
        return detailed
          ? `<strong>Fixed options only</strong>${sep}No AI expansion${sep}<strong>${tagCount} predefined tags</strong>`
          : `Fixed dropdown${sep}${tagCount} predefined options${sep}No AI expansion`;
      },
      'open-list': () => {
        const confidence = Math.round((cfg.aiConfidenceThreshold || 0.7) * 100);
        const tagCount = (category.tags || []).length;
        return detailed
          ? `<strong>AI-expandable</strong>${sep}<strong>${confidence}% confidence threshold</strong>${sep}<strong>${tagCount} initial tags</strong>`
          : `Smart dropdown${sep}${tagCount} initial options${sep}AI expansion at ${confidence}% confidence`;
      },
      checkbox: () => {
        const style =
          (cfg.displayStyle || 'checkbox').charAt(0).toUpperCase() +
          (cfg.displayStyle || 'checkbox').slice(1);
        const defaultVal = cfg.defaultValue ? cfg.trueLabel || 'Yes' : cfg.falseLabel || 'No';
        return detailed
          ? `<strong>${style}</strong>${sep}Default: ${defaultVal}`
          : `${style} input${sep}Default: ${cfg.defaultValue ? 'checked' : 'unchecked'}`;
      },
      integer: () => {
        const range = formatRange(cfg.minValue, cfg.maxValue);
        const step = cfg.step || 1;
        return detailed
          ? `<strong>Integer input</strong>${sep}Range: ${range}${sep}Step: ${step}`
          : `Whole number input${sep}Range: ${range}${sep}Step: ${step}`;
      },
      float: () => {
        const decimals = cfg.decimalPlaces || 2;
        const range = formatRange(cfg.minValue, cfg.maxValue);
        return detailed
          ? `<strong>Decimal input</strong>${sep}${decimals} decimals${sep}Range: ${range}`
          : `Decimal input${sep}${decimals} decimal places${sep}Range: ${range}`;
      },
      textarea: () => {
        const parts = [
          detailed ? '<strong>Multi-line text</strong>' : 'Multi-line text',
          `${cfg.rows || 3} rows`,
        ];
        if (cfg.maxLength) parts.push(`${cfg.maxLength} char limit`);
        if (cfg.required) parts.push('Required');
        return parts.join(sep);
      },
      percentage: () => {
        const input = cfg.inputMethod === 'slider' ? 'Slider' : 'Number';
        const decimals = cfg.decimalPlaces || 1;
        const step = cfg.step || (cfg.decimalPlaces === 0 ? 5 : 0.1);
        return detailed
          ? `<strong>${input} input</strong>${sep}${decimals} decimals${sep}Step: ${step}%`
          : `${input} input${sep}${decimals} decimals${sep}Step: ${step}%`;
      },
      'unique-string': () => {
        const chars = `${cfg.minLength || 1}-${cfg.maxLength || 256}`;
        const caseSens = cfg.caseSensitive ? 'Case sensitive' : 'Case insensitive';
        return detailed
          ? `<strong>Unique strings</strong>${sep}${chars} chars${sep}${caseSens}`
          : `Unique text${sep}${chars} characters${sep}${caseSens.toLowerCase()}`;
      },
      regex: () => {
        const pattern = cfg.pattern || 'No pattern';
        const preview = pattern.length > 30 ? pattern.substring(0, 30) + '...' : pattern;
        const req = cfg.required ? `${sep}Required` : '';
        return detailed
          ? `<strong>Pattern validation</strong>${sep}<code>${preview}</code>${req}`
          : `Pattern validation${sep}${preview}${req}`;
      },
      counter: () => {
        const typeLabel = getCounterTypeLabel(cfg.sequenceType);
        const parts = [
          detailed ? `<strong>${typeLabel}</strong>` : typeLabel,
          `Start: ${cfg.startValue || '1'}`,
        ];
        if (cfg.prefix || cfg.suffix)
          parts.push(detailed ? `Format: ${cfg.prefix}N${cfg.suffix}` : 'Custom format');
        return parts.join(sep);
      },
    };

    const defaultFn = () =>
      detailed
        ? '<strong>Legacy category</strong>' + sep + 'Basic tag list functionality'
        : `Basic tag list${sep}${(category.tags || []).length} tags`;

    return (configs[type] || defaultFn)();
  };

  // Helper function to get category description (non-detailed version)
  const getCategoryDescription = (category) => getTypeConfigSummary(category, false);

  return {
    getTypeConfigSummary,
    getCategoryDescription,
  };
}
