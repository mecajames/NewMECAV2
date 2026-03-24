import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { foreverMembersApi, ForeverMember } from '../forever-members.api-client';
import { getStorageUrl } from '@/lib/storage';

export default function ForeverMembersPage() {
  const [members, setMembers] = useState<ForeverMember[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    foreverMembersApi.getAll().then(setMembers).catch(console.error).finally(() => setLoading(false));
  }, []);

  const formatYears = (m: ForeverMember) => {
    const birth = m.date_of_birth ? new Date(m.date_of_birth).getFullYear() : null;
    const passing = m.date_of_passing ? new Date(m.date_of_passing).getFullYear() : null;
    if (birth && passing) return `${birth} – ${passing}`;
    if (passing) return `† ${passing}`;
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 relative">
      {/* Angel Wings Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.05]"
        style={{
          backgroundImage: 'url(/angel-wings.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center 90%',
          backgroundSize: 'contain',
        }}
      />

      {/* Header */}
      <div className="relative z-10 bg-gradient-to-b from-slate-800 to-slate-900 border-b border-amber-900/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
          <img src="/eternal-flame.png" alt="Infinity Flame Memorial" className="h-24 sm:h-28 md:h-32 mx-auto mb-2 -mt-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
            Forever Members
          </h1>
          <p className="text-lg text-amber-200/70 max-w-2xl mx-auto">
            In loving memory of the MECA family members who have left an enduring mark on our community.
            Their passion for car audio lives on.
          </p>
          <div className="w-24 h-0.5 bg-amber-600/50 mx-auto mt-6" />
        </div>
      </div>

      {/* Members Grid */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {members.length === 0 ? (
          <div className="text-center py-16">
            <Flame className="h-12 w-12 text-amber-600/30 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No memorial entries yet.</p>
          </div>
        ) : (
          <div className={`grid gap-6 justify-items-center ${
            members.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' :
            members.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' :
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}>
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => navigate(`/forever-members/${member.id}`)}
                className="bg-slate-800/80 border border-amber-900/20 rounded-xl overflow-hidden hover:border-amber-600/40 transition-all group text-left"
              >
                {/* Photo */}
                <div className="aspect-[4/3] bg-slate-700 overflow-hidden">
                  {member.photo_url ? (
                    <img
                      src={getStorageUrl(member.photo_url)}
                      alt={member.full_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Flame className="h-16 w-16 text-amber-600/20" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors truncate">
                      {member.full_name}
                    </h3>
                  </div>
                  {formatYears(member) && (
                    <p className="text-amber-200/50 text-sm ml-6">{formatYears(member)}</p>
                  )}
                  {member.meca_id && (
                    <p className="text-amber-600/60 text-xs mt-2 ml-6 font-mono">
                      Forever MECA ID #{member.meca_id}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
