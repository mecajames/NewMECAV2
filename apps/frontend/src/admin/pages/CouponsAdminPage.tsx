import { useState, useEffect } from 'react';
import { Tag, Plus, Edit, Trash2, Filter, ArrowLeft, Search, X, Eye, Loader2, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { couponsApi, Coupon, CouponUsage } from '@/coupons';
import { membershipTypeConfigsApi, MembershipTypeConfig } from '@/membership-type-configs';
import { shopApi } from '@/shop/shop.api-client';

interface FormData {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: string;
  scope: 'all' | 'membership' | 'shop';
  applicableProductIds: string[];
  applicableMembershipTypeConfigIds: string[];
  minOrderAmount: string;
  maxDiscountAmount: string;
  maxUses: string;
  maxUsesPerUser: string;
  newMembersOnly: boolean;
  status: 'active' | 'inactive';
  startsAt: string;
  expiresAt: string;
  // Code generation
  codePrefix: string;
  codeSuffix: string;
  codeLength: number;
  useManualCode: boolean;
  quantity: number;
}

const defaultFormData: FormData = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  scope: 'all',
  applicableProductIds: [],
  applicableMembershipTypeConfigIds: [],
  minOrderAmount: '',
  maxDiscountAmount: '',
  maxUses: '',
  maxUsesPerUser: '1',
  newMembersOnly: false,
  status: 'active',
  startsAt: '',
  expiresAt: '',
  codePrefix: 'MECA',
  codeSuffix: '',
  codeLength: 8,
  useManualCode: false,
  quantity: 1,
};

export default function CouponsAdminPage() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<FormData>({ ...defaultFormData });
  const [saving, setSaving] = useState(false);
  const [previewCode, setPreviewCode] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Usage modal
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageCoupon, setUsageCoupon] = useState<Coupon | null>(null);
  const [usages, setUsages] = useState<CouponUsage[]>([]);
  const [loadingUsages, setLoadingUsages] = useState(false);

  // Reference data for targeting
  const [membershipTypes, setMembershipTypes] = useState<MembershipTypeConfig[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchCoupons();
    fetchReferenceData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [coupons, statusFilter, scopeFilter, searchQuery]);

  const fetchCoupons = async () => {
    try {
      const data = await couponsApi.list();
      setCoupons(data);
    } catch (err) {
      console.error('Failed to fetch coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [types, prods] = await Promise.all([
        membershipTypeConfigsApi.getAll(),
        shopApi.getProducts().catch(() => []),
      ]);
      setMembershipTypes(types);
      setProducts(prods);
    } catch (err) {
      console.error('Failed to fetch reference data:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...coupons];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    if (scopeFilter !== 'all') {
      filtered = filtered.filter(c => c.scope === scopeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.code.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      );
    }

    setFilteredCoupons(filtered);
  };

  const handleGeneratePreview = async () => {
    try {
      const result = await couponsApi.generatePreview({
        prefix: formData.codePrefix || undefined,
        suffix: formData.codeSuffix || undefined,
        length: formData.codeLength,
      });
      setPreviewCode(result.code);
      setFormData(prev => ({ ...prev, code: result.code }));
    } catch (err) {
      console.error('Failed to generate preview:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: any = {
        description: formData.description || undefined,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        scope: formData.scope,
        status: formData.status,
        newMembersOnly: formData.newMembersOnly,
        maxUsesPerUser: formData.maxUsesPerUser ? parseInt(formData.maxUsesPerUser) : 0,
      };

      if (formData.useManualCode && formData.code) {
        payload.code = formData.code;
      } else if (!editingCoupon) {
        payload.codePrefix = formData.codePrefix || undefined;
        payload.codeSuffix = formData.codeSuffix || undefined;
        payload.codeLength = formData.codeLength;
      }

      if (formData.minOrderAmount) payload.minOrderAmount = parseFloat(formData.minOrderAmount);
      if (formData.maxDiscountAmount) payload.maxDiscountAmount = parseFloat(formData.maxDiscountAmount);
      if (formData.maxUses) payload.maxUses = parseInt(formData.maxUses);
      if (formData.startsAt) payload.startsAt = new Date(formData.startsAt).toISOString();
      if (formData.expiresAt) payload.expiresAt = new Date(formData.expiresAt).toISOString();

      if (formData.scope === 'shop' && formData.applicableProductIds.length > 0) {
        payload.applicableProductIds = formData.applicableProductIds;
      }
      if (formData.scope === 'membership' && formData.applicableMembershipTypeConfigIds.length > 0) {
        payload.applicableMembershipTypeConfigIds = formData.applicableMembershipTypeConfigIds;
      }

      if (editingCoupon) {
        await couponsApi.update(editingCoupon.id, payload);
        alert('Coupon updated successfully!');
      } else if (!formData.useManualCode && formData.quantity > 1) {
        const result = await couponsApi.createBatch(formData.quantity, payload);
        alert(`${result.created} coupon codes created successfully!`);
      } else {
        await couponsApi.create(payload);
        alert('Coupon created successfully!');
      }

      resetForm();
      fetchCoupons();
    } catch (err: any) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discount_type as 'percentage' | 'fixed_amount',
      discountValue: String(coupon.discount_value),
      scope: coupon.scope as 'all' | 'membership' | 'shop',
      applicableProductIds: coupon.applicable_product_ids || [],
      applicableMembershipTypeConfigIds: coupon.applicable_membership_type_config_ids || [],
      minOrderAmount: coupon.min_order_amount ? String(coupon.min_order_amount) : '',
      maxDiscountAmount: coupon.max_discount_amount ? String(coupon.max_discount_amount) : '',
      maxUses: coupon.max_uses ? String(coupon.max_uses) : '',
      maxUsesPerUser: coupon.max_uses_per_user ? String(coupon.max_uses_per_user) : '1',
      newMembersOnly: coupon.new_members_only,
      status: coupon.status as 'active' | 'inactive',
      startsAt: coupon.starts_at ? new Date(coupon.starts_at).toISOString().slice(0, 16) : '',
      expiresAt: coupon.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 16) : '',
      codePrefix: '',
      codeSuffix: '',
      codeLength: 8,
      useManualCode: true,
    });
    setShowForm(true);
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this coupon?')) return;
    try {
      await couponsApi.deactivate(id);
      fetchCoupons();
    } catch (err: any) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleViewUsages = async (coupon: Coupon) => {
    setUsageCoupon(coupon);
    setShowUsageModal(true);
    setLoadingUsages(true);
    try {
      const data = await couponsApi.getUsages(coupon.id);
      setUsages(data);
    } catch (err) {
      console.error('Failed to fetch usages:', err);
    } finally {
      setLoadingUsages(false);
    }
  };

  const resetForm = () => {
    setFormData({ ...defaultFormData });
    setEditingCoupon(null);
    setShowForm(false);
    setPreviewCode('');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="text-center py-20">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Coupon Code Management</h1>
            <p className="text-gray-400">Create and manage discount coupon codes for memberships and shop products</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-white">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Scope</label>
              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All</option>
                <option value="membership">Memberships</option>
                <option value="shop">Shop</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by code..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-3">
            Showing <span className="text-white font-semibold">{filteredCoupons.length}</span> of <span className="text-white font-semibold">{coupons.length}</span> coupons
          </p>
        </div>

        {/* Create Button */}
        <div className="mb-6">
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Coupon
          </button>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <div className="bg-slate-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Code Generation */}
              {!editingCoupon && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-md font-semibold text-white mb-3">Coupon Code</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={!formData.useManualCode}
                        onChange={() => setFormData(prev => ({ ...prev, useManualCode: false }))}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      Auto-generate
                    </label>
                    <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.useManualCode}
                        onChange={() => setFormData(prev => ({ ...prev, useManualCode: true }))}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      Manual entry
                    </label>
                  </div>

                  {formData.useManualCode ? (
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g., SUMMER2025"
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Prefix</label>
                        <input
                          type="text"
                          value={formData.codePrefix}
                          onChange={(e) => setFormData(prev => ({ ...prev, codePrefix: e.target.value.toUpperCase() }))}
                          placeholder="MECA"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Suffix</label>
                        <input
                          type="text"
                          value={formData.codeSuffix}
                          onChange={(e) => setFormData(prev => ({ ...prev, codeSuffix: e.target.value.toUpperCase() }))}
                          placeholder="(optional)"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Random Length</label>
                        <input
                          type="number"
                          min={4}
                          max={20}
                          value={formData.codeLength}
                          onChange={(e) => setFormData(prev => ({ ...prev, codeLength: parseInt(e.target.value) || 8 }))}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1"># Codes to Generate</label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={formData.quantity}
                          onChange={(e) => setFormData(prev => ({ ...prev, quantity: Math.min(50, Math.max(1, parseInt(e.target.value) || 1)) }))}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleGeneratePreview}
                          className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
                        >
                          Preview
                        </button>
                      </div>
                    </div>
                  )}
                  {previewCode && !formData.useManualCode && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Preview:</span>
                      <span className="font-mono text-orange-400 font-semibold">{previewCode}</span>
                      <button type="button" onClick={() => navigator.clipboard.writeText(previewCode)} className="text-gray-400 hover:text-white">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {editingCoupon && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Code:</span>
                  <span className="font-mono text-orange-400 font-semibold text-lg">{editingCoupon.code}</span>
                </div>
              )}

              {/* Discount Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., Summer Sale 20% Off"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Discount Type *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.discountType === 'percentage'}
                        onChange={() => setFormData(prev => ({ ...prev, discountType: 'percentage' }))}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      Percentage (%)
                    </label>
                    <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.discountType === 'fixed_amount'}
                        onChange={() => setFormData(prev => ({ ...prev, discountType: 'fixed_amount' }))}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      Fixed Amount ($)
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Discount Value * {formData.discountType === 'percentage' ? '(%)' : '($)'}
                  </label>
                  <input
                    type="number"
                    step={formData.discountType === 'percentage' ? '1' : '0.01'}
                    min="0"
                    max={formData.discountType === 'percentage' ? '100' : undefined}
                    required
                    value={formData.discountValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, discountValue: e.target.value }))}
                    placeholder={formData.discountType === 'percentage' ? '10' : '20.00'}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Max Discount Cap ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.maxDiscountAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxDiscountAmount: e.target.value }))}
                    placeholder="Optional"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Min Order Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, minOrderAmount: e.target.value }))}
                    placeholder="Optional"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Validity & Usage */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Starts At</label>
                  <input
                    type="datetime-local"
                    value={formData.startsAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, startsAt: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Expires At</label>
                  <input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Max Total Uses</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxUses}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxUses: e.target.value }))}
                    placeholder="0 = Unlimited"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Uses Per Customer</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxUsesPerUser}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxUsesPerUser: e.target.value }))}
                    placeholder="1"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Scope & Targeting */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Scope *</label>
                <div className="flex gap-4">
                  {(['all', 'membership', 'shop'] as const).map(s => (
                    <label key={s} className="flex items-center gap-2 text-gray-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.scope === s}
                        onChange={() => setFormData(prev => ({ ...prev, scope: s, applicableProductIds: [], applicableMembershipTypeConfigIds: [] }))}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      {s === 'all' ? 'All' : s === 'membership' ? 'Memberships Only' : 'Shop Only'}
                    </label>
                  ))}
                </div>
              </div>

              {formData.scope === 'membership' && membershipTypes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Applicable Membership Types <span className="text-gray-500">(leave empty for all)</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {membershipTypes.filter(t => t.is_active).map(t => (
                      <label key={t.id} className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.applicableMembershipTypeConfigIds.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({ ...prev, applicableMembershipTypeConfigIds: [...prev.applicableMembershipTypeConfigIds, t.id] }));
                            } else {
                              setFormData(prev => ({ ...prev, applicableMembershipTypeConfigIds: prev.applicableMembershipTypeConfigIds.filter(id => id !== t.id) }));
                            }
                          }}
                          className="rounded border-slate-600 bg-slate-700 text-orange-600 focus:ring-orange-500"
                        />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formData.scope === 'shop' && products.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Applicable Products <span className="text-gray-500">(leave empty for all)</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {products.filter((p: any) => p.is_active).map((p: any) => (
                      <label key={p.id} className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.applicableProductIds.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({ ...prev, applicableProductIds: [...prev.applicableProductIds, p.id] }));
                            } else {
                              setFormData(prev => ({ ...prev, applicableProductIds: prev.applicableProductIds.filter(id => id !== p.id) }));
                            }
                          }}
                          className="rounded border-slate-600 bg-slate-700 text-orange-600 focus:ring-orange-500"
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Toggles */}
              <div className="flex gap-6 flex-wrap">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.newMembersOnly}
                    onChange={(e) => setFormData(prev => ({ ...prev, newMembersOnly: e.target.checked }))}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-orange-600 focus:ring-orange-500"
                  />
                  New members only
                </label>
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.status === 'active'}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.checked ? 'active' : 'inactive' }))}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-orange-600 focus:ring-orange-500"
                  />
                  Active
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingCoupon ? 'Update Coupon' : formData.quantity > 1 && !formData.useManualCode ? `Create ${formData.quantity} Coupons` : 'Create Coupon'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Coupons Table */}
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-300">Code</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-300">Discount</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-300">Scope</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-300">Uses</th>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-300">Valid Period</th>
                  <th className="px-4 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredCoupons.map((coupon) => {
                  const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
                  const isNotStarted = coupon.starts_at && new Date(coupon.starts_at) > new Date();

                  return (
                    <tr key={coupon.id} className="hover:bg-slate-750">
                      <td className="px-4 py-4">
                        <div className="font-mono text-orange-400 font-semibold">{coupon.code}</div>
                        {coupon.description && (
                          <div className="text-gray-500 text-xs mt-0.5">{coupon.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-white">
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}%`
                          : `$${Number(coupon.discount_value).toFixed(2)}`
                        }
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs font-semibold rounded-full">
                          {coupon.scope === 'all' ? 'All' : coupon.scope === 'membership' ? 'Membership' : 'Shop'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {coupon.status === 'active' && !isExpired ? (
                          <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-semibold rounded-full">
                            {isNotStarted ? 'Scheduled' : 'Active'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs font-semibold rounded-full">
                            {isExpired ? 'Expired' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-300 text-sm">
                        {coupon.times_used}{coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                      </td>
                      <td className="px-4 py-4 text-gray-400 text-sm">
                        {formatDate(coupon.starts_at)} - {formatDate(coupon.expires_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewUsages(coupon)}
                            className="p-2 hover:bg-blue-600/10 text-blue-400 rounded-lg transition-colors"
                            title="View Usage"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(coupon)}
                            className="p-2 hover:bg-orange-600/10 text-orange-400 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {coupon.status === 'active' && (
                            <button
                              onClick={() => handleDeactivate(coupon.id)}
                              className="p-2 hover:bg-red-600/10 text-red-400 rounded-lg transition-colors"
                              title="Deactivate"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredCoupons.length === 0 && (
            <div className="text-center py-12">
              <Tag className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">
                {coupons.length === 0 ? 'No coupons created yet' : 'No coupons match your filters'}
              </p>
              {coupons.length === 0 && (
                <button
                  onClick={() => { resetForm(); setShowForm(true); }}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Create Your First Coupon
                </button>
              )}
            </div>
          )}
        </div>

        {/* Usage Modal */}
        {showUsageModal && usageCoupon && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <div>
                  <h3 className="text-lg font-semibold text-white">Usage History</h3>
                  <p className="text-orange-400 font-mono">{usageCoupon.code}</p>
                </div>
                <button onClick={() => setShowUsageModal(false)} className="text-gray-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {loadingUsages ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  </div>
                ) : usages.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No usages recorded yet</p>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-400">
                        <th className="pb-2">Date</th>
                        <th className="pb-2">User / Email</th>
                        <th className="pb-2">Discount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {usages.map(u => (
                        <tr key={u.id}>
                          <td className="py-2 text-gray-300 text-sm">{formatDate(u.created_at)}</td>
                          <td className="py-2 text-white text-sm">{u.guest_email || u.user_id || '-'}</td>
                          <td className="py-2 text-green-400 text-sm">${Number(u.discount_applied).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
