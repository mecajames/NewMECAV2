import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import {
  calculatePasswordStrength,
  getStrengthColorClasses,
  MIN_PASSWORD_STRENGTH,
} from '../../utils/passwordUtils';

interface PasswordStrengthIndicatorProps {
  password: string;
  showFeedback?: boolean;
  showScore?: boolean;
  className?: string;
}

export function PasswordStrengthIndicator({
  password,
  showFeedback = true,
  showScore = true,
  className = '',
}: PasswordStrengthIndicatorProps) {
  const strength = calculatePasswordStrength(password);
  const colors = getStrengthColorClasses(strength.score);
  const meetsMinimum = strength.score >= MIN_PASSWORD_STRENGTH;

  if (!password) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Password Strength</span>
          <span className={`font-medium ${colors.text}`}>
            {strength.label}
            {showScore && ` (${strength.score}/100)`}
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${colors.bar}`}
            style={{ width: `${strength.score}%` }}
          />
        </div>
      </div>

      {/* Minimum requirement indicator */}
      <div className={`flex items-center gap-2 text-sm ${meetsMinimum ? 'text-green-500' : 'text-red-400'}`}>
        {meetsMinimum ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <span>
          {meetsMinimum
            ? 'Meets minimum strength requirement'
            : `Minimum strength required: ${MIN_PASSWORD_STRENGTH}`}
        </span>
      </div>

      {/* Feedback */}
      {showFeedback && strength.feedback.length > 0 && !meetsMinimum && (
        <div className={`p-3 rounded-lg ${colors.bg}`}>
          <div className="flex items-start gap-2">
            <AlertCircle className={`h-4 w-4 mt-0.5 ${colors.text}`} />
            <div className="space-y-1">
              <p className={`text-sm font-medium ${colors.text}`}>Tips to improve:</p>
              <ul className="text-sm text-gray-300 space-y-0.5">
                {strength.feedback.map((tip, index) => (
                  <li key={index}>• {tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for inline display
 */
export function PasswordStrengthBadge({ password }: { password: string }) {
  const strength = calculatePasswordStrength(password);
  const colors = getStrengthColorClasses(strength.score);

  if (!password) {
    return null;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
      <span
        className={`w-2 h-2 rounded-full ${colors.bar}`}
      />
      {strength.label} ({strength.score})
    </span>
  );
}

export default PasswordStrengthIndicator;
