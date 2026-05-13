import { useState } from 'react';
import { Users, Star } from 'lucide-react';
import { TicketStaffManagement } from './TicketStaffManagement';
import { TicketStaffRatings } from './TicketStaffRatings';

type StaffSubTab = 'settings' | 'ratings';

/**
 * Wraps the existing TicketStaffManagement table with a sub-tab strip so
 * the Staff area can host adjacent views without forcing them into the
 * top-level tab nav (Staff Settings vs Staff Ratings is a parent/child
 * relationship, not a sibling one). Defaults to the settings table so
 * existing muscle memory keeps working.
 */
export function TicketStaffArea() {
  const [subTab, setSubTab] = useState<StaffSubTab>('settings');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-700 overflow-x-auto">
        {[
          { id: 'settings' as const, label: 'Staff Settings', icon: <Users className="w-4 h-4" /> },
          { id: 'ratings' as const, label: 'Staff Ratings', icon: <Star className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              subTab === t.id
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'settings' ? <TicketStaffManagement /> : <TicketStaffRatings />}
    </div>
  );
}

export default TicketStaffArea;
