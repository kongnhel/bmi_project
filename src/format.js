import { KG_PER_LB, cmToFtIn, formatDecimal } from './bmi.js';

const NUMBER_LOCALE = 'en-US';
const KHMER_MONTHS = Object.freeze([
  'មករា',
  'កុម្ភៈ',
  'មីនា',
  'មេសា',
  'ឧសភា',
  'មិថុនា',
  'កក្កដា',
  'សីហា',
  'កញ្ញា',
  'តុលា',
  'វិច្ឆិកា',
  'ធ្នូ',
]);

export function localeFor(language) {
  return language === 'km' ? 'km-KH' : 'en-GB';
}

export function formatDate(timestamp, language) {
  const date = new Date(timestamp);
  if (language === 'km') {
    return `${date.getDate()} ${KHMER_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatTime(timestamp, language) {
  return new Intl.DateTimeFormat(localeFor(language), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    numberingSystem: 'latn',
  }).format(new Date(timestamp));
}

export function formatLoose(value, maximumFractionDigits = 1) {
  if (!Number.isFinite(value)) return '';
  return value.toLocaleString(NUMBER_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

export function formatWholeNumber(value) {
  if (!Number.isFinite(value)) return '';
  return Math.round(value).toLocaleString(NUMBER_LOCALE);
}

export function formatWeight(weightKg, unit) {
  if (!Number.isFinite(weightKg)) return '';
  if (unit === 'imperial') {
    return `${formatLoose(weightKg / KG_PER_LB)} lb`;
  }
  return `${formatLoose(weightKg)} kg`;
}

export function formatHeight(heightCm, unit) {
  if (!Number.isFinite(heightCm)) return '';
  if (unit === 'imperial') {
    const { feet, inches } = cmToFtIn(heightCm);
    return `${feet}′ ${formatLoose(inches)}″`;
  }
  return `${formatLoose(heightCm)} cm`;
}

export function formatHealthyRange(minKg, maxKg, unit) {
  if (unit === 'imperial') {
    return `${formatWholeNumber(minKg / KG_PER_LB)}–${formatWholeNumber(maxKg / KG_PER_LB)} lb`;
  }
  return `${formatDecimal(minKg, 1)}–${formatDecimal(maxKg, 1)} kg`;
}

export function formatWeightAmount(weightKg, unit) {
  if (unit === 'imperial') {
    return { amount: formatDecimal(weightKg / KG_PER_LB, 1), unit: 'lb' };
  }
  return { amount: formatDecimal(weightKg, 1), unit: 'kg' };
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
