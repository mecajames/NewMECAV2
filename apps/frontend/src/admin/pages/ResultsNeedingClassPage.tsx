import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, RefreshCw, Link2, ExternalLink, X, Check, Minus, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { competitionResultsApi } from '@/competition-results';
import { competitionClassesApi, CompetitionClass } from '@/competition-classes';

/**
 * Searchable combobox for picking a CompetitionClass. Replaces a
 * native <select> whose typeahead only matches the first letter and
 * times out — useless when there are 200+ classes named with prefixes
 * like "SPL Extreme — …". Filters on every keystroke against name,
 * abbreviation, and format text.
 */
function ClassPicker({
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

  // Compute panel position from the trigger's bounding rect. Re-run
  // when the panel opens, on window resize, and on scroll so the
  // panel tracks the trigger if the user scrolls the page while the
  // picker is open.
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

  // Close on outside click. Check BOTH the trigger button and the
  // portalled panel — the panel is no longer a descendant of the
  // picker container since it's mounted at the document root.
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
    // Split into tokens so "spl ext" matches "SPL Extreme" even
    // though those words aren't adjacent in [format] name (abbr).
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
          // When opening, give the search input focus on next tick.
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <span className={`truncate text-left ${selected ? '' : 'text-gray-400'}`}>
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
            width: Math.max(pos.width, 320),
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
                return (
                  <button
                    key={c.id}
                    type="button"
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
                    <span className="truncate">
                      <span className="text-gray-400">[{c.format}]</span> {c.name}{' '}
                      <span className="text-gray-500">({c.abbreviation})</span>
                      {!c.is_active && <span className="text-red-400 text-xs"> · inactive</span>}
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

/**
 * Admin tool: list every CompetitionResult that can't be resolved to
 * an active class (orphan class_id + text fallback also failed). For
 * each row, admin picks a target class from a dropdown and clicks
 * Link to repoint it. Bulk-link rows that share the same
 * competition_class text (so 8 "M4" results can be fixed in one
 * action instead of eight).
 */
type OrphanRow = Awaited<ReturnType<typeof competitionResultsApi.getOrphanResults>>[number];

export default function ResultsNeedingClassPage() {
  const navigate = useNavigate();
  const [orphans, setOrphans] = useState<OrphanRow[]>([]);
  const [classes, setClasses] = useState<CompetitionClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkBusy, setLinkBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Per-group selected target class. Keyed by the group key (format
  // ::competition_class text), so picking once links every result in
  // the group.
  const [groupTarget, setGroupTarget] = useState<Record<string, string>>({});
  // Free-form per-row selection. Admin can pick rows across groups,
  // then bulk-link them via the sticky toolbar — useful when the
  // groups need different target classes (e.g. some "X" rows go to
  // SPL Extreme and others to SQL Extreme).
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [bulkTargetClassId, setBulkTargetClassId] = useState<string>('');
  const [bulkBusy, setBulkBusy] = useState(false);
  // Each group is an accordion — its table is hidden until the
  // admin expands it. With orphan counts in the hundreds (DDM had
  // 778), eagerly rendering every row across every group hammered
  // React enough that checkbox clicks felt unresponsive. Default
  // collapsed gets the page to interactive instantly and lets the
  // search box do its job.
  const ROW_PREVIEW = 10;
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const toggleGroupOpen = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  // Separate from "is open" — controls preview-vs-full within an
  // open group. Most groups have <10 rows so we can stay on
  // preview; only the big ones need full expansion.
  const [showAllRows, setShowAllRows] = useState<Set<string>>(new Set());
  const toggleShowAllRows = (key: string) => {
    setShowAllRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const [search, setSearch] = useState('');
  const toggleRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const setRowsSelected = (ids: string[], selected: boolean) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };
  const clearSelection = () => setSelectedRowIds(new Set());

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, c] = await Promise.all([
        competitionResultsApi.getOrphanResults(),
        competitionClassesApi.getAll(),
      ]);
      setOrphans(o);
      setClasses(c);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load orphan results');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetch(); }, []);

  // Group orphans by (format, competition_class text) so admins can
  // bulk-link rows that all reference the same misspelled/missing
  // class instead of clicking through them individually.
  const groups = useMemo(() => {
    const m = new Map<string, {
      key: string;
      format: string;
      competitionClass: string;
      rows: OrphanRow[];
      suggestedClass: OrphanRow['suggestedClass'];
      // The class_id all rows in this group point to (when they share
      // one) — useful context: "rows say 'DDM' but class_id resolves
      // to 'Park and Pound (inactive)'". Null when rows in the group
      // disagree on class_id or none have one.
      linkedClass: OrphanRow['linkedClass'];
      // Active class_name_mapping for this group's source text, if
      // any. One-click shortcut: "Apply this mapping" repoints every
      // row to the mapping's target class.
      mappingMatch: OrphanRow['mappingMatch'];
    }>();
    for (const r of orphans) {
      const key = `${(r.format || '∅').toLowerCase()}::${(r.competitionClass || '∅').toLowerCase()}`;
      const existing = m.get(key);
      if (existing) {
        existing.rows.push(r);
        // If any row in the group has a linkedClass, surface it on
        // the group. If two rows disagree (different class_ids), we
        // keep the first one — that's vanishingly rare in practice
        // since the group key is (format, competition_class text).
        if (!existing.linkedClass && r.linkedClass) existing.linkedClass = r.linkedClass;
        if (!existing.mappingMatch && r.mappingMatch) existing.mappingMatch = r.mappingMatch;
      } else {
        m.set(key, {
          key,
          format: r.format || '',
          competitionClass: r.competitionClass || '',
          rows: [r],
          suggestedClass: r.suggestedClass,
          linkedClass: r.linkedClass,
          mappingMatch: r.mappingMatch,
        });
      }
    }
    return Array.from(m.values()).sort((a, b) => b.rows.length - a.rows.length);
  }, [orphans]);

  const handleLinkGroup = async (group: typeof groups[number]) => {
    const classId = groupTarget[group.key];
    if (!classId) {
      alert('Pick a target class first.');
      return;
    }
    const ok = window.confirm(
      `Link ${group.rows.length} result${group.rows.length === 1 ? '' : 's'} for "${group.competitionClass}" to the selected class?\n\n` +
      `This updates each row's class_id and re-syncs its format / class-name text fields.`,
    );
    if (!ok) return;
    setLinkBusy(group.key);
    try {
      const r = await competitionResultsApi.repointToClass(group.rows.map(x => x.id), classId);
      alert(`Linked ${r.updated} result(s).`);
      await fetch();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Link failed');
    } finally {
      setLinkBusy(null);
    }
  };

  /**
   * Bulk link only the rows the admin has checked in the table. Lets
   * them mix groups in a single action (e.g. select some "X (SPL)"
   * rows + some standalone rows that should all go to the same
   * target class). After success, clears the selection.
   */
  const handleLinkSelected = async () => {
    if (!bulkTargetClassId) {
      alert('Pick a target class for the selected rows.');
      return;
    }
    const ids = Array.from(selectedRowIds);
    if (ids.length === 0) return;
    const cls = classes.find(c => c.id === bulkTargetClassId);
    const label = cls ? `${cls.name} (${cls.abbreviation}, ${cls.format})` : 'the selected class';
    const ok = window.confirm(
      `Link ${ids.length} selected result${ids.length === 1 ? '' : 's'} to ${label}?\n\n` +
      `This updates each row's class_id and re-syncs its format / class-name text fields.`,
    );
    if (!ok) return;
    setBulkBusy(true);
    try {
      const r = await competitionResultsApi.repointToClass(ids, bulkTargetClassId);
      alert(`Linked ${r.updated} result(s).`);
      clearSelection();
      setBulkTargetClassId('');
      await fetch();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Link failed');
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-amber-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Results Needing Class Assignment</h1>
              <p className="text-sm text-gray-400">
                These results reference a class that no longer exists (or is inactive AND no text-fallback match). They're hidden from public results until you link each group to a class.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetch}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Dashboard
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading…</div>
        ) : orphans.length === 0 ? (
          <div className="py-16 text-center bg-slate-800 rounded-xl border border-slate-700">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-green-500/60" />
            <p className="text-gray-300">No orphan results — every result resolves to an active class.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const q = search.trim().toLowerCase();
              const filteredGroups = q
                ? groups.filter((g) => {
                    // Match against format, class text, linked class
                    // name/abbr, mapping target, and name-match
                    // suggestion — anything an admin might type in.
                    const hay = [
                      g.format,
                      g.competitionClass,
                      g.linkedClass?.name,
                      g.linkedClass?.abbreviation,
                      g.mappingMatch?.targetClass?.name,
                      g.mappingMatch?.targetClass?.abbreviation,
                      g.suggestedClass?.name,
                      g.suggestedClass?.abbreviation,
                    ]
                      .filter(Boolean)
                      .join(' ')
                      .toLowerCase();
                    return hay.includes(q);
                  })
                : groups;
              return (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-gray-400 flex-1 min-w-[14rem]">
                      <strong>{orphans.length}</strong> result{orphans.length === 1 ? '' : 's'} across <strong>{groups.length}</strong> group{groups.length === 1 ? '' : 's'}
                      {q && (
                        <> · <span className="text-orange-300">{filteredGroups.length} matching</span></>
                      )}
                    </p>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by format, class, or mapping…"
                        className="pl-9 pr-8 py-2 w-72 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-white"
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setOpenGroups(new Set(filteredGroups.map((x) => x.key)))}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-200 text-xs font-medium rounded-lg"
                    >
                      Expand all
                    </button>
                    <button
                      onClick={() => setOpenGroups(new Set())}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-200 text-xs font-medium rounded-lg"
                    >
                      Collapse all
                    </button>
                  </div>
                  {filteredGroups.length === 0 && (
                    <div className="py-12 text-center text-gray-400 text-sm">
                      No groups match "{search}".
                    </div>
                  )}
                  {filteredGroups.map((g) => {
                    const isOpen = openGroups.has(g.key);
                    return (
              <div key={g.key} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className={`p-4 ${isOpen ? 'border-b border-slate-700' : ''} flex flex-wrap items-center justify-between gap-3`}>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleGroupOpen(g.key)}
                      className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                      <div className="text-white font-semibold">
                        "{g.competitionClass || '(no class text)'}"
                        {g.format && <span className="text-gray-400 font-normal text-sm"> · format: {g.format}</span>}
                      </div>
                    </button>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {g.rows.length} result{g.rows.length === 1 ? '' : 's'} affected
                    </div>

                    {/* Diagnostic context — explains WHY this group is
                        showing up. Without this admins can't tell whether
                        the issue is "class_id points to a deleted class"
                        vs "class_id is null but there's a CSV mapping"
                        vs "neither — just unrecognised text". */}
                    <div className="mt-2 space-y-1 text-xs">
                      {g.linkedClass && (
                        <div className="flex items-start gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 font-medium whitespace-nowrap">
                            class_id →
                          </span>
                          <span className="text-gray-300">
                            <span className="text-red-300 font-medium">{g.linkedClass.name}</span>
                            <span className="text-gray-500"> ({g.linkedClass.abbreviation}, {g.linkedClass.format})</span>
                            {!g.linkedClass.isActive && <span className="text-red-400"> · INACTIVE / DELETED</span>}
                          </span>
                        </div>
                      )}
                      {!g.linkedClass && (
                        <div className="flex items-start gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-medium whitespace-nowrap">
                            class_id →
                          </span>
                          <span className="text-gray-400 italic">none (NULL)</span>
                        </div>
                      )}
                      {g.mappingMatch && (
                        <div className="flex items-start gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 font-medium whitespace-nowrap">
                            CSV mapping
                          </span>
                          <span className="text-gray-300">
                            "<span className="text-blue-200">{g.mappingMatch.sourceName}</span>" →{' '}
                            {g.mappingMatch.targetClass ? (
                              <>
                                <span className="text-blue-200 font-medium">{g.mappingMatch.targetClass.name}</span>
                                <span className="text-gray-500"> ({g.mappingMatch.targetClass.abbreviation}, {g.mappingMatch.targetClass.format})</span>
                                {!g.mappingMatch.targetClass.isActive && <span className="text-red-400"> · INACTIVE</span>}
                              </>
                            ) : (
                              <span className="text-gray-500 italic">no target class</span>
                            )}
                          </span>
                        </div>
                      )}
                      {g.suggestedClass && (
                        <div className="flex items-start gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 font-medium whitespace-nowrap">
                            name match
                          </span>
                          <span className="text-gray-300">
                            <span className="text-orange-200 font-medium">{g.suggestedClass.name}</span>
                            <span className="text-gray-500"> ({g.suggestedClass.abbreviation}, {g.suggestedClass.format})</span>
                            {!g.suggestedClass.isActive && <span className="text-red-400"> · INACTIVE</span>}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClassPicker
                      classes={classes}
                      value={groupTarget[g.key] || g.suggestedClass?.id || ''}
                      onChange={(id) => setGroupTarget((p) => ({ ...p, [g.key]: id }))}
                      placeholder="Link to class…"
                      className="w-72"
                    />
                    <button
                      onClick={() => handleLinkGroup(g)}
                      disabled={linkBusy === g.key || !(groupTarget[g.key] || g.suggestedClass?.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      <Link2 className="h-4 w-4" />
                      {linkBusy === g.key ? 'Linking…' : `Link ${g.rows.length}`}
                    </button>
                  </div>
                </div>
                {isOpen && <div className="overflow-x-auto">
                  {(() => {
                    // Group-level "select all" tri-state: checked when
                    // every row in the group is selected, indeterminate
                    // when some are, unchecked otherwise. Note that
                    // selection always operates on the FULL group, not
                    // just the visible preview slice — admins shouldn't
                    // have to expand a 778-row group just to fix it.
                    const groupIds = g.rows.map(r => r.id);
                    const allChecked = groupIds.every(id => selectedRowIds.has(id));
                    const someChecked = !allChecked && groupIds.some(id => selectedRowIds.has(id));
                    const showAll = showAllRows.has(g.key);
                    const visibleRows = showAll ? g.rows : g.rows.slice(0, ROW_PREVIEW);
                    return (
                      <table className="w-full text-sm">
                        <thead className="bg-slate-700/40">
                          <tr>
                            <th className="px-3 py-2 text-left w-10">
                              {/* Custom checkbox — native <input type="checkbox">
                                  is invisible against the dark surface without
                                  @tailwindcss/forms (not installed here), so we
                                  render an explicit button with a Check or Minus
                                  icon for guaranteed visual state. */}
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={allChecked ? 'true' : someChecked ? 'mixed' : 'false'}
                                onClick={() => setRowsSelected(groupIds, !allChecked)}
                                title={allChecked ? 'Deselect all rows in this group' : 'Select all rows in this group'}
                                className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  allChecked
                                    ? 'bg-orange-500 border-orange-500 hover:bg-orange-400'
                                    : someChecked
                                      ? 'bg-orange-500/50 border-orange-500 hover:bg-orange-500/70'
                                      : 'border-slate-400 bg-slate-700 hover:border-orange-400 hover:bg-slate-600'
                                }`}
                              >
                                {allChecked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                                {!allChecked && someChecked && <Minus className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                              </button>
                            </th>
                            <th className="px-4 py-2 text-left font-medium text-gray-300">Event</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-300">Competitor</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-300">MECA ID</th>
                            <th className="px-4 py-2 text-right font-medium text-gray-300">Score</th>
                            <th className="px-4 py-2 text-right font-medium text-gray-300">Place</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-300">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {visibleRows.map((r) => {
                            const selected = selectedRowIds.has(r.id);
                            return (
                              <tr
                                key={r.id}
                                onClick={(e) => {
                                  // Whole row toggles selection — much
                                  // faster than aiming at a 16px checkbox
                                  // when you're working through hundreds
                                  // of rows. Don't trigger when the click
                                  // started on a link/button in the row.
                                  const target = e.target as HTMLElement;
                                  if (target.closest('a, button')) return;
                                  toggleRow(r.id);
                                }}
                                className={`${selected ? 'bg-orange-500/10' : 'hover:bg-slate-700/20'} transition-colors cursor-pointer`}
                              >
                                <td className="px-3 py-2">
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={selected}
                                    onClick={(e) => { e.stopPropagation(); toggleRow(r.id); }}
                                    className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                                      selected
                                        ? 'bg-orange-500 border-orange-500 hover:bg-orange-400'
                                        : 'border-slate-400 bg-slate-700 hover:border-orange-400 hover:bg-slate-600'
                                    }`}
                                  >
                                    {selected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                                  </button>
                                </td>
                                <td className="px-4 py-2 text-gray-200">
                                  {r.eventTitle ? (
                                    <a
                                      href={`/results?eventId=${r.eventId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-1"
                                    >
                                      {r.eventTitle}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  ) : '—'}
                                </td>
                                <td className="px-4 py-2 text-gray-200">{r.competitorName || '—'}</td>
                                <td className="px-4 py-2 text-gray-300">{r.mecaId || '—'}</td>
                                <td className="px-4 py-2 text-right text-gray-200">{r.score ?? '—'}</td>
                                <td className="px-4 py-2 text-right text-gray-200">{r.placement ?? '—'}</td>
                                <td className="px-4 py-2 text-gray-400 text-xs">
                                  {new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}

                  {/* Show-all / collapse footer. Rendered outside the
                      memoised IIFE so the button doesn't disappear when
                      a group has exactly ROW_PREVIEW rows visible. */}
                  {g.rows.length > ROW_PREVIEW && (
                    <div className="px-4 py-2 border-t border-slate-700/50 bg-slate-800/50 text-center">
                      <button
                        onClick={() => toggleShowAllRows(g.key)}
                        className="text-xs text-orange-300 hover:text-orange-200 font-medium"
                      >
                        {showAllRows.has(g.key)
                          ? `Collapse — hide ${g.rows.length - ROW_PREVIEW} row${g.rows.length - ROW_PREVIEW === 1 ? '' : 's'}`
                          : `Show all ${g.rows.length} rows (${g.rows.length - ROW_PREVIEW} hidden)`}
                      </button>
                    </div>
                  )}
                </div>}
              </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        )}

        {/* Sticky bulk-link toolbar — appears whenever the admin has
            at least one row checked. Lets them mix groups (e.g. some
            "X (SPL)" rows + some standalone rows) and link the
            selection in a single action. Doesn't replace the per-
            group fast button above; it's an additional path. */}
        {selectedRowIds.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-800 border-t border-slate-600 shadow-2xl">
            <div className="mx-auto max-w-screen-2xl px-4 py-3 sm:px-6 lg:px-8 flex flex-wrap items-center gap-3">
              <div className="text-white font-semibold">
                {selectedRowIds.size} selected
              </div>
              <ClassPicker
                classes={classes}
                value={bulkTargetClassId}
                onChange={setBulkTargetClassId}
                placeholder="Link selected rows to class…"
                className="flex-1 min-w-[14rem] max-w-md"
              />
              <button
                onClick={handleLinkSelected}
                disabled={bulkBusy || !bulkTargetClassId}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Link2 className="h-4 w-4" />
                {bulkBusy ? 'Linking…' : `Link ${selectedRowIds.size}`}
              </button>
              <button
                onClick={clearSelection}
                disabled={bulkBusy}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
