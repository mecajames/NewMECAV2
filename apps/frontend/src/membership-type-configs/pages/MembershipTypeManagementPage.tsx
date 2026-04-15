import { useState, lazy, Suspense } from 'react';
import { ArrowLeft, DollarSign, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MembershipTypeManagement } from '@/memberships';

const ManagePermissionsPage = lazy(() => import('@/admin/pages/ManagePermissionsPage'));

function PermissionsTab() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-20">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent" />
        </div>
      }
    >
      <ManagePermissionsPage embedded />
    </Suspense>
  );
}

export default function MembershipTypeManagementPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'membership-types' | 'roles-permissions'>('membership-types');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
              Membership & Roles Management
            </h1>
            <p className="text-gray-400">Configure membership options, roles, and permissions</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-700 pb-0">
          <button
            onClick={() => setActiveTab('membership-types')}
            className={`flex items-center gap-2 px-5 py-3 text-sm sm:text-base font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === 'membership-types'
                ? 'bg-slate-800 text-orange-400 border-orange-500'
                : 'text-gray-400 hover:text-gray-200 border-transparent hover:bg-slate-800/50'
            }`}
          >
            <DollarSign className="h-5 w-5" />
            Membership Types
          </button>
          <button
            onClick={() => setActiveTab('roles-permissions')}
            className={`flex items-center gap-2 px-5 py-3 text-sm sm:text-base font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === 'roles-permissions'
                ? 'bg-slate-800 text-orange-400 border-orange-500'
                : 'text-gray-400 hover:text-gray-200 border-transparent hover:bg-slate-800/50'
            }`}
          >
            <Shield className="h-5 w-5" />
            Roles & Permissions
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'membership-types' && <MembershipTypeManagement />}
        {activeTab === 'roles-permissions' && <PermissionsTab />}
      </div>
    </div>
  );
}
