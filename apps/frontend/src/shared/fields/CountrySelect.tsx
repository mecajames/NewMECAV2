import { Globe } from 'lucide-react';

/**
 * ISO 3166-1 Standardized Country Selector Component
 *
 * This component provides a country selection dropdown following ISO 3166-1 alpha-2 country codes.
 * Countries are sorted alphabetically by name with common countries at the top.
 *
 * @example
 * ```tsx
 * <CountrySelect
 *   value={selectedCountry}
 *   onChange={(code) => setSelectedCountry(code)}
 *   label="Country"
 *   required
 * />
 * ```
 */

interface Country {
  code: string; // ISO 3166-1 alpha-2 code
  name: string;
}

interface CountrySelectProps {
  /** Currently selected country code (ISO 3166-1 alpha-2) */
  value: string;
  /** Callback when country is changed */
  onChange: (countryCode: string) => void;
  /** Label for the select field */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show globe icon */
  showIcon?: boolean;
}

// ISO 3166-1 alpha-2 country codes
const countries: Country[] = [
  // Common countries (often used)
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
  { code: 'GB', name: 'United Kingdom' },
  // Separator
  { code: '---', name: '────────────────' },
  // All countries alphabetically (excluding those already in common section)
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EG', name: 'Egypt' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NO', name: 'Norway' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TR', name: 'Turkey' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'VN', name: 'Vietnam' },
];

export default function CountrySelect({
  value,
  onChange,
  label = 'Country',
  required = false,
  disabled = false,
  className = '',
  showIcon = true,
}: CountrySelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {showIcon && <Globe className="inline h-4 w-4 mr-2 text-orange-500" />}
          {label}
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
        <option value="">Select a country</option>
        {countries.map((country) => (
          <option
            key={country.code}
            value={country.code}
            disabled={country.code === '---'}
          >
            {country.name}
          </option>
        ))}
      </select>
    </div>
  );
}
