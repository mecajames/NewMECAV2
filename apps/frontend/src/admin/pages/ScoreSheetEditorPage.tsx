import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, Loader2, Upload, Plus, Trash2 } from 'lucide-react';
import axios from '@/lib/axios';

interface FieldCoord {
  x: number;
  y: number;
  fontSize?: number;
}

interface TemplateCoords {
  eventName: FieldCoord;
  date: FieldCoord;
  mecaId: FieldCoord;
  name: FieldCoord;
  team: FieldCoord;
  address: FieldCoord;
  email: FieldCoord;
  city: FieldCoord;
  state: FieldCoord;
  phone: FieldCoord;
}

interface TemplateConfig {
  key: string;
  name: string;
  coords: TemplateCoords;
}

const FIELD_LABELS: Record<keyof TemplateCoords, { label: string; sample: string; color: string; defaultSize: number }> = {
  eventName: { label: 'Event Name', sample: 'Event Name', color: '#ef4444', defaultSize: 14 },
  date: { label: 'Date', sample: 'Date', color: '#f97316', defaultSize: 14 },
  mecaId: { label: 'MECA ID', sample: 'MECA ID', color: '#8b5cf6', defaultSize: 24 },
  name: { label: 'Competitor Name', sample: 'Competitor Name', color: '#22c55e', defaultSize: 14 },
  team: { label: 'Team Name', sample: 'Team Name', color: '#06b6d4', defaultSize: 14 },
  address: { label: 'Address', sample: 'Address', color: '#3b82f6', defaultSize: 14 },
  email: { label: 'Email', sample: 'Email Address', color: '#ec4899', defaultSize: 14 },
  city: { label: 'City', sample: 'City', color: '#14b8a6', defaultSize: 14 },
  state: { label: 'State', sample: 'State', color: '#a855f7', defaultSize: 14 },
  phone: { label: 'Phone', sample: 'Phone Number', color: '#f59e0b', defaultSize: 14 },
};

const PNG_W = 1545;
const PNG_H = 2000;

export default function ScoreSheetEditorPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [templates, setTemplates] = useState<TemplateConfig[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('spl');
  const [coords, setCoords] = useState<TemplateCoords | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState<keyof TemplateCoords | null>(null);
  const [displayScale, setDisplayScale] = useState(1);
  const [newTemplateKey, setNewTemplateKey] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'mappings'>('editor');
  const [mappings, setMappings] = useState<any>(null);
  const [savingMappings, setSavingMappings] = useState(false);

  useEffect(() => { loadTemplates(); loadMappings(); }, []);

  useEffect(() => {
    if (selectedKey) loadTemplateImage(selectedKey);
  }, [selectedKey]);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        setDisplayScale(containerRef.current.clientWidth / PNG_W);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [imageUrl]);

  const loadTemplates = async () => {
    try {
      const res = await axios.get('/api/event-registrations/admin/score-sheet-templates');
      setTemplates(res.data);
      if (res.data.length > 0) {
        const first = res.data[0];
        setSelectedKey(first.key);
        setCoords(first.coords);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateImage = async (key: string) => {
    try {
      const res = await axios.get(`/api/event-registrations/admin/score-sheet-image/${key}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'image/png' }));
      setImageUrl(url);
      const tmpl = templates.find(t => t.key === key);
      if (tmpl) setCoords(tmpl.coords);
    } catch (err) {
      console.error('Failed to load template image:', err);
    }
  };

  const selectTemplate = (key: string) => {
    setSelectedKey(key);
    const tmpl = templates.find(t => t.key === key);
    if (tmpl) setCoords(tmpl.coords);
  };

  const handleSave = async () => {
    if (!coords) return;
    setSaving(true);
    try {
      await axios.put(`/api/event-registrations/admin/score-sheet-coords/${selectedKey}`, coords);
      setTemplates(prev => prev.map(t => t.key === selectedKey ? { ...t, coords } : t));
      alert('Coordinates saved!');
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save coordinates');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const tmpl = templates.find(t => t.key === selectedKey);
    if (tmpl) setCoords({ ...tmpl.coords });
  };

  const handleUpload = async (file: File) => {
    if (!newTemplateKey.trim()) {
      alert('Please enter a template key (e.g. "spl", "install")');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('key', newTemplateKey.trim().toLowerCase().replace(/\s+/g, '-'));
      formData.append('name', newTemplateName.trim() || newTemplateKey.trim());
      await axios.post('/api/event-registrations/admin/score-sheet-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowUploadModal(false);
      setNewTemplateKey('');
      setNewTemplateName('');
      await loadTemplates();
      setSelectedKey(newTemplateKey.trim().toLowerCase().replace(/\s+/g, '-'));
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload template image');
    } finally {
      setUploading(false);
    }
  };

  const loadMappings = async () => {
    try {
      const res = await axios.get('/api/event-registrations/admin/score-sheet-mappings');
      setMappings(res.data);
    } catch (err) {
      console.error('Failed to load mappings:', err);
    }
  };

  const handleSaveMappings = async () => {
    if (!mappings) return;
    setSavingMappings(true);
    try {
      await axios.put('/api/event-registrations/admin/score-sheet-mappings', mappings);
      alert('Mappings saved!');
    } catch (err) {
      console.error('Failed to save mappings:', err);
      alert('Failed to save mappings');
    } finally {
      setSavingMappings(false);
    }
  };

  const addRule = (section: 'classNameRules' | 'formatRules' | 'mecaKidsRules', isWorldFinals = false) => {
    if (!mappings) return;
    const newRule = { pattern: '', template: 'spl', priority: 99 };
    if (isWorldFinals) {
      setMappings({ ...mappings, worldFinals: { ...mappings.worldFinals, [section]: [...(mappings.worldFinals[section] || []), newRule] } });
    } else {
      setMappings({ ...mappings, [section]: [...(mappings[section] || []), newRule] });
    }
  };

  const updateRule = (section: string, index: number, field: string, value: string, isWorldFinals = false) => {
    if (!mappings) return;
    const rules = isWorldFinals ? [...(mappings.worldFinals[section] || [])] : [...(mappings[section] || [])];
    rules[index] = { ...rules[index], [field]: value };
    if (isWorldFinals) {
      setMappings({ ...mappings, worldFinals: { ...mappings.worldFinals, [section]: rules } });
    } else {
      setMappings({ ...mappings, [section]: rules });
    }
  };

  const removeRule = (section: string, index: number, isWorldFinals = false) => {
    if (!mappings) return;
    const rules = isWorldFinals ? [...(mappings.worldFinals[section] || [])] : [...(mappings[section] || [])];
    rules.splice(index, 1);
    if (isWorldFinals) {
      setMappings({ ...mappings, worldFinals: { ...mappings.worldFinals, [section]: rules } });
    } else {
      setMappings({ ...mappings, [section]: rules });
    }
  };

  const handleMouseDown = useCallback((field: keyof TemplateCoords) => {
    setDragging(field);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !coords || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(PNG_W, Math.round((e.clientX - rect.left) / displayScale)));
    const y = Math.max(0, Math.min(PNG_H, Math.round((e.clientY - rect.top) / displayScale)));
    setCoords(prev => prev ? { ...prev, [dragging]: { ...prev[dragging], x, y } } : prev);
  }, [dragging, coords, displayScale]);

  const handleMouseUp = useCallback(() => { setDragging(null); }, []);

  const updateCoord = (field: keyof TemplateCoords, prop: 'x' | 'y' | 'fontSize', value: number) => {
    if (!coords) return;
    setCoords({ ...coords, [field]: { ...coords[field], [prop]: value } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8">
      <div className="max-w-[1400px] mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Score Sheet Template Editor</h1>
            <p className="text-gray-400 text-sm">Drag markers to position fields, adjust font sizes, then save</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload Template
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'editor' ? 'bg-slate-800 text-orange-400 border-b-2 border-orange-500' : 'text-gray-400 hover:text-white'
            }`}
          >
            Template Editor
          </button>
          <button
            onClick={() => setActiveTab('mappings')}
            className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'mappings' ? 'bg-slate-800 text-orange-400 border-b-2 border-orange-500' : 'text-gray-400 hover:text-white'
            }`}
          >
            Format Mappings
          </button>
        </div>

        {activeTab === 'mappings' && mappings && (
          <div className="space-y-6">
            {/* Regular Season Mappings */}
            <MappingSection
              title="Class Name Rules (checked first - matches if class name contains pattern)"
              rules={mappings.classNameRules || []}
              templates={templates}
              section="classNameRules"
              onAdd={() => addRule('classNameRules')}
              onUpdate={(i, f, v) => updateRule('classNameRules', i, f, v)}
              onRemove={(i) => removeRule('classNameRules', i)}
            />
            <MappingSection
              title="Format Rules (checked second - exact format match)"
              rules={mappings.formatRules || []}
              templates={templates}
              section="formatRules"
              onAdd={() => addRule('formatRules')}
              onUpdate={(i, f, v) => updateRule('formatRules', i, f, v)}
              onRemove={(i) => removeRule('formatRules', i)}
            />
            <MappingSection
              title="MECA Kids Rules (sub-matching when class contains 'MECA Kids')"
              rules={mappings.mecaKidsRules || []}
              templates={templates}
              section="mecaKidsRules"
              onAdd={() => addRule('mecaKidsRules')}
              onUpdate={(i, f, v) => updateRule('mecaKidsRules', i, f, v)}
              onRemove={(i) => removeRule('mecaKidsRules', i)}
            />

            {/* Default Template */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">Default Template (when no rules match)</h3>
              <select
                value={mappings.defaultTemplate || 'spl'}
                onChange={e => setMappings({ ...mappings, defaultTemplate: e.target.value })}
                className="px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg"
              >
                {templates.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
              </select>
            </div>

            {/* World Finals */}
            <div className="border-t-2 border-orange-500 pt-6">
              <h2 className="text-xl font-bold text-orange-400 mb-4">World Finals Overrides</h2>
              <p className="text-gray-400 text-sm mb-4">These rules apply only to events with type "World Finals". Leave empty to use regular season rules.</p>
              <MappingSection
                title="World Finals - Class Name Rules"
                rules={mappings.worldFinals?.classNameRules || []}
                templates={templates}
                section="classNameRules"
                onAdd={() => addRule('classNameRules', true)}
                onUpdate={(i, f, v) => updateRule('classNameRules', i, f, v, true)}
                onRemove={(i) => removeRule('classNameRules', i, true)}
              />
              <div className="mt-4">
                <MappingSection
                  title="World Finals - Format Rules"
                  rules={mappings.worldFinals?.formatRules || []}
                  templates={templates}
                  section="formatRules"
                  onAdd={() => addRule('formatRules', true)}
                  onUpdate={(i, f, v) => updateRule('formatRules', i, f, v, true)}
                  onRemove={(i) => removeRule('formatRules', i, true)}
                />
              </div>
              <div className="mt-4 bg-slate-800 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">World Finals Default Template</h3>
                <select
                  value={mappings.worldFinals?.defaultTemplate || 'spl'}
                  onChange={e => setMappings({ ...mappings, worldFinals: { ...mappings.worldFinals, defaultTemplate: e.target.value } })}
                  className="px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg"
                >
                  {templates.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
                </select>
              </div>
            </div>

            {/* Save Mappings */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveMappings}
                disabled={savingMappings}
                className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {savingMappings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Mappings
              </button>
            </div>
          </div>
        )}

        {activeTab === 'editor' && <>
        {/* Template Selector */}
        <div className="mb-4 flex gap-2 flex-wrap">
          {templates.map(t => (
            <button
              key={t.key}
              onClick={() => selectTemplate(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedKey === t.key
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          {/* Template Image with Markers */}
          <div className="bg-white rounded-lg overflow-hidden shadow-lg">
            <div
              ref={containerRef}
              className="relative select-none"
              style={{ cursor: dragging ? 'grabbing' : 'default' }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {imageUrl && (
                <img src={imageUrl} alt={`${selectedKey} template`} className="w-full h-auto" draggable={false} />
              )}

              {coords && Object.entries(FIELD_LABELS).map(([field, config]) => {
                const coord = coords[field as keyof TemplateCoords];
                if (!coord) return null;
                const left = coord.x * displayScale;
                const top = coord.y * displayScale;
                const fontSize = coord.fontSize || config.defaultSize;

                return (
                  <div
                    key={field}
                    className="absolute flex items-center gap-1 pointer-events-auto"
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      transform: 'translateY(-50%)',
                      cursor: dragging === field ? 'grabbing' : 'grab',
                      zIndex: dragging === field ? 50 : 10,
                    }}
                    onMouseDown={(e) => { e.preventDefault(); handleMouseDown(field as keyof TemplateCoords); }}
                  >
                    <div
                      className="w-3 h-3 rounded-full border-2 border-white shadow-md flex-shrink-0"
                      style={{ backgroundColor: config.color }}
                    />
                    <span
                      className="font-bold whitespace-nowrap"
                      style={{
                        color: config.color,
                        fontSize: `${Math.max(6, fontSize * 2.53 * displayScale)}px`,
                        lineHeight: 1,
                      }}
                    >
                      {config.sample}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls Panel */}
          <div className="bg-slate-800 rounded-lg p-4 h-fit sticky top-4">
            <h3 className="text-white font-semibold mb-4">Field Positions & Font Sizes</h3>
            <div className="space-y-2">
              {coords && Object.entries(FIELD_LABELS).map(([field, config]) => {
                const coord = coords[field as keyof TemplateCoords];
                return (
                  <div key={field} className="bg-slate-700/50 rounded p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
                      <span className="text-gray-200 text-xs font-medium">{config.label}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-5">
                      <div className="flex items-center gap-1">
                        <label className="text-gray-500 text-xs">X</label>
                        <input
                          type="number"
                          value={coord.x}
                          onChange={e => updateCoord(field as keyof TemplateCoords, 'x', parseInt(e.target.value) || 0)}
                          className="w-14 px-1 py-0.5 text-xs bg-slate-700 text-white border border-slate-600 rounded"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="text-gray-500 text-xs">Y</label>
                        <input
                          type="number"
                          value={coord.y}
                          onChange={e => updateCoord(field as keyof TemplateCoords, 'y', parseInt(e.target.value) || 0)}
                          className="w-14 px-1 py-0.5 text-xs bg-slate-700 text-white border border-slate-600 rounded"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="text-gray-500 text-xs">Size</label>
                        <input
                          type="number"
                          value={coord.fontSize || config.defaultSize}
                          onChange={e => updateCoord(field as keyof TemplateCoords, 'fontSize', parseInt(e.target.value) || 12)}
                          className="w-12 px-1 py-0.5 text-xs bg-slate-700 text-white border border-slate-600 rounded"
                          min={6}
                          max={48}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 bg-slate-700 rounded-lg">
              <p className="text-gray-400 text-xs">
                <strong className="text-gray-300">How to use:</strong> Drag colored markers on the template to position each field.
                Adjust X, Y (PNG pixels: {PNG_W}x{PNG_H}) and font Size (pt) in the panel. Click Save when done.
                Actual competitor data is populated dynamically from registrations.
              </p>
            </div>
          </div>
        </div>
        </>}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Upload New Template</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Template Key (lowercase, no spaces)</label>
                <input
                  type="text"
                  value={newTemplateKey}
                  onChange={e => setNewTemplateKey(e.target.value)}
                  placeholder="e.g. spl-v2, new-install"
                  className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  placeholder="e.g. SPL V2, New Install Sheet"
                  className="w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Template Image (PNG)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png"
                  className="w-full text-gray-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-600 file:text-white file:cursor-pointer"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const file = fileInputRef.current?.files?.[0];
                  if (file) handleUpload(file);
                  else alert('Please select a PNG file');
                }}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold rounded-lg"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable component for mapping rule sections
function MappingSection({
  title, rules, templates, section, onAdd, onUpdate, onRemove,
}: {
  title: string;
  rules: Array<{ pattern: string; template: string; priority?: number }>;
  templates: Array<{ key: string; name: string }>;
  section: string;
  onAdd: () => void;
  onUpdate: (index: number, field: string, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
        >
          <Plus className="h-3 w-3" /> Add Rule
        </button>
      </div>
      {rules.length === 0 ? (
        <p className="text-gray-500 text-sm">No rules configured</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-700/50 rounded p-2">
              <div className="flex-1">
                <label className="text-gray-500 text-xs">Pattern</label>
                <input
                  type="text"
                  value={rule.pattern}
                  onChange={e => onUpdate(i, 'pattern', e.target.value)}
                  placeholder="e.g. Dueling Demos"
                  className="w-full px-2 py-1 text-sm bg-slate-700 text-white border border-slate-600 rounded"
                />
              </div>
              <div className="w-48">
                <label className="text-gray-500 text-xs">Template</label>
                <select
                  value={rule.template}
                  onChange={e => onUpdate(i, 'template', e.target.value)}
                  className="w-full px-2 py-1 text-sm bg-slate-700 text-white border border-slate-600 rounded"
                >
                  {templates.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
                </select>
              </div>
              <button
                onClick={() => onRemove(i)}
                className="mt-4 text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
