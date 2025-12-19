import { Mail } from 'lucide-react';
import { getPostalCodeLabel } from '@/utils/countries';

/**
 * Standardized Postal Code / ZIP Code Input Component
 *
 * This component provides a postal code input field with validation patterns
 * for different countries following their respective postal code formats.
 *
 * Supported formats:
 * - US: 12345 or 12345-6789 (ZIP or ZIP+4)
 * - CA: A1A 1A1 (Canadian postal code format)
 * - GB: A1A 1AA, A11 1AA, AA1A 1AA, AA11 1AA (UK postcode formats)
 * - ES: 01000-52999 (Spanish 5-digit postal code)
 * - FR: 01000-98999 (French 5-digit postal code)
 * - PL: 00-000 (Polish postal code with hyphen)
 * - Generic: Alphanumeric with spaces and hyphens
 *
 * @example
 * ```tsx
 * <PostalCodeInput
 *   value={postalCode}
 *   onChange={(code) => setPostalCode(code)}
 *   country="US"
 *   label="ZIP Code"
 *   required
 * />
 * ```
 */

interface PostalCodeInputProps {
  /** Currently entered postal code value */
  value: string;
  /** Callback when postal code is changed */
  onChange: (postalCode: string) => void;
  /** Country code to determine validation pattern */
  country?: string;
  /** Label for the input field */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show mail icon */
  showIcon?: boolean;
}

const patterns: Record<string, string> = {
  US: '[0-9]{5}(-[0-9]{4})?', // 12345 or 12345-6789
  CA: '[A-Za-z][0-9][A-Za-z] ?[0-9][A-Za-z][0-9]', // A1A 1A1
  GB: '[A-Za-z]{1,2}[0-9][A-Za-z0-9]? ?[0-9][A-Za-z]{2}', // Various UK formats
  ES: '[0-9]{5}', // 01000-52999 (5 digits)
  FR: '[0-9]{5}', // 01000-98999 (5 digits)
  PL: '[0-9]{2}-[0-9]{3}', // 00-000 format
  MX: '[0-9]{5}', // Mexican 5-digit postal code
  DE: '[0-9]{5}', // German 5-digit postal code
  IT: '[0-9]{5}', // Italian 5-digit postal code (CAP)
  AU: '[0-9]{4}', // Australian 4-digit postcode
  JP: '[0-9]{3}-[0-9]{4}', // Japanese postal code 000-0000
  CN: '[0-9]{6}', // Chinese 6-digit postal code
  BR: '[0-9]{5}-[0-9]{3}', // Brazilian CEP 00000-000
  IN: '[0-9]{6}', // Indian PIN code (6 digits)
  TT: '[0-9]{6}', // Trinidad and Tobago 6-digit postal code
  GENERIC: '[A-Za-z0-9 -]+', // Alphanumeric with spaces and hyphens
};

const placeholders: Record<string, string> = {
  US: '12345 or 12345-6789',
  CA: 'A1A 1A1',
  GB: 'SW1A 1AA',
  ES: '28001',
  FR: '75001',
  PL: '00-001',
  MX: '01000',
  DE: '10115',
  IT: '00100',
  AU: '2000',
  JP: '100-0001',
  CN: '100000',
  BR: '01310-100',
  IN: '110001',
  TT: '100000',
  GENERIC: 'Enter postal code',
};

export default function PostalCodeInput({
  value,
  onChange,
  country = 'US',
  label,
  placeholder,
  required = false,
  disabled = false,
  className = '',
  showIcon = true,
}: PostalCodeInputProps) {
  const defaultLabel = getPostalCodeLabel(country);
  const pattern = patterns[country] || patterns.GENERIC;
  const placeholderText = placeholder || placeholders[country] || placeholders.GENERIC;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    // Auto-format for specific countries
    if (country === 'CA' && val.length === 6 && !val.includes(' ')) {
      // Insert space in Canadian postal codes: A1A1A1 -> A1A 1A1
      val = val.slice(0, 3) + ' ' + val.slice(3);
    }

    if (country === 'PL' && val.length === 5 && !val.includes('-')) {
      // Insert hyphen in Polish postal codes: 00001 -> 00-001
      val = val.slice(0, 2) + '-' + val.slice(2);
    }

    if (country === 'JP' && val.length === 7 && !val.includes('-')) {
      // Insert hyphen in Japanese postal codes: 1000001 -> 100-0001
      val = val.slice(0, 3) + '-' + val.slice(3);
    }

    if (country === 'BR' && val.length === 8 && !val.includes('-')) {
      // Insert hyphen in Brazilian CEP: 01310100 -> 01310-100
      val = val.slice(0, 5) + '-' + val.slice(5);
    }

    // Uppercase for countries that use letters in postal codes
    if (['CA', 'GB'].includes(country)) {
      val = val.toUpperCase();
    }

    onChange(val);
  };

  return (
    <div className={className}>
      {(label || defaultLabel) && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {showIcon && <Mail className="inline h-4 w-4 mr-2 text-orange-500" />}
          {label || defaultLabel}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholderText}
        pattern={pattern}
        disabled={disabled}
        required={required}
        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <p className="text-xs text-gray-400 mt-1">Format: {placeholderText}</p>
    </div>
  );
}
