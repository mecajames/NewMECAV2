import { Phone } from 'lucide-react';
import { useState } from 'react';

/**
 * E.164 Standardized International Phone Input Component
 *
 * This component provides a phone number input field with country code selection
 * following the E.164 international telephone numbering format.
 *
 * E.164 Format: +[country code][subscriber number]
 * Example: +1 555-123-4567 (US), +44 20 7123 4567 (UK)
 *
 * @example
 * ```tsx
 * <PhoneInput
 *   value={phoneNumber}
 *   onChange={(phone) => setPhoneNumber(phone)}
 *   countryCode={countryCode}
 *   onCountryCodeChange={(code) => setCountryCode(code)}
 *   label="Phone Number"
 *   required
 * />
 * ```
 */

interface CountryDialCode {
  country: string;
  code: string;
  dialCode: string;
  format: string;
}

interface PhoneInputProps {
  /** Phone number value (without country code) */
  value: string;
  /** Callback when phone number is changed */
  onChange: (phoneNumber: string) => void;
  /** Selected country dial code */
  countryCode?: string;
  /** Callback when country code is changed */
  onCountryCodeChange?: (countryCode: string) => void;
  /** Label for the input field */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show phone icon */
  showIcon?: boolean;
}

// Common country dial codes (E.164)
const dialCodes: CountryDialCode[] = [
  { country: 'United States', code: 'US', dialCode: '+1', format: '(555) 123-4567' },
  { country: 'Canada', code: 'CA', dialCode: '+1', format: '(555) 123-4567' },
  { country: 'Mexico', code: 'MX', dialCode: '+52', format: '55 1234 5678' },
  { country: 'United Kingdom', code: 'GB', dialCode: '+44', format: '20 7123 4567' },
  { country: '────────────', code: '---', dialCode: '---', format: '' },
  { country: 'Afghanistan', code: 'AF', dialCode: '+93', format: '70 123 4567' },
  { country: 'Australia', code: 'AU', dialCode: '+61', format: '4 1234 5678' },
  { country: 'Brazil', code: 'BR', dialCode: '+55', format: '11 91234-5678' },
  { country: 'China', code: 'CN', dialCode: '+86', format: '131 2345 6789' },
  { country: 'France', code: 'FR', dialCode: '+33', format: '6 12 34 56 78' },
  { country: 'Germany', code: 'DE', dialCode: '+49', format: '151 23456789' },
  { country: 'India', code: 'IN', dialCode: '+91', format: '98765 43210' },
  { country: 'Italy', code: 'IT', dialCode: '+39', format: '312 345 6789' },
  { country: 'Japan', code: 'JP', dialCode: '+81', format: '90-1234-5678' },
  { country: 'Russia', code: 'RU', dialCode: '+7', format: '912 345-67-89' },
  { country: 'South Korea', code: 'KR', dialCode: '+82', format: '10-1234-5678' },
  { country: 'Spain', code: 'ES', dialCode: '+34', format: '612 34 56 78' },
];

export default function PhoneInput({
  value,
  onChange,
  countryCode = 'US',
  onCountryCodeChange,
  label = 'Phone Number',
  required = false,
  disabled = false,
  className = '',
  showIcon = true,
}: PhoneInputProps) {
  const [selectedDialCode, setSelectedDialCode] = useState(
    dialCodes.find((dc) => dc.code === countryCode) || dialCodes[0]
  );

  const handleCountryChange = (code: string) => {
    const dialCode = dialCodes.find((dc) => dc.code === code);
    if (dialCode && dialCode.code !== '---') {
      setSelectedDialCode(dialCode);
      onCountryCodeChange?.(code);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-numeric characters except + - ( ) and spaces
    const cleaned = e.target.value.replace(/[^\d\s\-()]/g, '');
    onChange(cleaned);
  };

  const fullPhoneNumber = value ? `${selectedDialCode.dialCode} ${value}` : '';

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {showIcon && <Phone className="inline h-4 w-4 mr-2 text-orange-500" />}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        <select
          value={selectedDialCode.code}
          onChange={(e) => handleCountryChange(e.target.value)}
          disabled={disabled}
          className="w-48 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {dialCodes.map((dc) => (
            <option key={dc.code} value={dc.code} disabled={dc.code === '---'}>
              {dc.code === '---' ? '────────────' : `${dc.dialCode} ${dc.country}`}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={value}
          onChange={handlePhoneChange}
          placeholder={selectedDialCode.format}
          disabled={disabled}
          required={required}
          className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
      {fullPhoneNumber && (
        <p className="text-xs text-gray-400 mt-1">E.164 Format: {fullPhoneNumber}</p>
      )}
    </div>
  );
}
