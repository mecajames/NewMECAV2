import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';
import { CompetitionClass } from '../competition-classes.api-client';

/**
 * Searchable combobox for picking a CompetitionClass. Replaces a
 * native <select> whose typeahead only matches the first letter and
 * times out — useless when there are 200+ classes named with prefixes
 * like "SPL Extreme — …". Filters on every keystroke against name,
 * abbreviation, and format text. The dropdown panel renders through
 * a portal at document.body with fixed positioning, so it escapes
 * any ancestor `overflow: hidden` (rounded card clipping, etc.).
 */
export function ClassPicker({
  classes,
  value,
  onChange,
  placeholder,
  className,
}: {
  classes: CompetitionClass[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = value ? classes.find((c) => c.id === value) : undefined;
  const label = selected
    ? `[${selected.format}] ${selected.name} (${selected.abbreviation})${!selected.is_active ? ' · inactive' : ''}`
    : '';

  useLayoutEffect(() => {
    if (!open) return;
    const recompute = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    recompute();
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const sorted = useMemo(
    () => classes.slice().sort((a, b) => `${a.format} ${a.name}`.localeCompare(`${b.format} ${b.name}`)),
    [classes],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    const tokens = q.split(/\s+/).filter(Boolean);
    return sorted.filter((c) => {
      const hay = `${c.format} ${c.name} ${c.abbreviation}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [sorted, query]);

  return (
    <div className={`relative ${className || ''}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <span
          className={`truncate text-left ${selected ? '' : 'text-gray-400'}`}
          title={selected ? label : undefined}
        >
          {selected ? label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: Math.max(pos.width, 400),
          }}
          className="z-[100] bg-slate-800 border border-slate-600 rounded-lg shadow-2xl overflow-hidden"
        >
          <div className="p-2 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setOpen(false);
                    setQuery('');
                  } else if (e.key === 'Enter' && filtered.length > 0) {
                    onChange(filtered[0].id);
                    setOpen(false);
                    setQuery('');
                  }
                }}
                placeholder="Search format, name, abbreviation…"
                className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">No classes match "{query}"</div>
            ) : (
              filtered.map((c) => {
                const isSel = c.id === value;
                const fullLabel = `[${c.format}] ${c.name} (${c.abbreviation})${!c.is_active ? ' · inactive' : ''}`;
                return (
                  <button
                    key={c.id}
                    type="button"
                    // Native tooltip: long class names truncate, and similar
                    // names ("Dueling Demos Modified Street 1/2/3") become
                    // indistinguishable — hover shows the full label.
                    title={fullLabel}
                    onClick={() => {
                      onChange(c.id);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 ${
                      isSel ? 'bg-orange-500/20 text-orange-200' : 'text-gray-200 hover:bg-slate-700'
                    }`}
                  >
                    {isSel ? (
                      <Check className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                    ) : (
                      <span className="h-3.5 w-3.5 flex-shrink-0" />
                    )}
                    {/* Only the NAME truncates — the abbreviation (the part
                        that actually tells near-identical classes apart)
                        stays pinned and always visible on the right. */}
                    <span className="flex-1 min-w-0 flex items-baseline gap-1.5">
                      <span className="truncate">
                        <span className="text-gray-400">[{c.format}]</span> {c.name}
                      </span>
                      <span className="text-gray-500 flex-shrink-0">({c.abbreviation})</span>
                      {!c.is_active && <span className="text-red-400 text-xs flex-shrink-0">· inactive</span>}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
