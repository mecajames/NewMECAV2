import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Settings,
  Globe,
  Save,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { seoApi, type SeoSettings, type SeoOverride, type CreateSeoOverrideDto } from '@/api-client/seo.api-client';

export default function SEOSettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'settings' | 'overrides'>('settings');

  // Settings state
  const [settings, setSettings] = useState<SeoSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Overrides state
  const [overrides, setOverrides] = useState<SeoOverride[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(true);
  const [editingOverride, setEditingOverride] = useState<SeoOverride | null>(null);
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [overrideForm, setOverrideForm] = useState<CreateSeoOverrideDto>({
    url_path: '',
    title: '',
    description: '',
    canonical_url: '',
    noindex: false,
    og_image: '',
  });
  const [overrideMessage, setOverrideMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
    loadOverrides();
  }, []);

  async function loadSettings() {
    try {
      setSettingsLoading(true);
      const data = await seoApi.getSettings();
      setSettings(data);
    } catch (err: any) {
      setSettingsMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load settings' });
    } finally {
      setSettingsLoading(false);
    }
  }

  async function loadOverrides() {
    try {
      setOverridesLoading(true);
      const data = await seoApi.listOverrides();
      setOverrides(data);
    } catch (err: any) {
      setOverrideMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load overrides' });
    } finally {
      setOverridesLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    try {
      setSaving(true);
      setSettingsMessage(null);
      const updated = await seoApi.updateSettings(settings);
      setSettings(updated);
      setSettingsMessage({ type: 'success', text: 'SEO settings saved successfully' });
    } catch (err: any) {
      setSettingsMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddOverride() {
    if (!overrideForm.url_path.trim()) {
      setOverrideMessage({ type: 'error', text: 'URL path is required' });
      return;
    }
    try {
      setOverrideMessage(null);
      const created = await seoApi.createOverride(overrideForm);
      setOverrides(prev => [...prev, created].sort((a, b) => a.url_path.localeCompare(b.url_path)));
      setShowAddOverride(false);
      resetOverrideForm();
      setOverrideMessage({ type: 'success', text: 'Override added successfully' });
    } catch (err: any) {
      setOverrideMessage({ type: 'error', text: err.response?.data?.message || 'Failed to add override' });
    }
  }

  async function handleUpdateOverride() {
    if (!editingOverride) return;
    try {
      setOverrideMessage(null);
      const updated = await seoApi.updateOverride(editingOverride.id, {
        title: overrideForm.title,
        description: overrideForm.description,
        canonical_url: overrideForm.canonical_url,
        noindex: overrideForm.noindex,
        og_image: overrideForm.og_image,
      });
      setOverrides(prev => prev.map(o => o.id === updated.id ? updated : o));
      setEditingOverride(null);
      resetOverrideForm();
      setOverrideMessage({ type: 'success', text: 'Override updated successfully' });
    } catch (err: any) {
      setOverrideMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update override' });
    }
  }

  async function handleDeleteOverride(id: string) {
    if (!confirm('Are you sure you want to delete this SEO override?')) return;
    try {
      setOverrideMessage(null);
      await seoApi.deleteOverride(id);
      setOverrides(prev => prev.filter(o => o.id !== id));
      setOverrideMessage({ type: 'success', text: 'Override deleted' });
    } catch (err: any) {
      setOverrideMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete override' });
    }
  }

  function startEditOverride(override: SeoOverride) {
    setEditingOverride(override);
    setOverrideForm({
      url_path: override.url_path,
      title: override.title || '',
      description: override.description || '',
      canonical_url: override.canonical_url || '',
      noindex: override.noindex,
      og_image: override.og_image || '',
    });
    setShowAddOverride(false);
  }

  function resetOverrideForm() {
    setOverrideForm({ url_path: '', title: '', description: '', canonical_url: '', noindex: false, og_image: '' });
  }

  function cancelOverrideEdit() {
    setEditingOverride(null);
    setShowAddOverride(false);
    resetOverrideForm();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="h-6 w-px bg-slate-600" />
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings className="w-6 h-6 text-orange-500" />
              SEO Settings
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-800 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4 inline mr-2" />
            Global Settings
          </button>
          <button
            onClick={() => setActiveTab('overrides')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'overrides'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Page Overrides
            {overrides.length > 0 && (
              <span className="ml-2 bg-slate-600 px-2 py-0.5 rounded-full text-xs">{overrides.length}</span>
            )}
          </button>
        </div>

        {/* Global Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-slate-800 rounded-xl p-6">
            {settingsMessage && (
              <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
                settingsMessage.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {settingsMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {settingsMessage.text}
              </div>
            )}

            {settingsLoading ? (
              <div className="text-gray-400 text-center py-8">Loading settings...</div>
            ) : settings ? (
              <div className="space-y-6">
                {/* Title & Branding */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Title & Branding</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Site Name</label>
                      <input
                        type="text"
                        value={settings.siteName}
                        onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                        placeholder="MECA Car Audio"
                      />
                      <p className="text-xs text-gray-500 mt-1">Used in page titles and OG tags</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Title Separator</label>
                      <input
                        type="text"
                        value={settings.titleSeparator}
                        onChange={(e) => setSettings({ ...settings, titleSeparator: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                        placeholder=" | "
                      />
                      <p className="text-xs text-gray-500 mt-1">Between page title and site name (e.g. "Events | MECA")</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Default Meta Description</label>
                    <textarea
                      value={settings.defaultDescription}
                      onChange={(e) => setSettings({ ...settings, defaultDescription: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                      placeholder="The Premier Platform for Car Audio Competition Management."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {settings.defaultDescription.length}/160 characters (recommended max)
                    </p>
                  </div>
                </div>

                {/* Social Media */}
                <div className="border-t border-slate-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Social Media</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Twitter Handle</label>
                      <input
                        type="text"
                        value={settings.twitterHandle}
                        onChange={(e) => setSettings({ ...settings, twitterHandle: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                        placeholder="@mecacaraudio"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Default Social Image URL</label>
                      <input
                        type="text"
                        value={settings.socialImage}
                        onChange={(e) => setSettings({ ...settings, socialImage: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                        placeholder="https://mecacaraudio.com/og-image.png"
                      />
                      <p className="text-xs text-gray-500 mt-1">Used when no page-specific image is set (1200x630 recommended)</p>
                    </div>
                  </div>
                </div>

                {/* Search Engine Verification */}
                <div className="border-t border-slate-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Search Engine Verification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Google Verification Code</label>
                      <input
                        type="text"
                        value={settings.googleVerification}
                        onChange={(e) => setSettings({ ...settings, googleVerification: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                        placeholder="google-site-verification code"
                      />
                      <p className="text-xs text-gray-500 mt-1">From Google Search Console &gt; Settings &gt; Ownership verification</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Bing Verification Code</label>
                      <input
                        type="text"
                        value={settings.bingVerification}
                        onChange={(e) => setSettings({ ...settings, bingVerification: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                        placeholder="Bing Webmaster verification code"
                      />
                      <p className="text-xs text-gray-500 mt-1">From Bing Webmaster Tools &gt; Site Dashboard &gt; Verify</p>
                    </div>
                  </div>
                </div>

                {/* Title Preview */}
                <div className="border-t border-slate-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
                  <div className="bg-slate-900 rounded-lg p-4">
                    <div className="text-blue-400 text-lg truncate">
                      Competition Events{settings.titleSeparator}{settings.siteName}
                    </div>
                    <div className="text-green-400 text-sm mt-1">
                      mecacaraudio.com/events
                    </div>
                    <div className="text-gray-400 text-sm mt-1 line-clamp-2">
                      {settings.defaultDescription || 'No description set'}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Approximate Google search result appearance</p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={saveSettings}
                    disabled={settingsSaving}
                    className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {settingsSaving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Page Overrides Tab */}
        {activeTab === 'overrides' && (
          <div className="space-y-4">
            {overrideMessage && (
              <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                overrideMessage.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {overrideMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {overrideMessage.text}
              </div>
            )}

            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-300">
              <strong>How it works:</strong> SEO overrides let you customize the title, description, and other meta tags
              for any page on the site. Overrides take priority over the auto-generated SEO data. Leave a field blank to
              use the default value.
            </div>

            {/* Add Override Button */}
            {!showAddOverride && !editingOverride && (
              <button
                onClick={() => { setShowAddOverride(true); resetOverrideForm(); }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Override
              </button>
            )}

            {/* Add/Edit Form */}
            {(showAddOverride || editingOverride) && (
              <div className="bg-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    {editingOverride ? `Edit Override: ${editingOverride.url_path}` : 'Add New Override'}
                  </h3>
                  <button onClick={cancelOverrideEdit} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {!editingOverride && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">URL Path *</label>
                      <input
                        type="text"
                        value={overrideForm.url_path}
                        onChange={(e) => setOverrideForm(prev => ({ ...prev, url_path: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                        placeholder="/events or /shop/products/abc-123"
                      />
                      <p className="text-xs text-gray-500 mt-1">Must start with /. Use the exact URL path of the page.</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Custom Title</label>
                    <input
                      type="text"
                      value={overrideForm.title}
                      onChange={(e) => setOverrideForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                      placeholder="Leave blank to use default"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {(overrideForm.title || '').length}/60 characters (recommended max)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Custom Description</label>
                    <textarea
                      value={overrideForm.description}
                      onChange={(e) => setOverrideForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                      placeholder="Leave blank to use default"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {(overrideForm.description || '').length}/160 characters (recommended max)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Canonical URL</label>
                      <input
                        type="text"
                        value={overrideForm.canonical_url}
                        onChange={(e) => setOverrideForm(prev => ({ ...prev, canonical_url: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                        placeholder="/alternate-path"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">OG Image URL</label>
                      <input
                        type="text"
                        value={overrideForm.og_image}
                        onChange={(e) => setOverrideForm(prev => ({ ...prev, og_image: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overrideForm.noindex}
                        onChange={(e) => setOverrideForm(prev => ({ ...prev, noindex: e.target.checked }))}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-300">No Index</span>
                    </label>
                    <p className="text-xs text-gray-500">Tell search engines not to index this page</p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={cancelOverrideEdit}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={editingOverride ? handleUpdateOverride : handleAddOverride}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      {editingOverride ? 'Update Override' : 'Add Override'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Overrides Table */}
            <div className="bg-slate-800 rounded-xl overflow-hidden">
              {overridesLoading ? (
                <div className="text-gray-400 text-center py-8">Loading overrides...</div>
              ) : overrides.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  No SEO overrides configured. Add one to customize SEO for specific pages.
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">URL Path</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Custom Title</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Flags</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overrides.map((override) => (
                      <tr key={override.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="px-4 py-3">
                          <span className="text-sm text-white font-mono">{override.url_path}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-300 truncate block max-w-xs">
                            {override.title || <span className="text-gray-500 italic">default</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {override.noindex && (
                              <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded-full">noindex</span>
                            )}
                            {override.canonical_url && (
                              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full">canonical</span>
                            )}
                            {override.og_image && (
                              <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full">image</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEditOverride(override)}
                              className="p-1.5 text-gray-400 hover:text-orange-400 transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteOverride(override.id)}
                              className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
