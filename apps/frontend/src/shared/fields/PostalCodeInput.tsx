import { Mail } from 'lucide-react';

/**
 * Standardized Postal Code / ZIP Code Input Component
 *
 * This component provides a postal code input field with validation patterns
 * for different countries following their respective postal code formats.
 *
 * Supported formats:
 * - US: 12345 or 12345-6789 (ZIP or ZIP+4)
 * - CA: A1A 1A1 (Canadian postal code format)
 * - UK: A1A 1AA, A11 1AA, AA1A 1AA, AA11 1AA (UK postcode formats)
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
  country?: 'US' | 'CA' | 'UK' | 'GENERIC';
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

const patterns = {
  US: '[0-9]{5}(-[0-9]{4})?', // 12345 or 12345-6789
  CA: '[A-Za-z][0-9][A-Za-z] ?[0-9][A-Za-z][0-9]', // A1A 1A1
  UK: '[A-Za-z]{1,2}[0-9][A-Za-z0-9]? ?[0-9][A-Za-z]{2}', // Various UK formats
  GENERIC: '[A-Za-z0-9 -]+', // Alphanumeric with spaces and hyphens
};

const placeholders = {
  US: '12345 or 12345-6789',
  CA: 'A1A 1A1',
  UK: 'SW1A 1AA',
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
  const defaultLabel = country === 'US' ? 'ZIP Code' : 'Postal Code';
  const pattern = patterns[country];
  const placeholderText = placeholder || placeholders[country];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;

    // Auto-format for specific countries
    if (country === 'CA' && val.length === 6 && !val.includes(' ')) {
      // Insert space in Canadian postal codes: A1A1A1 -> A1A 1A1
      val = val.slice(0, 3) + ' ' + val.slice(3);
    }

    onChange(val.toUpperCase());
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
