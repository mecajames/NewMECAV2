import { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/auth';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PasswordStrengthIndicator } from '@/shared/components/PasswordStrengthIndicator';
import { calculatePasswordStrength, MIN_PASSWORD_STRENGTH } from '@/utils/passwordUtils';

interface ChangePasswordProps {
  onClose?: () => void;
  forced?: boolean; // Can be passed as prop or detected from URL
}

export default function ChangePassword({ onClose, forced: forcedProp }: ChangePasswordProps) {
  const { updatePassword, clearForcePasswordChange, forcePasswordChange } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Determine if this is a forced password change
  const isForced = forcedProp || searchParams.get('forced') === 'true' || forcePasswordChange;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    // Check password strength
    const strength = calculatePasswordStrength(newPassword);
    if (strength.score < MIN_PASSWORD_STRENGTH) {
      setError(`Password is not strong enough. Current strength: ${strength.score}. Minimum required: ${MIN_PASSWORD_STRENGTH}`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);

    const { error } = await updatePassword(currentPassword, newPassword);

    if (error) {
      setError(error.message || 'Failed to update password');
      setLoading(false);
    } else {
      // If this was a forced password change, clear the flag
      if (isForced) {
        await clearForcePasswordChange();
      }

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLoading(false);

      // Auto close/redirect after 2 seconds
      setTimeout(() => {
        if (isForced) {
          // Navigate to profile or home page after forced password change
          navigate('/profile');
        } else if (onClose) {
          onClose();
        }
      }, 2000);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
          <Lock className="h-5 w-5 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">Change Password</h2>
      </div>

      {/* Forced password change notice */}
      {isForced && !success && (
        <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-500 font-medium">Password Change Required</p>
            <p className="text-amber-400 text-sm mt-1">
              For security reasons, you must change your password before continuing.
              This is typically required when your account was created by an administrator
              or your password was recently reset.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-green-500 text-sm">Password updated successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="current-password" className="block text-sm font-medium text-gray-300 mb-2">
            Current Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              id="current-password"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter current password"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-300 mb-2">
            New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              id="new-password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter new password (min 6 characters)"
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {/* Password Strength Indicator */}
          {newPassword && (
            <div className="mt-2">
              <PasswordStrengthIndicator
                password={newPassword}
                showFeedback={true}
                showScore={true}
              />
              <p className="text-xs text-gray-400 mt-1">
                Minimum strength required: {MIN_PASSWORD_STRENGTH}
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-2">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Confirm new password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
          {/* Hide Cancel button when password change is forced */}
          {onClose && !isForced && (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
