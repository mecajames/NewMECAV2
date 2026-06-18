import { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Loader2 } from 'lucide-react';
import { profilesApi } from '@/profiles';

export interface SelectedMember {
  id: string;
  name: string;
  mecaId?: string | number | null;
  email?: string;
}

interface Props {
  value: SelectedMember[];
  onChange: (members: SelectedMember[]) => void;
}

/** Multi-select member picker — searches by name, email, or MECA ID. */
export default function AnnouncementMemberPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SelectedMember[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const profiles = await profilesApi.searchProfiles(query.trim());
        setResults(
          (profiles || []).map((p: any) => ({
            id: p.id,
            name:
              [p.first_name, p.last_name].filter(Boolean).join(' ') ||
              p.full_name ||
              p.email ||
              'Member',
            mecaId: p.meca_id,
            email: p.email,
          })),
        );
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  const add = (m: SelectedMember) => {
    if (!value.some((v) => v.id === m.id)) onChange([...value, m]);
    setQuery('');
    setResults([]);
  };
  const remove = (id: string) => onChange(value.filter((v) => v.id !== id));

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1 px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-sm"
            >
              {m.name}
              {m.mecaId ? ` (#${m.mecaId})` : ''}
              <button type="button" onClick={() => remove(m.id)} className="hover:text-orange-100">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {searching ? (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or MECA ID…"
          className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500"
        />
        {results.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {results.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => add(m)}
                className="w-full px-4 py-2 text-left hover:bg-slate-600 flex items-center gap-3"
              >
                <Plus className="h-4 w-4 text-green-400" />
                <div>
                  <p className="text-white text-sm">
                    {m.name}
                    {m.mecaId ? ` · MECA ${m.mecaId}` : ''}
                  </p>
                  <p className="text-gray-400 text-xs">{m.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-gray-500 text-xs mt-1">
        Type at least 2 characters. {value.length} member(s) selected.
      </p>
    </div>
  );
}
