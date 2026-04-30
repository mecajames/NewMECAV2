import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Award, ShoppingBag, Calendar } from 'lucide-react';

interface BillingHubCardProps {
  icon: any;
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  onClick: () => void;
}

function BillingHubCard({ icon: Icon, title, description, iconBg, iconColor, onClick }: BillingHubCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-slate-700 rounded-xl p-6 hover:bg-slate-600 transition-colors text-left group w-full"
    >
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-full ${iconBg} flex items-center justify-center group-hover:opacity-80 transition-colors flex-shrink-0`}>
          <Icon className={`h-7 w-7 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          <p className="text-gray-400 text-sm mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
}

export default function MembershipBillingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-400">Account</h2>
          <button
            onClick={() => navigate('/dashboard/mymeca')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Membership & Billing</h1>
          <p className="text-gray-400">Manage your memberships, payments, orders, and event registrations.</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BillingHubCard
              icon={FileText}
              title="My Payments & Invoices"
              description="View payment history and pay outstanding invoices"
              iconBg="bg-purple-500/10"
              iconColor="text-purple-500"
              onClick={() => navigate('/billing')}
            />

            <BillingHubCard
              icon={Award}
              title="My Memberships"
              description="View your active memberships and digital membership card"
              iconBg="bg-orange-500/10"
              iconColor="text-orange-500"
              onClick={() => navigate('/dashboard/membership')}
            />

            <BillingHubCard
              icon={ShoppingBag}
              title="My Shop Orders"
              description="Track shop orders, shipments, and view order history"
              iconBg="bg-blue-500/10"
              iconColor="text-blue-500"
              onClick={() => navigate('/shop/orders')}
            />

            <BillingHubCard
              icon={Calendar}
              title="My Event Registrations"
              description="View upcoming events you've registered for"
              iconBg="bg-green-500/10"
              iconColor="text-green-500"
              onClick={() => navigate('/my-registrations')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
