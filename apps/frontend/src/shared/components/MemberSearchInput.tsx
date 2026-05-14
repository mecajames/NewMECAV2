import { useState, useRef, useEffect, useCallback } from 'react';
import { User } from 'lucide-react';
import { profilesApi, type Profile } from '@/profiles/profiles.api-client';
import { hasActiveMembership } from '@/auth/permissions';

interface ActiveMemberLookupProps {
  name: string;
  mecaId: string;
  onNameChange: (name: string) => void;
  onMecaIdChange: (mecaId: string) => void;
  onSelect: (profile: Profile) => void;
  nameLabel?: string;
  mecaIdLabel?: string;
  nameRequired?: boolean;
}

export default function ActiveMemberLookup({
  name,
  mecaId,
  onNameChange,
  onMecaIdChange,
  onSelect,
  nameLabel = 'Competitor Name *',
  mecaIdLabel = 'MECA ID',
  nameRequired = true,
}: ActiveMemberLookupProps) {
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeField, setActiveField] = useState<'name' | 'mecaId' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const skipSearchRef = useRef(false);

  const doSearch = useCallback(async (query: string) => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        let profiles = await profilesApi.searchProfiles(query);
        profiles = profiles.filter((p) => hasActiveMembership(p as any));
        setResults(profiles);
        setShowDropdown(profiles.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const handleNameChange = (val: string) => {
    onNameChange(val);
    setActiveField('name');
    doSearch(val);
  };

  const handleMecaIdChange = (val: string) => {
    onMecaIdChange(val);
    setActiveField('mecaId');
    doSearch(val);
  };

  const handleSelect = (profile: Profile) => {
    skipSearchRef.current = true;
    onSelect(profile);
    setResults([]);
    setShowDropdown(false);
    setActiveField(null);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{nameLabel}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => { if (results.length > 0 && activeField === 'name') setShowDropdown(true); }}
            placeholder="Type name to search active members..."
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            required={nameRequired}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{mecaIdLabel}</label>
          <input
            type="text"
            value={mecaId}
            onChange={(e) => handleMecaIdChange(e.target.value)}
            onFocus={() => { if (results.length > 0 && activeField === 'mecaId') setShowDropdown(true); }}
            placeholder="Type MECA ID to search..."
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-gray-400 text-sm">Searching active members...</div>
          ) : (
            results.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => handleSelect(profile)}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-600 transition-colors flex items-center gap-3 border-b border-slate-600/50 last:border-0"
              >
                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-white text-sm font-medium truncate">
                    {profile.first_name} {profile.last_name}
                  </div>
                  <div className="text-gray-400 text-xs flex items-center gap-2">
                    {profile.meca_id && <span>MECA #{profile.meca_id}</span>}
                    {profile.email && <span className="truncate">{profile.email}</span>}
                    {profile.state && <span>{profile.state}</span>}
                  </div>
                </div>
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 flex-shrink-0">
                  Active
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
