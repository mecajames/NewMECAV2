import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Trophy, Mail, Bell, Send, CheckCircle2, Clock, ArrowLeft, RefreshCw,
  Users, MailCheck, TicketCheck, Settings, Package, Plus, Trash2, Save, DollarSign, BarChart3,
  ChevronDown, ChevronUp, Edit2, X
} from 'lucide-react';
import {
  worldFinalsApi,
  type WorldFinalsQualification,
  type QualificationStats
} from '@/api-client/world-finals.api-client';
import { seasonsApi } from '@/seasons/seasons.api-client';
import { competitionClassesApi, type CompetitionClass } from '@/competition-classes/competition-classes.api-client';

type AdminTab = 'qualifications' | 'config' | 'packages' | 'addons' | 'stats';

export default function WorldFinalsAdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('qualifications');
  const [qualifications, setQualifications] = useState<WorldFinalsQualification[]>([]);
  const [stats, setStats] = useState<QualificationStats | null>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingInvitation, setSendingInvitation] = useState<string | null>(null);
  const [sendingAllInvitations, setSendingAllInvitations] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // Registration config state
  const [configForm, setConfigForm] = useState({
    registrationOpenDate: '', earlyBirdDeadline: '', registrationCloseDate: '',
    collectTshirtSize: true, collectRingSize: true, collectHotelInfo: true, collectGuestCount: true,
    customMessage: '', isActive: false,
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Packages state
  const [packages, setPackages] = useState<any[]>([]);
  const [seasonClasses, setSeasonClasses] = useState<CompetitionClass[]>([]);
  const [editingPackage, setEditingPackage] = useState<string | null>(null); // 'new' or package id
  const [pkgForm, setPkgForm] = useState({
    name: '', description: '',
    basePriceEarly: '175', basePriceRegular: '200', includedClasses: '3',
    additionalClassPriceEarly: '75', additionalClassPriceRegular: '100',
    displayOrder: '0', isActive: true,
    selectedClasses: [] as { className: string; format: string; isPremium: boolean; premiumPrice: string }[],
  });
  const [savingPkg, setSavingPkg] = useState(false);

  // Add-on items state
  const [addonItems, setAddonItems] = useState<any[]>([]);
  const [addonForm, setAddonForm] = useState({ name: '', description: '', price: '0', maxQuantity: '1', displayOrder: '0', isActive: true });
  const [editingAddon, setEditingAddon] = useState<string | null>(null);
  const [savingAddon, setSavingAddon] = useState(false);

  // Stats
  const [preRegStats, setPreRegStats] = useState<any>(null);

  useEffect(() => { fetchSeasons(); }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      fetchData();
      fetchConfig();
      fetchPackages();
      fetchAddonItems();
      fetchPreRegStats();
      fetchSeasonClasses();
    }
  }, [selectedSeasonId]);

  const fetchSeasons = async () => {
    try {
      const data = await seasonsApi.getAll();
      setSeasons(data);
      const cur = data.find((s: any) => s.is_current);
      if (cur) setSelectedSeasonId(cur.id);
      else if (data.length > 0) setSelectedSeasonId(data[0].id);
    } catch (err) { console.error(err); }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [q, s] = await Promise.all([
        worldFinalsApi.getSeasonQualifications(selectedSeasonId),
        worldFinalsApi.getQualificationStats(selectedSeasonId),
      ]);
      setQualifications(q); setStats(s);
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  };

  const fetchConfig = async () => {
    try {
      const data = await worldFinalsApi.getRegistrationConfig(selectedSeasonId);
      if (data) {
        const toLocal = (d: string) => d ? d.split('.')[0].slice(0, 16) : '';
        setConfigForm({
          registrationOpenDate: toLocal(data.registration_open_date),
          earlyBirdDeadline: toLocal(data.early_bird_deadline),
          registrationCloseDate: toLocal(data.registration_close_date),
          collectTshirtSize: data.collect_tshirt_size ?? true,
          collectRingSize: data.collect_ring_size ?? true,
          collectHotelInfo: data.collect_hotel_info ?? true,
          collectGuestCount: data.collect_guest_count ?? true,
          customMessage: data.custom_message || '',
          isActive: data.is_active || false,
        });
      }
    } catch { /* no config yet */ }
  };

  const fetchPackages = async () => {
    try { setPackages(await worldFinalsApi.getPackages(selectedSeasonId)); } catch { /* ignore */ }
  };

  const fetchSeasonClasses = async () => {
    try {
      const all = await competitionClassesApi.getBySeason(selectedSeasonId);
      setSeasonClasses(all.filter(c => c.is_active));
    } catch { /* ignore */ }
  };

  const fetchAddonItems = async () => {
    try { setAddonItems(await worldFinalsApi.getAddonItems(selectedSeasonId)); } catch { /* ignore */ }
  };

  const fetchPreRegStats = async () => {
    try { setPreRegStats(await worldFinalsApi.getPreRegistrationStats(selectedSeasonId)); } catch { /* ignore */ }
  };

  // --- Qualification handlers ---
  const handleSendInvitation = async (id: string) => {
    try { setSendingInvitation(id); await worldFinalsApi.sendInvitation(id); await fetchData(); }
    catch { alert('Failed'); } finally { setSendingInvitation(null); }
  };
  const handleSendAllInvitations = async () => {
    if (!confirm('Send invitations to all pending qualifiers?')) return;
    try { setSendingAllInvitations(true); const r = await worldFinalsApi.sendAllPendingInvitations(selectedSeasonId); alert(`Sent ${r.sent}, ${r.failed} failed.`); await fetchData(); }
    catch { alert('Failed'); } finally { setSendingAllInvitations(false); }
  };
  const handleRecalculate = async () => {
    if (!confirm('Recalculate all qualifications?')) return;
    try { setRecalculating(true); const r = await worldFinalsApi.recalculateSeasonQualifications(selectedSeasonId); alert(`${r.newQualifications} new, ${r.updatedQualifications} updated.`); await fetchData(); }
    catch { alert('Failed'); } finally { setRecalculating(false); }
  };

  // --- Config handlers ---
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await worldFinalsApi.upsertRegistrationConfig(selectedSeasonId, {
        registrationOpenDate: configForm.registrationOpenDate ? new Date(configForm.registrationOpenDate) : new Date(),
        earlyBirdDeadline: configForm.earlyBirdDeadline ? new Date(configForm.earlyBirdDeadline) : new Date(),
        registrationCloseDate: configForm.registrationCloseDate ? new Date(configForm.registrationCloseDate) : new Date(),
        collectTshirtSize: configForm.collectTshirtSize, collectRingSize: configForm.collectRingSize,
        collectHotelInfo: configForm.collectHotelInfo, collectGuestCount: configForm.collectGuestCount,
        customMessage: configForm.customMessage || null, isActive: configForm.isActive,
      });
      alert('Configuration saved!');
    } catch (err: any) { alert('Error: ' + (err?.response?.data?.message || err.message)); }
    finally { setSavingConfig(false); }
  };

  // --- Package handlers ---
  const startNewPackage = () => {
    setPkgForm({ name: '', description: '', basePriceEarly: '175', basePriceRegular: '200', includedClasses: '3',
      additionalClassPriceEarly: '75', additionalClassPriceRegular: '100', displayOrder: '0', isActive: true, selectedClasses: [] });
    setEditingPackage('new');
  };

  const startEditPackage = (pkg: any) => {
    setPkgForm({
      name: pkg.name || '', description: pkg.description || '',
      basePriceEarly: String(pkg.base_price_early), basePriceRegular: String(pkg.base_price_regular),
      includedClasses: String(pkg.included_classes), additionalClassPriceEarly: String(pkg.additional_class_price_early),
      additionalClassPriceRegular: String(pkg.additional_class_price_regular),
      displayOrder: String(pkg.display_order), isActive: pkg.is_active,
      selectedClasses: (pkg.classes || []).map((c: any) => ({
        className: c.class_name, format: c.format || '', isPremium: c.is_premium || false, premiumPrice: String(c.premium_price || '0'),
      })),
    });
    setEditingPackage(pkg.id);
  };

  const toggleClassInPackage = (cls: CompetitionClass) => {
    setPkgForm(prev => {
      const exists = prev.selectedClasses.find(c => c.className === cls.name);
      if (exists) return { ...prev, selectedClasses: prev.selectedClasses.filter(c => c.className !== cls.name) };
      return { ...prev, selectedClasses: [...prev.selectedClasses, { className: cls.name, format: cls.format, isPremium: false, premiumPrice: '0' }] };
    });
  };

  const toggleClassPremium = (className: string) => {
    setPkgForm(prev => ({
      ...prev,
      selectedClasses: prev.selectedClasses.map(c => c.className === className ? { ...c, isPremium: !c.isPremium } : c),
    }));
  };

  const updatePremiumPrice = (className: string, price: string) => {
    setPkgForm(prev => ({
      ...prev,
      selectedClasses: prev.selectedClasses.map(c => c.className === className ? { ...c, premiumPrice: price } : c),
    }));
  };

  const handleSavePackage = async () => {
    if (!pkgForm.name) { alert('Package name is required.'); return; }
    setSavingPkg(true);
    try {
      const payload = {
        seasonId: selectedSeasonId, name: pkgForm.name, description: pkgForm.description,
        basePriceEarly: parseFloat(pkgForm.basePriceEarly), basePriceRegular: parseFloat(pkgForm.basePriceRegular),
        includedClasses: parseInt(pkgForm.includedClasses),
        additionalClassPriceEarly: parseFloat(pkgForm.additionalClassPriceEarly),
        additionalClassPriceRegular: parseFloat(pkgForm.additionalClassPriceRegular),
        displayOrder: parseInt(pkgForm.displayOrder), isActive: pkgForm.isActive,
        classes: pkgForm.selectedClasses.map(c => ({
          className: c.className, format: c.format, isPremium: c.isPremium, premiumPrice: c.isPremium ? parseFloat(c.premiumPrice) : null,
        })),
      };
      if (editingPackage === 'new') await worldFinalsApi.createPackage(payload);
      else await worldFinalsApi.updatePackage(editingPackage!, payload);
      setEditingPackage(null);
      await fetchPackages();
    } catch (err: any) { alert('Error: ' + (err?.response?.data?.message || err.message)); }
    finally { setSavingPkg(false); }
  };

  const handleDeletePackage = async (id: string, name: string) => {
    if (!confirm(`Delete package "${name}"?`)) return;
    try { await worldFinalsApi.deletePackage(id); await fetchPackages(); } catch { alert('Failed'); }
  };

  // --- Add-on handlers ---
  const handleSaveAddon = async () => {
    setSavingAddon(true);
    try {
      const payload = { seasonId: selectedSeasonId, name: addonForm.name, description: addonForm.description || null,
        price: parseFloat(addonForm.price), maxQuantity: parseInt(addonForm.maxQuantity), displayOrder: parseInt(addonForm.displayOrder), isActive: addonForm.isActive };
      if (editingAddon) await worldFinalsApi.updateAddonItem(editingAddon, payload);
      else await worldFinalsApi.createAddonItem(payload);
      setEditingAddon(null);
      setAddonForm({ name: '', description: '', price: '0', maxQuantity: '1', displayOrder: '0', isActive: true });
      await fetchAddonItems();
    } catch (err: any) { alert('Error: ' + err.message); }
    finally { setSavingAddon(false); }
  };

  const filteredQualifications = qualifications.filter(q => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return q.competitor_name.toLowerCase().includes(s) || q.meca_id.toString().includes(s) || q.competition_class.toLowerCase().includes(s);
  });

  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

  // Group season classes by format for the package builder
  const classesByFormat: Record<string, CompetitionClass[]> = {};
  for (const cls of seasonClasses) {
    if (!classesByFormat[cls.format]) classesByFormat[cls.format] = [];
    classesByFormat[cls.format].push(cls);
  }

  const TABS: { id: AdminTab; label: string; icon: any }[] = [
    { id: 'qualifications', label: 'Qualifications', icon: Trophy },
    { id: 'config', label: 'Dates & Settings', icon: Settings },
    { id: 'packages', label: 'Packages', icon: Package },
    { id: 'addons', label: 'Add-Ons', icon: DollarSign },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3"><Trophy className="h-8 w-8 text-yellow-500" />World Finals Management</h1>
            <p className="text-gray-400 mt-2">Qualifications, packages, pre-registration, and competitor management</p>
          </div>
          <button onClick={() => navigate('/dashboard/admin')} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"><ArrowLeft className="h-4 w-4" />Back</button>
        </div>

        {/* Season */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-gray-400">Season:</label>
            <select value={selectedSeasonId} onChange={e => setSelectedSeasonId(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500">
              {seasons.map(s => <option key={s.id} value={s.id}>{s.name} {s.is_current ? '(Current)' : ''}</option>)}
            </select>
            {selectedSeason?.qualification_points_threshold && <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-sm">Threshold: {selectedSeason.qualification_points_threshold} pts</span>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-700 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'bg-slate-800 text-orange-400 border-b-2 border-orange-500' : 'text-gray-400 hover:text-white'}`}>
              <tab.icon className="h-4 w-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* ==================== QUALIFICATIONS ==================== */}
        {activeTab === 'qualifications' && (
          <>
            <div className="flex gap-3 mb-6">
              <button onClick={handleRecalculate} disabled={recalculating} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />Recalculate
              </button>
              <button onClick={handleSendAllInvitations} disabled={sendingAllInvitations} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2">
                <Send className="h-4 w-4" />Send All Pending
              </button>
            </div>
            {stats && (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
                {[{ l: 'Competitors', v: stats.uniqueCompetitors }, { l: 'Qualifications', v: stats.totalQualifications },
                  { l: 'Notifications', v: stats.notificationsSent }, { l: 'Emails', v: stats.emailsSent },
                  { l: 'Invitations', v: stats.invitationsSent }, { l: 'Redeemed', v: stats.invitationsRedeemed }]
                  .map(({ l, v }) => (
                  <div key={l} className="bg-slate-800 rounded-xl p-4"><span className="text-gray-400 text-xs">{l}</span><div className="text-2xl font-bold text-white">{v}</div></div>
                ))}
              </div>
            )}
            <div className="bg-slate-800 rounded-xl p-4 mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" />
              </div>
            </div>
            {loading ? <div className="text-center py-20"><div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-r-transparent" /></div>
            : filteredQualifications.length === 0 ? <div className="bg-slate-800 rounded-xl p-12 text-center"><Trophy className="h-16 w-16 text-gray-500 mx-auto mb-4" /><p className="text-gray-400">No qualifications yet.</p></div>
            : (
              <div className="bg-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700"><tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Competitor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">MECA ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Points</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredQualifications.map(q => (
                      <tr key={q.id} className="hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-white">{q.competitor_name}</td>
                        <td className="px-4 py-3"><span className="text-orange-400 font-mono">{q.meca_id}</span></td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-700 rounded text-sm text-white">{q.competition_class}</span></td>
                        <td className="px-4 py-3 text-green-400 font-bold">{q.total_points}</td>
                        <td className="px-4 py-3">
                          {q.invitation_redeemed ? <span className="text-green-400 text-xs">Registered</span>
                            : q.invitation_sent ? <span className="text-purple-400 text-xs">Invited</span>
                            : <span className="text-gray-500 text-xs">Pending</span>}
                        </td>
                        <td className="px-4 py-3">
                          {!q.invitation_sent && <button onClick={() => handleSendInvitation(q.id)} disabled={sendingInvitation === q.id}
                            className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 disabled:opacity-50">Send Invite</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ==================== DATES & SETTINGS ==================== */}
        {activeTab === 'config' && (
          <div className="bg-slate-800 rounded-xl p-6 space-y-6">
            <h3 className="text-xl font-semibold text-white border-b border-slate-700 pb-3">Registration Dates & Settings</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={configForm.isActive} onChange={e => setConfigForm({ ...configForm, isActive: e.target.checked })}
                className="w-5 h-5 rounded border-slate-500 text-orange-500 bg-slate-700" />
              <span className="text-white font-medium">Pre-Registration Active</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[['Open Date', 'registrationOpenDate'], ['Early Bird Deadline', 'earlyBirdDeadline'], ['Close Date', 'registrationCloseDate']].map(([label, key]) => (
                <div key={key}><label className="block text-sm text-gray-400 mb-1">{label}</label>
                  <input type="datetime-local" value={(configForm as any)[key]} onChange={e => setConfigForm({ ...configForm, [key]: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" /></div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[['collectTshirtSize', 'T-Shirt Size'], ['collectRingSize', 'Ring Size'], ['collectHotelInfo', 'Hotel Info'], ['collectGuestCount', 'Guest Count']].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={(configForm as any)[key]} onChange={e => setConfigForm({ ...configForm, [key]: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-500 text-orange-500 bg-slate-700" />
                  <span className="text-white text-sm">{label}</span>
                </label>
              ))}
            </div>
            <div><label className="block text-sm text-gray-400 mb-1">Custom Message</label>
              <textarea value={configForm.customMessage} onChange={e => setConfigForm({ ...configForm, customMessage: e.target.value })} rows={3}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="Welcome message..." /></div>
            <button onClick={handleSaveConfig} disabled={savingConfig}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold rounded-lg">
              <Save className="h-4 w-4" />{savingConfig ? 'Saving...' : 'Save Settings'}</button>
          </div>
        )}

        {/* ==================== PACKAGES ==================== */}
        {activeTab === 'packages' && (
          <div className="space-y-6">
            {/* Package List */}
            {!editingPackage && (
              <>
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-white">Registration Packages</h3>
                  <button onClick={startNewPackage} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg">
                    <Plus className="h-4 w-4" />Add Package</button>
                </div>
                {packages.length === 0 ? (
                  <div className="bg-slate-800 rounded-xl p-12 text-center"><Package className="h-12 w-12 text-gray-500 mx-auto mb-3" /><p className="text-gray-400">No packages configured. Add one to get started.</p></div>
                ) : packages.map(pkg => (
                  <div key={pkg.id} className="bg-slate-800 rounded-xl p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-white">{pkg.name}</h4>
                        {pkg.description && <p className="text-gray-400 text-sm">{pkg.description}</p>}
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${pkg.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{pkg.is_active ? 'Active' : 'Inactive'}</span>
                        <button onClick={() => startEditPackage(pkg)} className="p-2 text-gray-400 hover:text-white"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleDeletePackage(pkg.id, pkg.name)} className="p-2 text-gray-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="bg-slate-700/50 rounded p-3"><span className="text-gray-400 text-xs block">Early Bird</span><span className="text-green-400 font-bold">${Number(pkg.base_price_early).toFixed(2)}</span></div>
                      <div className="bg-slate-700/50 rounded p-3"><span className="text-gray-400 text-xs block">Regular</span><span className="text-white font-bold">${Number(pkg.base_price_regular).toFixed(2)}</span></div>
                      <div className="bg-slate-700/50 rounded p-3"><span className="text-gray-400 text-xs block">Included Classes</span><span className="text-white font-bold">{pkg.included_classes}</span></div>
                      <div className="bg-slate-700/50 rounded p-3"><span className="text-gray-400 text-xs block">Eligible Classes</span><span className="text-white font-bold">{pkg.classes?.length || 0}</span></div>
                    </div>
                    {pkg.classes?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {pkg.classes.map((c: any) => (
                          <span key={c.class_name} className={`px-2 py-0.5 rounded text-xs ${c.is_premium ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-700 text-gray-300'}`}>
                            {c.class_name}{c.is_premium ? ` ($${Number(c.premium_price).toFixed(0)})` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* Package Editor */}
            {editingPackage && (
              <div className="bg-slate-800 border border-orange-500/30 rounded-xl p-6 space-y-5">
                <h3 className="text-lg font-semibold text-orange-400">{editingPackage === 'new' ? 'New Package' : 'Edit Package'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm text-gray-400 mb-1">Package Name *</label>
                    <input type="text" value={pkgForm.name} onChange={e => setPkgForm({ ...pkgForm, name: e.target.value })} placeholder="e.g., SPL Competition Package"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" /></div>
                  <div><label className="block text-sm text-gray-400 mb-1">Description</label>
                    <input type="text" value={pkgForm.description} onChange={e => setPkgForm({ ...pkgForm, description: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" /></div>
                </div>
                {/* Pricing */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div><label className="block text-xs text-gray-400 mb-1">Included Classes</label>
                    <input type="number" value={pkgForm.includedClasses} onChange={e => setPkgForm({ ...pkgForm, includedClasses: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Early Bird Base ($)</label>
                    <input type="number" step="0.01" value={pkgForm.basePriceEarly} onChange={e => setPkgForm({ ...pkgForm, basePriceEarly: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Regular Base ($)</label>
                    <input type="number" step="0.01" value={pkgForm.basePriceRegular} onChange={e => setPkgForm({ ...pkgForm, basePriceRegular: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Extra Class Early ($)</label>
                    <input type="number" step="0.01" value={pkgForm.additionalClassPriceEarly} onChange={e => setPkgForm({ ...pkgForm, additionalClassPriceEarly: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Extra Class Regular ($)</label>
                    <input type="number" step="0.01" value={pkgForm.additionalClassPriceRegular} onChange={e => setPkgForm({ ...pkgForm, additionalClassPriceRegular: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" /></div>
                </div>

                {/* Class Selection */}
                <div>
                  <h4 className="text-sm font-semibold text-orange-400 mb-2">Eligible Classes ({pkgForm.selectedClasses.length} selected)</h4>
                  <p className="text-xs text-gray-500 mb-3">Select which competition classes belong in this package. Mark premium classes that cost extra and aren't included in the base price.</p>
                  {Object.entries(classesByFormat).map(([format, classes]) => (
                    <div key={format} className="mb-4">
                      <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{format}</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                        {classes.map(cls => {
                          const selected = pkgForm.selectedClasses.find(c => c.className === cls.name);
                          return (
                            <div key={cls.id} className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                              selected ? 'bg-orange-500/10 border-orange-500/40' : 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500'}`}>
                              <input type="checkbox" checked={!!selected} onChange={() => toggleClassInPackage(cls)}
                                className="w-4 h-4 rounded border-slate-500 text-orange-500 bg-slate-700 flex-shrink-0" />
                              <span className="text-white text-sm flex-1 truncate">{cls.name}</span>
                              {selected && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button onClick={(e) => { e.stopPropagation(); toggleClassPremium(cls.name); }}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${selected.isPremium ? 'bg-amber-500/30 text-amber-400' : 'bg-slate-600 text-gray-500 hover:text-gray-300'}`}>
                                    {selected.isPremium ? 'PREMIUM' : 'Std'}
                                  </button>
                                  {selected.isPremium && (
                                    <input type="number" step="1" value={selected.premiumPrice}
                                      onChange={e => { e.stopPropagation(); updatePremiumPrice(cls.name, e.target.value); }}
                                      onClick={e => e.stopPropagation()}
                                      className="w-14 px-1 py-0.5 text-[10px] bg-slate-700 border border-amber-500/30 rounded text-amber-400 text-right"
                                      placeholder="$" />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={handleSavePackage} disabled={savingPkg}
                    className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold rounded-lg">
                    <Save className="h-4 w-4" />{savingPkg ? 'Saving...' : 'Save Package'}</button>
                  <button onClick={() => setEditingPackage(null)} className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== ADD-ONS ==================== */}
        {activeTab === 'addons' && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">{editingAddon ? 'Edit' : 'Add'} Item</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div><label className="block text-sm text-gray-400 mb-1">Name *</label>
                  <input type="text" value={addonForm.name} onChange={e => setAddonForm({ ...addonForm, name: e.target.value })} placeholder="e.g., Display Booth"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Price ($)</label>
                  <input type="number" step="0.01" value={addonForm.price} onChange={e => setAddonForm({ ...addonForm, price: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">Max Qty</label>
                  <input type="number" value={addonForm.maxQuantity} onChange={e => setAddonForm({ ...addonForm, maxQuantity: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleSaveAddon} disabled={savingAddon || !addonForm.name}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold rounded-lg">
                  <Save className="h-4 w-4" />{editingAddon ? 'Update' : 'Add'}</button>
                {editingAddon && <button onClick={() => { setEditingAddon(null); setAddonForm({ name: '', description: '', price: '0', maxQuantity: '1', displayOrder: '0', isActive: true }); }}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg">Cancel</button>}
              </div>
            </div>
            {addonItems.length > 0 && (
              <div className="bg-slate-800 rounded-xl overflow-hidden">
                <table className="w-full"><thead className="bg-slate-700"><tr>
                  <th className="px-6 py-3 text-left text-xs text-gray-400 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-400 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-400 uppercase">Max Qty</th>
                  <th className="px-6 py-3 text-left text-xs text-gray-400 uppercase">Actions</th>
                </tr></thead><tbody className="divide-y divide-slate-700">
                  {addonItems.map(item => (
                    <tr key={item.id}><td className="px-6 py-3 text-white">{item.name}</td>
                    <td className="px-6 py-3 text-green-400">${Number(item.price).toFixed(2)}</td>
                    <td className="px-6 py-3 text-white">{item.max_quantity}</td>
                    <td className="px-6 py-3 flex gap-2">
                      <button onClick={() => { setEditingAddon(item.id); setAddonForm({ name: item.name, description: item.description || '', price: String(item.price), maxQuantity: String(item.max_quantity), displayOrder: String(item.display_order), isActive: item.is_active }); }} className="p-1 text-gray-400 hover:text-white"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={async () => { if (confirm('Delete?')) { await worldFinalsApi.deleteAddonItem(item.id); await fetchAddonItems(); }}} className="p-1 text-gray-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </td></tr>
                  ))}
                </tbody></table>
              </div>
            )}
          </div>
        )}

        {/* ==================== STATS ==================== */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {preRegStats && preRegStats.totalRegistrations > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[{ l: 'Total', v: preRegStats.totalRegistrations, c: 'white' }, { l: 'Paid', v: preRegStats.paidRegistrations, c: 'green-400' },
                    { l: 'Pending', v: preRegStats.pendingRegistrations, c: 'yellow-400' }, { l: 'Revenue', v: `$${Number(preRegStats.totalRevenue).toFixed(2)}`, c: 'green-400' }]
                    .map(({ l, v, c }) => (
                    <div key={l} className="bg-slate-800 rounded-xl p-5"><span className="text-gray-400 text-sm">{l}</span><div className={`text-3xl font-bold text-${c}`}>{v}</div></div>
                  ))}
                </div>
                {preRegStats.packageBreakdown?.length > 0 && (
                  <div className="bg-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">By Package</h3>
                    <div className="space-y-2">{preRegStats.packageBreakdown.map((p: any) => (
                      <div key={p.packageId} className="flex justify-between bg-slate-700/50 rounded p-3">
                        <span className="text-white">{p.packageName || 'Unknown'}</span>
                        <div className="flex gap-4"><span className="text-white font-semibold">{p.count} registrations</span><span className="text-green-400">${Number(p.revenue).toFixed(2)}</span></div>
                      </div>
                    ))}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-slate-800 rounded-xl p-12 text-center"><BarChart3 className="h-12 w-12 text-gray-500 mx-auto mb-3" /><p className="text-gray-400">No registrations yet.</p></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
