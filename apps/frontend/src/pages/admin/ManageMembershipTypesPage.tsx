import { useState, useEffect } from 'react';
import { membershipTypesApi } from '../../api-client/membership-types.api-client';
import { usePermissions } from '../../hooks/usePermissions';

export default function ManageMembershipTypesPage() {
  const { hasPermission, loading: permissionsLoading, isAdmin } = usePermissions();
  const [membershipTypes, setMembershipTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    durationMonths: 12,
    isActive: true,
    canOwnTeam: false,
    canJoinTeams: true,
    listedInDirectory: false,
    directoryType: '',
    hasBannerCarousel: false,
    bannerAdSlots: 0,
    maxTeamMembers: null,
    features: {},
  });

  useEffect(() => {
    // Wait for permissions to load before checking access
    if (permissionsLoading) return;

    // Allow admins or users with specific permission
    if (!isAdmin && !hasPermission('manage_membership_types')) {
      window.location.href = '/admin';
      return;
    }
    loadMembershipTypes();
  }, [permissionsLoading, isAdmin, hasPermission]);

  const loadMembershipTypes = async () => {
    try {
      const response = await membershipTypesApi.getAll();
      setMembershipTypes(response.data);
    } catch (error) {
      console.error('Failed to load membership types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      durationMonths: 12,
      isActive: true,
      canOwnTeam: false,
      canJoinTeams: true,
      listedInDirectory: false,
      directoryType: '',
      hasBannerCarousel: false,
      bannerAdSlots: 0,
      maxTeamMembers: null,
      features: {},
    });
    setCreating(true);
  };

  const handleEdit = (type: any) => {
    setFormData(type);
    setEditing(type.id);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await membershipTypesApi.update(editing, formData);
      } else {
        await membershipTypesApi.create(formData);
      }
      loadMembershipTypes();
      setEditing(null);
      setCreating(false);
    } catch (error) {
      console.error('Failed to save membership type:', error);
      alert('Failed to save membership type');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this membership type?')) return;

    try {
      await membershipTypesApi.delete(id);
      loadMembershipTypes();
    } catch (error) {
      console.error('Failed to delete membership type:', error);
      alert('Failed to delete membership type');
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setCreating(false);
  };

  if (loading) return <div className="p-8 flex items-center justify-center">
    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
  </div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={handleCreate}
          className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-semibold transition"
        >
          + Create New Membership Type
        </button>
      </div>

      {(creating || editing) && (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">
            {editing ? 'Edit' : 'Create'} Membership Type
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1 text-gray-300">Name</label>
              <input
                type="text"
                className="w-full bg-slate-700 border border-slate-600 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-medium mb-1 text-gray-300">Price ($)</label>
              <input
                type="number"
                className="w-full bg-slate-700 border border-slate-600 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
              />
            </div>

            <div className="col-span-2">
              <label className="block font-medium mb-1 text-gray-300">Description</label>
              <textarea
                className="w-full bg-slate-700 border border-slate-600 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-medium mb-1 text-gray-300">Duration (months)</label>
              <input
                type="number"
                className="w-full bg-slate-700 border border-slate-600 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={formData.durationMonths}
                onChange={(e) => setFormData({ ...formData, durationMonths: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <label className="block font-medium mb-1 text-gray-300">Max Team Members</label>
              <input
                type="number"
                className="w-full bg-slate-700 border border-slate-600 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={formData.maxTeamMembers || ''}
                onChange={(e) => setFormData({ ...formData, maxTeamMembers: e.target.value ? parseInt(e.target.value) : null })}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <label className="flex items-center text-gray-300">
              <input
                type="checkbox"
                className="mr-2 w-4 h-4"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              Active
            </label>

            <label className="flex items-center text-gray-300">
              <input
                type="checkbox"
                className="mr-2 w-4 h-4"
                checked={formData.canOwnTeam}
                onChange={(e) => setFormData({ ...formData, canOwnTeam: e.target.checked })}
              />
              Can Own Team
            </label>

            <label className="flex items-center text-gray-300">
              <input
                type="checkbox"
                className="mr-2 w-4 h-4"
                checked={formData.canJoinTeams}
                onChange={(e) => setFormData({ ...formData, canJoinTeams: e.target.checked })}
              />
              Can Join Teams
            </label>

            <label className="flex items-center text-gray-300">
              <input
                type="checkbox"
                className="mr-2 w-4 h-4"
                checked={formData.listedInDirectory}
                onChange={(e) => setFormData({ ...formData, listedInDirectory: e.target.checked })}
              />
              Listed in Directory
            </label>

            <label className="flex items-center text-gray-300">
              <input
                type="checkbox"
                className="mr-2 w-4 h-4"
                checked={formData.hasBannerCarousel}
                onChange={(e) => setFormData({ ...formData, hasBannerCarousel: e.target.checked })}
              />
              Banner Carousel
            </label>
          </div>

          {formData.listedInDirectory && (
            <div className="mt-4">
              <label className="block font-medium mb-1 text-gray-300">Directory Type</label>
              <select
                className="w-full bg-slate-700 border border-slate-600 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={formData.directoryType}
                onChange={(e) => setFormData({ ...formData, directoryType: e.target.value })}
              >
                <option value="">Select type</option>
                <option value="retail">Retail</option>
                <option value="manufacturer">Manufacturer</option>
              </select>
            </div>
          )}

          {formData.directoryType === 'manufacturer' && (
            <div className="mt-4">
              <label className="block font-medium mb-1 text-gray-300">Banner Ad Slots (1-3)</label>
              <input
                type="number"
                min="0"
                max="3"
                className="w-full bg-slate-700 border border-slate-600 p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={formData.bannerAdSlots}
                onChange={(e) => setFormData({ ...formData, bannerAdSlots: parseInt(e.target.value) })}
              />
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <button
              onClick={handleSave}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold transition"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="bg-slate-600 text-white px-6 py-2 rounded-lg hover:bg-slate-700 font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {membershipTypes.map((type) => (
          <div key={type.id} className="bg-slate-800 p-4 rounded-lg shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold text-white">{type.name}</h3>
                <p className="text-gray-400">{type.description}</p>
                <div className="mt-2 flex gap-4 text-sm flex-wrap">
                  <span className="font-medium text-orange-400">${type.price}/year</span>
                  <span className="text-gray-300">{type.durationMonths} months</span>
                  {type.canOwnTeam && <span className="text-blue-400">Can Own Team</span>}
                  {type.listedInDirectory && (
                    <span className="text-green-400">Directory: {type.directoryType}</span>
                  )}
                  {type.hasBannerCarousel && <span className="text-purple-400">Banner Carousel</span>}
                  {type.bannerAdSlots > 0 && (
                    <span className="text-orange-400">{type.bannerAdSlots} Ad Slots</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(type)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-semibold transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(type.id)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 font-semibold transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
