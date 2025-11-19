import { MapPin } from 'lucide-react';

/**
 * ISO 3166-2 Standardized State/Province Selector Component
 *
 * This component provides a state/province selection dropdown for US states and Canadian provinces
 * following ISO 3166-2 subdivision codes.
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

interface StateProvince {
  code: string; // ISO 3166-2 subdivision code
  name: string;
}

interface StateProvinceSelectProps {
  /** Currently selected state/province code (ISO 3166-2) */
  value: string;
  /** Callback when state/province is changed */
  onChange: (code: string) => void;
  /** Country code to determine which list to show (US or CA) */
  country?: 'US' | 'CA';
  /** Label for the select field */
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

// US States (ISO 3166-2:US)
const usStates: StateProvince[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

// Canadian Provinces and Territories (ISO 3166-2:CA)
const canadianProvinces: StateProvince[] = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'YT', name: 'Yukon' },
];

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
  const regions = country === 'CA' ? canadianProvinces : usStates;
  const defaultLabel = country === 'CA' ? 'Province/Territory' : 'State';
  const placeholderText = country === 'CA' ? 'Select a province/territory' : 'Select a state';

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
