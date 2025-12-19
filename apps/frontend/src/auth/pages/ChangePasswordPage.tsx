import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ChangePassword from '@/profiles/components/ChangePassword';

/**
 * Standalone page for changing password.
 * Used when user needs to change password (forced) or accesses directly.
 */
export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, forcePasswordChange } = useAuth();

  // If no user, redirect to login
  if (!user) {
    navigate('/login');
    return null;
  }

  const handleClose = () => {
    // Navigate back to profile if not forced
    navigate('/profile');
  };

  return (
    <div className="min-h-screen bg-slate-900 py-12">
      <div className="max-w-md mx-auto px-4">
        <ChangePassword
          onClose={forcePasswordChange ? undefined : handleClose}
        />
      </div>
    </div>
  );
}
