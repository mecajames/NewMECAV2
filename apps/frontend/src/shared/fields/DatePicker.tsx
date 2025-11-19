import { Calendar } from 'lucide-react';

/**
 * ISO 8601 Standardized Date Picker Component
 *
 * This component provides a date input field following ISO 8601 date format (YYYY-MM-DD).
 * It uses the native HTML5 date input for consistent behavior across browsers.
 *
 * ISO 8601 Format: YYYY-MM-DD
 * Example: 2025-11-01
 *
 * @example
 * ```tsx
 * <DatePicker
 *   value={selectedDate}
 *   onChange={(date) => setSelectedDate(date)}
 *   label="Event Date"
 *   required
 * />
 * ```
 */

interface DatePickerProps {
  /** Date value in ISO 8601 format (YYYY-MM-DD) */
  value: string;
  /** Callback when date is changed */
  onChange: (date: string) => void;
  /** Label for the date picker */
  label?: string;
  /** Minimum allowed date (ISO 8601 format) */
  min?: string;
  /** Maximum allowed date (ISO 8601 format) */
  max?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show calendar icon */
  showIcon?: boolean;
}

export default function DatePicker({
  value,
  onChange,
  label = 'Date',
  min,
  max,
  required = false,
  disabled = false,
  className = '',
  showIcon = true,
}: DatePickerProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {showIcon && <Calendar className="inline h-4 w-4 mr-2 text-orange-500" />}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed [color-scheme:dark]"
      />
      <p className="text-xs text-gray-400 mt-1">ISO 8601 Format: YYYY-MM-DD</p>
    </div>
  );
}
