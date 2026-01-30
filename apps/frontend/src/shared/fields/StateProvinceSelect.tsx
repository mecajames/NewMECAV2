import { MapPin } from 'lucide-react';
import { getStatesForCountry, getStateLabel } from '@/utils/countries';

/**
 * ISO 3166-2 Standardized State/Province/Region Selector Component
 *
 * This component provides a state/province/region selection dropdown for multiple countries
 * following ISO 3166-2 subdivision codes.
 *
 * Supported countries:
 * - US: States
 * - CA: Provinces/Territories
 * - MX: States
 * - GB: Countries (England, Scotland, Wales, Northern Ireland)
 * - ES: Autonomous Communities
 * - FR: Regions
 * - PL: Voivodeships
 *
 * @example
 * ```tsx
 * <StateProvinceSelect
 *   value={selectedState}
 *   onChange={(code) => setSelectedState(code)}
 *   country="US"
 *   label="State"
 *   required
 * />
 * ```
 */

interface StateProvinceSelectProps {
  /** Currently selected state/province code (ISO 3166-2) */
  value: string;
  /** Callback when state/province is changed */
  onChange: (code: string) => void;
  /** Country code to determine which list to show */
  country?: string;
  /** Label for the select field (auto-generated based on country if not provided) */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show map pin icon */
  showIcon?: boolean;
}

export default function StateProvinceSelect({
  value,
  onChange,
  country = 'US',
  label,
  required = false,
  disabled = false,
  className = '',
  showIcon = true,
}: StateProvinceSelectProps) {
  const regions = getStatesForCountry(country);
  const defaultLabel = getStateLabel(country);
  const placeholderText = `Select ${defaultLabel.toLowerCase()}`;

  // If country has no regions defined, show a text input instead
  if (regions.length === 0) {
    return (
      <div className={className}>
        {(label || defaultLabel) && (
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {showIcon && <MapPin className="inline h-4 w-4 mr-2 text-orange-500" />}
            {label || defaultLabel}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          placeholder={`Enter ${defaultLabel.toLowerCase()}`}
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {(label || defaultLabel) && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {showIcon && <MapPin className="inline h-4 w-4 mr-2 text-orange-500" />}
          {label || defaultLabel}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">{placeholderText}</option>
        {regions.map((region) => (
          <option key={region.code} value={region.code}>
            {region.name}
          </option>
        ))}
      </select>
    </div>
  );
}
