import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign, Eye, EyeOff, Star, Globe, GlobeLock } from 'lucide-react';
import {
  membershipTypeConfigsApi,
  MembershipTypeConfig,
  MembershipCategory,
  ManufacturerTier,
  CreateMembershipTypeConfigDto,
  UpdateMembershipTypeConfigDto,
} from '@/membership-type-configs';

export default function MembershipTypeManagement() {
  const [configs, setConfigs] = useState<MembershipTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<MembershipTypeConfig | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(true);

  const [formData, setFormData] = useState<CreateMembershipTypeConfigDto>({
    name: '',
    description: '',
    category: MembershipCategory.COMPETITOR,
    tier: undefined,
    price: 0,
    teamAddonPrice: undefined,
    includesTeam: false,
    currency: 'USD',
    benefits: [],
    isActive: true,
    isFeatured: false,
    showOnPublicSite: true,
    isUpgradeOnly: false,
    displayOrder: 0,
  });

  const [benefitInput, setBenefitInput] = useState('');

  useEffect(() => {
    fetchConfigs();
  }, [includeInactive]);

  const fetchConfigs = async () => {
    try {
      const data = await membershipTypeConfigsApi.getAll(includeInactive);
      setConfigs(data);
    } catch (error) {
      console.error('Error fetching membership configs:', error);
      alert('Failed to load membership configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingConfig) {
        await membershipTypeConfigsApi.update(editingConfig.id, formData as UpdateMembershipTypeConfigDto);
      } else {
        await membershipTypeConfigsApi.create(formData);
      }
      resetForm();
      fetchConfigs();
    } catch (error: any) {
      alert('Error saving membership configuration: ' + error.message);
    }
  };

  const handleEdit = (config: MembershipTypeConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      description: config.description,
      category: config.category,
      tier: config.tier,
      price: config.price,
      teamAddonPrice: config.teamAddonPrice,
      includesTeam: config.includesTeam || false,
      currency: config.currency || 'USD',
      benefits: config.benefits || [],
      requiredFields: config.requiredFields,
      optionalFields: config.optionalFields,
      isActive: config.isActive,
      isFeatured: config.isFeatured,
      showOnPublicSite: config.showOnPublicSite,
      isUpgradeOnly: config.isUpgradeOnly || false,
      displayOrder: config.displayOrder,
      stripePriceId: config.stripePriceId,
      stripeProductId: config.stripeProductId,
      quickbooksItemId: config.quickbooksItemId,
      quickbooksAccountId: config.quickbooksAccountId,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this membership type configuration?')) {
      return;
    }

    try {
      await membershipTypeConfigsApi.delete(id);
      fetchConfigs();
    } catch (error: any) {
      alert('Error deleting membership configuration: ' + error.message);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await membershipTypeConfigsApi.toggleActive(id);
      fetchConfigs();
    } catch (error: any) {
      alert('Error toggling active status: ' + error.message);
    }
  };


  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: MembershipCategory.COMPETITOR,
      tier: undefined,
      price: 0,
      teamAddonPrice: undefined,
      includesTeam: false,
      currency: 'USD',
      benefits: [],
      isActive: true,
      isFeatured: false,
      showOnPublicSite: true,
      isUpgradeOnly: false,
      displayOrder: 0,
    });
    setEditingConfig(null);
    setShowForm(false);
    setBenefitInput('');
  };

  // Handle category change - auto-set showOnPublicSite for manufacturers
  const handleCategoryChange = (category: MembershipCategory) => {
    const isManufacturer = category === MembershipCategory.MANUFACTURER;
    setFormData({
      ...formData,
      category,
      tier: isManufacturer ? ManufacturerTier.BRONZE : undefined,
      showOnPublicSite: !isManufacturer,
    });
  };

  const addBenefit = () => {
    if (benefitInput.trim()) {
      setFormData({
        ...formData,
        benefits: [...(formData.benefits || []), benefitInput.trim()],
      });
      setBenefitInput('');
    }
  };

  const removeBenefit = (index: number) => {
    const newBenefits = [...(formData.benefits || [])];
    newBenefits.splice(index, 1);
    setFormData({ ...formData, benefits: newBenefits });
  };

  const getCategoryLabel = (category: MembershipCategory): string => {
    const labels = {
      [MembershipCategory.COMPETITOR]: 'Competitor',
      [MembershipCategory.TEAM]: 'Team',
      [MembershipCategory.RETAIL]: 'Retailer',
      [MembershipCategory.MANUFACTURER]: 'Manufacturer',
    };
    return labels[category];
  };

  const getTierLabel = (tier?: ManufacturerTier): string => {
    if (!tier) return '-';
    const labels = {
      [ManufacturerTier.BRONZE]: 'Bronze',
      [ManufacturerTier.SILVER]: 'Silver',
      [ManufacturerTier.GOLD]: 'Gold',
    };
    return labels[tier];
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex gap-4 flex-wrap">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create New Membership Type
        </button>
        <label className="flex items-center gap-2 px-6 py-3 bg-slate-700 rounded-lg text-white cursor-pointer">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="w-5 h-5 rounded border-slate-600 bg-slate-600 text-orange-600 focus:ring-orange-500"
          />
          <span>Show Inactive</span>
        </label>
      </div>

      {showForm && (
        <div className="bg-slate-800 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            {editingConfig ? 'Edit Membership Type' : 'Create New Membership Type'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Annual Competitor Membership"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => handleCategoryChange(e.target.value as MembershipCategory)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value={MembershipCategory.COMPETITOR}>Competitor</option>
                  <option value={MembershipCategory.TEAM}>Team</option>
                  <option value={MembershipCategory.RETAIL}>Retailer</option>
                  <option value={MembershipCategory.MANUFACTURER}>Manufacturer</option>
                </select>
              </div>

              {formData.category === MembershipCategory.MANUFACTURER && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tier *
                  </label>
                  <select
                    required
                    value={formData.tier || ManufacturerTier.BRONZE}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value as ManufacturerTier })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value={ManufacturerTier.BRONZE}>Bronze</option>
                    <option value={ManufacturerTier.SILVER}>Silver</option>
                    <option value={ManufacturerTier.GOLD}>Gold</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Price *
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.currency || 'USD'}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-24 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="USD">USD</option>
                    <option value="CAD">CAD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    placeholder="50.00"
                    className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Team Add-on Price - only for Competitor category */}
              {formData.category === MembershipCategory.COMPETITOR && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Team Add-on Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.teamAddonPrice || ''}
                    onChange={(e) => setFormData({ ...formData, teamAddonPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="25.00 (optional)"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Price to add team functionality to this membership</p>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this membership type"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Benefits
                </label>
                <div className="space-y-2">
                  {formData.benefits && formData.benefits.map((benefit, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                        {benefit}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBenefit(index)}
                        className="p-2 hover:bg-red-600/10 text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={benefitInput}
                      onChange={(e) => setBenefitInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addBenefit();
                        }
                      }}
                      placeholder="Add a benefit"
                      className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={addBenefit}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-orange-600 focus:ring-orange-500"
                />
                <span>Active</span>
              </label>

              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-orange-600 focus:ring-orange-500"
                />
                <span>Featured</span>
              </label>

              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showOnPublicSite}
                  onChange={(e) => setFormData({ ...formData, showOnPublicSite: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-orange-600 focus:ring-orange-500"
                />
                <span>Show on Public Site</span>
              </label>

              <label className="flex items-center gap-2 text-gray-300 cursor-pointer" title="When checked, this membership includes team creation automatically (e.g., Competitor w/Team)">
                <input
                  type="checkbox"
                  checked={formData.includesTeam || false}
                  onChange={(e) => setFormData({ ...formData, includesTeam: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-green-600 focus:ring-green-500"
                />
                <span>Includes Team</span>
              </label>

              <label className="flex items-center gap-2 text-gray-300 cursor-pointer" title="When checked, this membership type only shows as an upgrade option (not on main membership page or admin create)">
                <input
                  type="checkbox"
                  checked={formData.isUpgradeOnly || false}
                  onChange={(e) => setFormData({ ...formData, isUpgradeOnly: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500"
                />
                <span>Upgrade Only</span>
              </label>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
              >
                {editingConfig ? 'Update Membership Type' : 'Create Membership Type'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Category</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Tier</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Price</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Visibility</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {configs.map((config) => (
                <tr key={config.id} className="hover:bg-slate-750">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-white font-semibold flex items-center gap-2">
                        {config.name}
                        {config.isFeatured && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      {config.description && (
                        <div className="text-gray-400 text-sm">{config.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{getCategoryLabel(config.category)}</td>
                  <td className="px-6 py-4 text-gray-300">{getTierLabel(config.tier)}</td>
                  <td className="px-6 py-4 text-gray-300 font-semibold">
                    ${config.price.toFixed(2)} {config.currency}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full w-fit ${
                        config.showOnPublicSite
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-purple-500/10 text-purple-400'
                      }`}
                    >
                      {config.showOnPublicSite ? (
                        <><Globe className="h-3 w-3" /> Public</>
                      ) : (
                        <><GlobeLock className="h-3 w-3" /> Admin Only</>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        config.isActive
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-gray-500/10 text-gray-400'
                      }`}
                    >
                      {config.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(config.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          config.isActive
                            ? 'hover:bg-gray-600/10 text-gray-400'
                            : 'hover:bg-green-600/10 text-green-400'
                        }`}
                        title={config.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {config.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleEdit(config)}
                        className="p-2 hover:bg-orange-600/10 text-orange-400 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="p-2 hover:bg-red-600/10 text-red-400 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {configs.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No membership type configurations found</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              Create Your First Config
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
