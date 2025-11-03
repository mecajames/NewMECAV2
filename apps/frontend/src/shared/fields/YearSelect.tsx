import { Calendar } from 'lucide-react';

/**
 * ISO Standardized Year Selector Component
 *
 * This component provides a standardized year selection dropdown following ISO 8601 date format.
 * It generates a range of years dynamically based on the specified range.
 *
 * @example
 * ```tsx
 * <YearSelect
 *   value={selectedYear}
 *   onChange={(year) => setSelectedYear(year)}
 *   yearRange={{ start: 2000, end: 2030 }}
 *   label="Competition Year"
 * />
 * ```
 */

interface YearSelectProps {
  /** Currently selected year value */
  value: string | number;
  /** Callback when year is changed */
  onChange: (year: string) => void;
  /** Range of years to display */
  yearRange?: {
    /** Start year (default: 10 years ago) */
    start?: number;
    /** End year (default: 5 years in the future) */
    end?: number;
  };
  /** Label for the select field */
  label?: string;
  /** Whether to show an "All Years" option */
  showAllOption?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show calendar icon */
  showIcon?: boolean;
}

export default function YearSelect({
  value,
  onChange,
  yearRange,
  label = 'Year',
  showAllOption = false,
  required = false,
  disabled = false,
  className = '',
  showIcon = true,
}: YearSelectProps) {
  const currentYear = new Date().getFullYear();

  const startYear = yearRange?.start || currentYear - 10;
  const endYear = yearRange?.end || currentYear + 5;

  // Generate array of years in descending order (most recent first)
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => endYear - i
  );

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {showIcon && <Calendar className="inline h-4 w-4 mr-2 text-orange-500" />}
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
        {showAllOption && <option value="">All Years</option>}
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
            {year === currentYear ? ' (Current)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
