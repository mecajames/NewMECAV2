import { useState } from 'react';
import { User, Mail, Calendar, Shield, CreditCard, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ChangePassword from '../components/ChangePassword';

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);

  if (!profile || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Account</h1>
          <p className="text-gray-400">Manage your profile and account settings</p>
        </div>

        <div className="grid gap-6">
          {/* Profile Information */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <User className="h-5 w-5 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Profile Information</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  First Name
                </label>
                <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                  {profile.first_name || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Last Name
                </label>
                <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                  {profile.last_name || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email Address
                </label>
                <div className="bg-slate-700 px-4 py-3 rounded-lg text-white flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {profile.email}
                </div>
              </div>

              {profile.meca_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    MECA ID
                  </label>
                  <div className="bg-slate-700 px-4 py-3 rounded-lg text-white">
                    #{profile.meca_id}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Role
                </label>
                <div className="bg-slate-700 px-4 py-3 rounded-lg text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-orange-500" />
                  <span className="capitalize">{profile.role}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Membership Status
                </label>
                <div className="bg-slate-700 px-4 py-3 rounded-lg">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                      profile.membership_status === 'active'
                        ? 'bg-green-500/10 text-green-400'
                        : profile.membership_status === 'expired'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-gray-500/10 text-gray-400'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span className="capitalize">{profile.membership_status}</span>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Member Since
                </label>
                <div className="bg-slate-700 px-4 py-3 rounded-lg text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>

              {profile.membership_expires_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Membership Expires
                  </label>
                  <div className="bg-slate-700 px-4 py-3 rounded-lg text-white flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {new Date(profile.membership_expires_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Security Settings</h2>
              </div>
              {!showChangePassword && (
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Change Password
                </button>
              )}
            </div>

            {showChangePassword ? (
              <ChangePassword onClose={() => setShowChangePassword(false)} />
            ) : (
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm">
                  Keep your account secure by using a strong password and changing it regularly.
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                  <Lock className="h-4 w-4" />
                  <span>Last password change: {new Date(user.updated_at || user.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Additional Settings (Future) */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Preferences</h2>
            </div>

            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <p className="text-gray-400">Additional preferences and settings coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
