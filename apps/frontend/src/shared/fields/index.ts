/**
 * ISO Standardized Field Components
 *
 * This module exports standardized, reusable form field components that follow
 * international standards (ISO 3166, ISO 8601, E.164, etc.).
 *
 * All components are designed with:
 * - Consistent styling matching the app's design system
 * - Proper validation and formatting
 * - Accessibility features
 * - ISO standard compliance
 *
 * Usage:
 * Import the components you need:
 * ```tsx
 * import { YearSelect, CountrySelect, DatePicker } from '@/shared/fields';
 * ```
 */

export { default as YearSelect } from './YearSelect';
export { default as CountrySelect } from './CountrySelect';
export { default as StateProvinceSelect } from './StateProvinceSelect';
export { default as PostalCodeInput } from './PostalCodeInput';
export { default as PhoneInput } from './PhoneInput';
export { default as DatePicker } from './DatePicker';
