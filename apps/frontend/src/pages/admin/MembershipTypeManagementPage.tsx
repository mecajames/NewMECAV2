import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MembershipTypeManagement from '../../components/admin/MembershipTypeManagement';

export default function MembershipTypeManagementPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Membership Type Management</h1>
            <p className="text-gray-400">Configure membership options and pricing</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
        </div>

        <MembershipTypeManagement />
      </div>
    </div>
  );
}
