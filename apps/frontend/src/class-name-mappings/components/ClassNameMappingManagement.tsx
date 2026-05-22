import { useState, useEffect, useMemo } from 'react';
import {
  Link2,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  Search,
  ArrowRight,
  Eye,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import {
  classNameMappingsApi,
  ClassNameMapping,
  UnmappedClass,
  UnmappedResult,
} from '@/class-name-mappings';
import { competitionClassesApi, CompetitionClass, ClassPicker } from '@/competition-classes';
import { competitionResultsApi } from '@/competition-results';

type OrphanRow = Awaited<ReturnType<typeof competitionResultsApi.getOrphanResults>>[number];

export default function ClassNameMappingManagement() {
  const [mappings, setMappings] = useState<ClassNameMapping[]>([]);
  const [unmappedClasses, setUnmappedClasses] = useState<UnmappedClass[]>([]);
  const [competitionClasses, setCompetitionClasses] = useState<CompetitionClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // Unmapped results modal state
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedUnmapped, setSelectedUnmapped] = useState<UnmappedClass | null>(null);
  const [unmappedResults, setUnmappedResults] = useState<UnmappedResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [remapTargetClassId, setRemapTargetClassId] = useState('');
  const [selectedResultIds, setSelectedResultIds] = useState<Set<string>>(new Set());
  const [remapping, setRemapping] = useState(false);

  const [formData, setFormData] = useState({
    sourceName: '',
    targetClassId: '',
    sourceSystem: 'termlab',
    isActive: true,
    notes: '',
  });

  // ---- Orphan results section (merged from /admin/results-needing-class) ----
  // These are results whose `class_id` points at a class that no
  // longer exists or is inactive AND can't be resolved by text
  // fallback (name/abbr+format match against active classes). Lives
  // here so admins manage every "results don't have a real class"
  // case in one place.
  const [orphans, setOrphans] = useState<OrphanRow[]>([]);
  const [orphanGroupTarget, setOrphanGroupTarget] = useState<Record<string, string>>({});
  const [orphanLinkBusy, setOrphanLinkBusy] = useState<string | null>(null);
  const [orphanOpenGroups, setOrphanOpenGroups] = useState<Set<string>>(new Set());
  const ORPHAN_ROW_PREVIEW = 10;
  const [orphanShowAll, setOrphanShowAll] = useState<Set<string>>(new Set());
  const [orphanSearch, setOrphanSearch] = useState('');
  const [orphanSelectedRowIds, setOrphanSelectedRowIds] = useState<Set<string>>(new Set());
  const [orphanBulkTarget, setOrphanBulkTarget] = useState('');
  const [orphanBulkBusy, setOrphanBulkBusy] = useState(false);
  const toggleOrphanGroupOpen = (key: string) => {
    setOrphanOpenGroups((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };
  const toggleOrphanShowAll = (key: string) => {
    setOrphanShowAll((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };
  const toggleOrphanRow = (id: string) => {
    setOrphanSelectedRowIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const setOrphanRowsSelected = (ids: string[], selected: boolean) => {
    setOrphanSelectedRowIds((p) => {
      const n = new Set(p);
      for (const id of ids) { selected ? n.add(id) : n.delete(id); }
      return n;
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mappingsData, unmappedData, classesData, orphansData] = await Promise.all([
        classNameMappingsApi.getAll(),
        classNameMappingsApi.getUnmapped(),
        competitionClassesApi.getAll(),
        // Admin endpoint — only super admin / admin can call this.
        // Non-admins land with an empty list rather than blocking the
        // whole page from loading the mappings section.
        competitionResultsApi.getOrphanResults().catch(() => [] as OrphanRow[]),
      ]);
      setMappings(mappingsData);
      setUnmappedClasses(unmappedData);
      setCompetitionClasses(classesData);
      setOrphans(orphansData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await classNameMappingsApi.update(editingId, {
          sourceName: formData.sourceName,
          targetClassId: formData.targetClassId || undefined,
          sourceSystem: formData.sourceSystem,
          isActive: formData.isActive,
          notes: formData.notes || undefined,
        });
      } else {
        await classNameMappingsApi.create({
          sourceName: formData.sourceName,
          targetClassId: formData.targetClassId || undefined,
          sourceSystem: formData.sourceSystem,
          isActive: formData.isActive,
          notes: formData.notes || undefined,
        });
      }
      resetForm();
      fetchData();
    } catch (error: any) {
      alert('Error saving mapping: ' + error.message);
    }
  };

  const handleEdit = (mapping: ClassNameMapping) => {
    setEditingId(mapping.id);
    setFormData({
      sourceName: mapping.sourceName || mapping.source_name || '',
      targetClassId: mapping.targetClassId || mapping.target_class_id || '',
      sourceSystem: mapping.sourceSystem || mapping.source_system || 'termlab',
      isActive: mapping.isActive ?? mapping.is_active ?? true,
      notes: mapping.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;
    try {
      await classNameMappingsApi.delete(id);
      fetchData();
    } catch (error: any) {
      alert('Error deleting mapping: ' + error.message);
    }
  };

  const handleQuickMap = (unmapped: UnmappedClass) => {
    setFormData({
      sourceName: unmapped.className,
      targetClassId: '',
      sourceSystem: 'termlab',
      isActive: true,
      notes: `Auto-suggested from ${unmapped.count} unmapped result(s)`,
    });
    setEditingId(null);
    setShowForm(true);
  };

  const handleViewResults = async (unmapped: UnmappedClass) => {
    setSelectedUnmapped(unmapped);
    setShowResultsModal(true);
    setLoadingResults(true);
    setRemapTargetClassId('');
    setSelectedResultIds(new Set());
    try {
      const results = await classNameMappingsApi.getUnmappedResults(
        unmapped.className,
        unmapped.format || undefined,
      );
      setUnmappedResults(results);
    } catch (error) {
      console.error('Error fetching unmapped results:', error);
      setUnmappedResults([]);
    }
    setLoadingResults(false);
  };

  const handleRemapResults = async () => {
    if (!remapTargetClassId || !selectedUnmapped) return;
    setRemapping(true);
    try {
      const result = await classNameMappingsApi.remapResults({
        className: selectedUnmapped.className,
        targetClassId: remapTargetClassId,
        format: selectedUnmapped.format || undefined,
        resultIds: selectedResultIds.size > 0 ? Array.from(selectedResultIds) : undefined,
      });
      alert(`Successfully remapped ${result.updated} result(s)`);
      setShowResultsModal(false);
      fetchData();
    } catch (error: any) {
      alert('Error remapping results: ' + error.message);
    }
    setRemapping(false);
  };

  const toggleResultSelection = (id: string) => {
    setSelectedResultIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedResultIds.size === unmappedResults.length) {
      setSelectedResultIds(new Set());
    } else {
      setSelectedResultIds(new Set(unmappedResults.map(r => r.id)));
    }
  };

  const resetForm = () => {
    setFormData({
      sourceName: '',
      targetClassId: '',
      sourceSystem: 'termlab',
      isActive: true,
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Group orphans by (format, competition_class text). Each group
  // carries forward the linkedClass / mappingMatch / suggestedClass
  // diagnostic info from whichever row had it first — they're keyed
  // off the same (format, text) tuple so rows in the same group
  // almost always agree on these.
  const orphanGroups = useMemo(() => {
    const m = new Map<string, {
      key: string;
      format: string;
      competitionClass: string;
      rows: OrphanRow[];
      suggestedClass: OrphanRow['suggestedClass'];
      linkedClass: OrphanRow['linkedClass'];
      mappingMatch: OrphanRow['mappingMatch'];
    }>();
    for (const r of orphans) {
      const key = `${(r.format || '∅').toLowerCase()}::${(r.competitionClass || '∅').toLowerCase()}`;
      const e = m.get(key);
      if (e) {
        e.rows.push(r);
        if (!e.linkedClass && r.linkedClass) e.linkedClass = r.linkedClass;
        if (!e.mappingMatch && r.mappingMatch) e.mappingMatch = r.mappingMatch;
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

  const handleLinkOrphanGroup = async (group: typeof orphanGroups[number]) => {
    const classId = orphanGroupTarget[group.key];
    if (!classId) {
      alert('Pick a target class first.');
      return;
    }
    const ok = window.confirm(
      `Link ${group.rows.length} result${group.rows.length === 1 ? '' : 's'} for "${group.competitionClass}" to the selected class?`,
    );
    if (!ok) return;
    setOrphanLinkBusy(group.key);
    try {
      const r = await competitionResultsApi.repointToClass(group.rows.map((x) => x.id), classId);
      alert(`Linked ${r.updated} result(s).`);
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Link failed');
    } finally {
      setOrphanLinkBusy(null);
    }
  };

  const handleLinkOrphanSelected = async () => {
    if (!orphanBulkTarget) { alert('Pick a target class for the selected rows.'); return; }
    const ids = Array.from(orphanSelectedRowIds);
    if (ids.length === 0) return;
    const cls = competitionClasses.find((c) => c.id === orphanBulkTarget);
    const label = cls ? `${cls.name} (${cls.abbreviation}, ${cls.format})` : 'the selected class';
    const ok = window.confirm(`Link ${ids.length} selected result${ids.length === 1 ? '' : 's'} to ${label}?`);
    if (!ok) return;
    setOrphanBulkBusy(true);
    try {
      const r = await competitionResultsApi.repointToClass(ids, orphanBulkTarget);
      alert(`Linked ${r.updated} result(s).`);
      setOrphanSelectedRowIds(new Set());
      setOrphanBulkTarget('');
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Link failed');
    } finally {
      setOrphanBulkBusy(false);
    }
  };

  const getTargetClassName = (mapping: ClassNameMapping): string => {
    if (mapping.targetClass) {
      return `${mapping.targetClass.name} (${mapping.targetClass.format})`;
    }
    const classId = mapping.targetClassId || mapping.target_class_id;
    if (classId) {
      const cls = competitionClasses.find(c => c.id === classId);
      return cls ? `${cls.name} (${cls.format})` : 'Unknown Class';
    }
    return 'Not Mapped';
  };

  // Filter and search mappings
  const filteredMappings = mappings.filter(m => {
    const sourceName = m.sourceName || m.source_name || '';
    const matchesSearch = sourceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getTargetClassName(m).toLowerCase().includes(searchTerm.toLowerCase());

    const isActive = m.isActive ?? m.is_active ?? true;
    const matchesFilter = filterActive === 'all' ||
      (filterActive === 'active' && isActive) ||
      (filterActive === 'inactive' && !isActive);

    return matchesSearch && matchesFilter;
  });

  // Deduplicate classes by name+format (same class exists per season), then group by format
  const classesByFormat = (() => {
    const seen = new Set<string>();
    const unique: CompetitionClass[] = [];
    for (const cls of competitionClasses) {
      const key = `${cls.name}|${cls.format}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(cls);
      }
    }
    return unique.reduce((acc, cls) => {
      const format = cls.format || 'Other';
      if (!acc[format]) acc[format] = [];
      acc[format].push(cls);
      return acc;
    }, {} as Record<string, CompetitionClass[]>);
  })();

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Link2 className="h-6 w-6 text-orange-500" />
            Class Name Mappings
          </h2>
          <p className="text-gray-400 mt-1">
            Map external class names (from TermLab imports) to official MECA classes
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="/docs/Admin-Class-Mappings-Guide.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            title="Open the Class Mappings help guide in a new tab"
          >
            <HelpCircle className="h-4 w-4" />
            Help
          </a>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Mapping
          </button>
        </div>
      </div>

      {/* Unmapped Classes Alert */}
      {unmappedClasses.length > 0 && (
        <div className="bg-yellow-600/20 border border-yellow-500/50 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                Unmapped Classes Found ({unmappedClasses.length})
              </h3>
              <p className="text-yellow-300/80 text-sm mb-4">
                These class names from imported results don't have a mapping to official MECA classes.
                Results with unmapped classes will appear under "Unknown Results".
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unmappedClasses.slice(0, 9).map((unmapped, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleViewResults(unmapped)}
                        className="text-white font-medium hover:text-orange-400 transition-colors text-left underline decoration-dotted underline-offset-2"
                        title="View unmapped results"
                      >
                        {unmapped.className}
                      </button>
                      <p className="text-xs text-gray-400">
                        <button
                          onClick={() => handleViewResults(unmapped)}
                          className="hover:text-orange-400 transition-colors"
                        >
                          {unmapped.count} result(s)
                        </button>
                        {' • '}{unmapped.format || 'No format'}
                      </p>
                    </div>
                    <div className="flex gap-1.5 ml-2">
                      <button
                        onClick={() => handleViewResults(unmapped)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                        title="View results"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleQuickMap(unmapped)}
                        className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white"
                        title="Create mapping"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {unmappedClasses.length > 9 && (
                <p className="text-yellow-300/60 text-sm mt-3">
                  And {unmappedClasses.length - 9} more unmapped classes...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Orphan Results Alert — class_id points at deleted/inactive
          class. Different from "Unmapped Classes Found" above: those
          have NO class_id; these have one that no longer resolves.
          Both cases are hidden from public results until fixed. */}
      {orphanGroups.length > 0 && (
        <div className="bg-red-600/10 border border-red-500/40 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-300 mb-1">
                Results With Broken Class Link ({orphans.length} across {orphanGroups.length} group{orphanGroups.length === 1 ? '' : 's'})
              </h3>
              <p className="text-red-200/80 text-sm">
                These results have a <code className="text-red-100 bg-red-900/40 px-1 rounded">class_id</code> that points to a class which has been deleted or set inactive AND no active class shares its name/format. They're hidden from public results, leaderboards, and standings until you link them to a live class.
              </p>
            </div>
          </div>

          {(() => {
            const q = orphanSearch.trim().toLowerCase();
            const filtered = q
              ? orphanGroups.filter((g) => {
                  const hay = [
                    g.format,
                    g.competitionClass,
                    g.linkedClass?.name,
                    g.linkedClass?.abbreviation,
                    g.mappingMatch?.targetClass?.name,
                    g.mappingMatch?.targetClass?.abbreviation,
                    g.suggestedClass?.name,
                    g.suggestedClass?.abbreviation,
                  ].filter(Boolean).join(' ').toLowerCase();
                  return hay.includes(q);
                })
              : orphanGroups;
            return (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <div className="relative flex-1 min-w-[14rem]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={orphanSearch}
                      onChange={(e) => setOrphanSearch(e.target.value)}
                      placeholder="Search by format, class, or mapping…"
                      className="w-full pl-9 pr-8 py-2 bg-slate-800/80 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {orphanSearch && (
                      <button type="button" onClick={() => setOrphanSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-white">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <button onClick={() => setOrphanOpenGroups(new Set(filtered.map((x) => x.key)))} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-200 text-xs font-medium rounded-lg">Expand all</button>
                  <button onClick={() => setOrphanOpenGroups(new Set())} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-200 text-xs font-medium rounded-lg">Collapse all</button>
                </div>

                {filtered.length === 0 && (
                  <div className="py-6 text-center text-gray-400 text-sm">No groups match "{orphanSearch}".</div>
                )}

                <div className="space-y-3">
                  {filtered.map((g) => {
                    const isOpen = orphanOpenGroups.has(g.key);
                    const groupIds = g.rows.map((r) => r.id);
                    const allChecked = groupIds.every((id) => orphanSelectedRowIds.has(id));
                    const someChecked = !allChecked && groupIds.some((id) => orphanSelectedRowIds.has(id));
                    const showAll = orphanShowAll.has(g.key);
                    const visibleRows = showAll ? g.rows : g.rows.slice(0, ORPHAN_ROW_PREVIEW);
                    return (
                      <div key={g.key} className="bg-slate-800/80 rounded-lg border border-slate-700 overflow-hidden">
                        <div className={`p-3 ${isOpen ? 'border-b border-slate-700' : ''} flex flex-wrap items-center justify-between gap-3`}>
                          <div className="min-w-0 flex-1">
                            <button type="button" onClick={() => toggleOrphanGroupOpen(g.key)} className="flex items-center gap-2 text-left hover:opacity-80">
                              {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                              <div className="text-white font-semibold">
                                "{g.competitionClass || '(no class text)'}"
                                {g.format && <span className="text-gray-400 font-normal text-sm"> · format: {g.format}</span>}
                              </div>
                            </button>
                            <div className="text-xs text-gray-400 mt-0.5 ml-6">
                              {g.rows.length} result{g.rows.length === 1 ? '' : 's'} affected
                            </div>
                            <div className="mt-1.5 space-y-1 text-xs ml-6">
                              {g.linkedClass ? (
                                <div className="flex items-start gap-2">
                                  <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 font-medium whitespace-nowrap">class_id →</span>
                                  <span className="text-gray-300">
                                    <span className="text-red-300 font-medium">{g.linkedClass.name}</span>
                                    <span className="text-gray-500"> ({g.linkedClass.abbreviation}, {g.linkedClass.format})</span>
                                    {!g.linkedClass.isActive && <span className="text-red-400"> · INACTIVE / DELETED</span>}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-medium whitespace-nowrap">class_id →</span>
                                  <span className="text-gray-400 italic">none (NULL)</span>
                                </div>
                              )}
                              {g.mappingMatch && (
                                <div className="flex items-start gap-2">
                                  <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 font-medium whitespace-nowrap">CSV mapping</span>
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
                                  <span className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 font-medium whitespace-nowrap">name match</span>
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
                              classes={competitionClasses}
                              value={orphanGroupTarget[g.key] || g.suggestedClass?.id || ''}
                              onChange={(id) => setOrphanGroupTarget((p) => ({ ...p, [g.key]: id }))}
                              placeholder="Link to class…"
                              className="w-64"
                            />
                            <button
                              onClick={() => handleLinkOrphanGroup(g)}
                              disabled={orphanLinkBusy === g.key || !(orphanGroupTarget[g.key] || g.suggestedClass?.id)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg"
                            >
                              <Link2 className="h-4 w-4" />
                              {orphanLinkBusy === g.key ? 'Linking…' : `Link ${g.rows.length}`}
                            </button>
                          </div>
                        </div>

                        {isOpen && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-700/40">
                                <tr>
                                  <th className="px-3 py-2 text-left w-10">
                                    <button
                                      type="button"
                                      role="checkbox"
                                      aria-checked={allChecked ? 'true' : someChecked ? 'mixed' : 'false'}
                                      onClick={() => setOrphanRowsSelected(groupIds, !allChecked)}
                                      className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                                        allChecked
                                          ? 'bg-orange-500 border-orange-500'
                                          : someChecked
                                            ? 'bg-orange-500/50 border-orange-500'
                                            : 'border-slate-400 bg-slate-700'
                                      }`}
                                    >
                                      {allChecked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                                      {!allChecked && someChecked && <span className="h-0.5 w-3 bg-white" />}
                                    </button>
                                  </th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-300">Event</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-300">Competitor</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-300">MECA ID</th>
                                  <th className="px-3 py-2 text-right font-medium text-gray-300">Score</th>
                                  <th className="px-3 py-2 text-right font-medium text-gray-300">Place</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-700/50">
                                {visibleRows.map((r) => {
                                  const selected = orphanSelectedRowIds.has(r.id);
                                  return (
                                    <tr
                                      key={r.id}
                                      onClick={(e) => {
                                        const t = e.target as HTMLElement;
                                        if (t.closest('a, button')) return;
                                        toggleOrphanRow(r.id);
                                      }}
                                      className={`${selected ? 'bg-orange-500/10' : 'hover:bg-slate-700/20'} cursor-pointer`}
                                    >
                                      <td className="px-3 py-1.5">
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); toggleOrphanRow(r.id); }}
                                          className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                                            selected ? 'bg-orange-500 border-orange-500' : 'border-slate-400 bg-slate-700'
                                          }`}
                                        >
                                          {selected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                                        </button>
                                      </td>
                                      <td className="px-3 py-1.5 text-gray-200">
                                        {r.eventTitle ? (
                                          <a href={`/results?eventId=${r.eventId}`} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-1">
                                            {r.eventTitle}
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        ) : '—'}
                                      </td>
                                      <td className="px-3 py-1.5 text-gray-200">{r.competitorName || '—'}</td>
                                      <td className="px-3 py-1.5 text-gray-300">{r.mecaId || '—'}</td>
                                      <td className="px-3 py-1.5 text-right text-gray-200">{r.score ?? '—'}</td>
                                      <td className="px-3 py-1.5 text-right text-gray-200">{r.placement ?? '—'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {g.rows.length > ORPHAN_ROW_PREVIEW && (
                              <div className="px-3 py-1.5 border-t border-slate-700/50 bg-slate-800/40 text-center">
                                <button onClick={() => toggleOrphanShowAll(g.key)} className="text-xs text-orange-300 hover:text-orange-200 font-medium">
                                  {showAll
                                    ? `Collapse — hide ${g.rows.length - ORPHAN_ROW_PREVIEW} row${g.rows.length - ORPHAN_ROW_PREVIEW === 1 ? '' : 's'}`
                                    : `Show all ${g.rows.length} rows (${g.rows.length - ORPHAN_ROW_PREVIEW} hidden)`}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Sticky bulk-link toolbar for orphan rows. Appears whenever
          at least one row across any orphan group is checked. */}
      {orphanSelectedRowIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-800 border-t border-slate-600 shadow-2xl">
          <div className="mx-auto max-w-screen-2xl px-4 py-3 sm:px-6 lg:px-8 flex flex-wrap items-center gap-3">
            <div className="text-white font-semibold">{orphanSelectedRowIds.size} selected</div>
            <ClassPicker
              classes={competitionClasses}
              value={orphanBulkTarget}
              onChange={setOrphanBulkTarget}
              placeholder="Link selected rows to class…"
              className="flex-1 min-w-[14rem] max-w-md"
            />
            <button
              onClick={handleLinkOrphanSelected}
              disabled={orphanBulkBusy || !orphanBulkTarget}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
            >
              <Link2 className="h-4 w-4" />
              {orphanBulkBusy ? 'Linking…' : `Link ${orphanSelectedRowIds.size}`}
            </button>
            <button
              onClick={() => setOrphanSelectedRowIds(new Set())}
              disabled={orphanBulkBusy}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-gray-300 text-sm font-medium rounded-lg"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">
            {editingId ? 'Edit Mapping' : 'Add New Mapping'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Source Name (from import file) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.sourceName}
                  onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Radical X Street/Trunk 1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Class (official MECA class)
                </label>
                <select
                  value={formData.targetClassId}
                  onChange={(e) => setFormData({ ...formData, targetClassId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">-- Select Target Class --</option>
                  {Object.entries(classesByFormat).map(([format, classes]) => (
                    <optgroup key={format} label={format}>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Source System
                </label>
                <select
                  value={formData.sourceSystem}
                  onChange={(e) => setFormData({ ...formData, sourceSystem: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="termlab">TermLab</option>
                  <option value="excel">Excel Import</option>
                  <option value="manual">Manual Entry</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <div className="flex items-center gap-4 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={() => setFormData({ ...formData, isActive: true })}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-gray-300">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="isActive"
                      checked={!formData.isActive}
                      onChange={() => setFormData({ ...formData, isActive: false })}
                      className="text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-gray-300">Inactive</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={2}
                placeholder="Optional notes about this mapping..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
              >
                {editingId ? 'Update Mapping' : 'Create Mapping'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Unmapped Results Modal */}
      {showResultsModal && selectedUnmapped && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-5xl w-full max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Unmapped Results: {selectedUnmapped.className}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedUnmapped.count} result(s) • {selectedUnmapped.format || 'No format'}
                </p>
              </div>
              <button
                onClick={() => setShowResultsModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Remap Controls */}
            <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/80">
              <div className="flex items-end gap-4 flex-wrap">
                <div className="flex-1 min-w-[250px]">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Remap {selectedResultIds.size > 0 ? `${selectedResultIds.size} selected` : 'all'} result(s) to:
                  </label>
                  <select
                    value={remapTargetClassId}
                    onChange={(e) => setRemapTargetClassId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Select Target Class --</option>
                    {Object.entries(classesByFormat).map(([format, classes]) => (
                      <optgroup key={format} label={format}>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleRemapResults}
                  disabled={!remapTargetClassId || remapping}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {remapping ? 'Remapping...' : 'Remap Results'}
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div className="flex-1 overflow-auto p-6">
              {loadingResults ? (
                <div className="text-center py-12">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
                </div>
              ) : unmappedResults.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No results found for this class name</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-3">
                        <input
                          type="checkbox"
                          checked={selectedResultIds.size === unmappedResults.length && unmappedResults.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-500"
                        />
                      </th>
                      <th className="text-left py-3 px-3 text-gray-300 font-semibold text-sm">Competitor</th>
                      <th className="text-left py-3 px-3 text-gray-300 font-semibold text-sm">MECA ID</th>
                      <th className="text-left py-3 px-3 text-gray-300 font-semibold text-sm">Event</th>
                      <th className="text-left py-3 px-3 text-gray-300 font-semibold text-sm">Score</th>
                      <th className="text-left py-3 px-3 text-gray-300 font-semibold text-sm">Place</th>
                      <th className="text-left py-3 px-3 text-gray-300 font-semibold text-sm">Points</th>
                      <th className="text-left py-3 px-3 text-gray-300 font-semibold text-sm">Vehicle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unmappedResults.map((result) => (
                      <tr
                        key={result.id}
                        className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${
                          selectedResultIds.has(result.id) ? 'bg-orange-600/10' : ''
                        }`}
                      >
                        <td className="py-2 px-3">
                          <input
                            type="checkbox"
                            checked={selectedResultIds.has(result.id)}
                            onChange={() => toggleResultSelection(result.id)}
                            className="rounded border-slate-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-white text-sm">{result.competitorName}</td>
                        <td className="py-2 px-3 text-gray-400 text-sm">{result.mecaId || '-'}</td>
                        <td className="py-2 px-3 text-gray-300 text-sm">
                          <div>{result.eventName || 'Unknown Event'}</div>
                          {result.eventDate && (
                            <div className="text-xs text-gray-500">
                              {new Date(result.eventDate).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-white text-sm">{result.score}</td>
                        <td className="py-2 px-3 text-sm">
                          <span className={`${
                            result.placement === 1 ? 'text-yellow-400 font-bold' :
                            result.placement === 2 ? 'text-gray-300 font-semibold' :
                            result.placement === 3 ? 'text-orange-400 font-semibold' :
                            'text-gray-400'
                          }`}>
                            #{result.placement}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-green-400 text-sm">{result.pointsEarned}</td>
                        <td className="py-2 px-3 text-gray-400 text-sm truncate max-w-[150px]" title={result.vehicleInfo || ''}>
                          {result.vehicleInfo || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mappings List */}
      <div className="bg-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">
            Existing Mappings ({filteredMappings.length})
          </h3>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search mappings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {filteredMappings.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Link2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No mappings found</p>
            {mappings.length === 0 && (
              <p className="text-sm mt-2">Create your first mapping to get started</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Source Name</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Target Class</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">System</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMappings.map((mapping) => {
                  const isActive = mapping.isActive ?? mapping.is_active ?? true;
                  const sourceName = mapping.sourceName || mapping.source_name || '';
                  const sourceSystem = mapping.sourceSystem || mapping.source_system || 'termlab';

                  return (
                    <tr key={mapping.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{sourceName}</div>
                        {mapping.notes && (
                          <div className="text-xs text-gray-500 mt-1">{mapping.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-orange-500" />
                          <span className={mapping.targetClassId || mapping.target_class_id ? 'text-green-400' : 'text-gray-500'}>
                            {getTargetClassName(mapping)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-slate-600 text-gray-300 rounded text-xs uppercase">
                          {sourceSystem}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isActive ? (
                          <span className="flex items-center gap-1 text-green-400">
                            <Check className="h-4 w-4" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-500">
                            <X className="h-4 w-4" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(mapping)}
                            className="p-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(mapping.id)}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
