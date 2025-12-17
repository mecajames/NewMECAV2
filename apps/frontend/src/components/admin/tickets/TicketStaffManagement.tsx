import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Mail,
  MailX,
  Building2,
  UserCheck,
  UserX,
  Search,
  Loader2,
} from 'lucide-react';
import * as ticketAdminApi from '../../../api-client/ticket-admin.api-client';
import { TicketStaffResponse, TicketDepartmentResponse } from '@newmeca/shared';

// Permission levels (1=Staff, 2=Supervisor, 3=Admin)
const PERMISSION_STAFF = 1;
const PERMISSION_SUPERVISOR = 2;
const PERMISSION_ADMIN = 3;

const permissionLabels: Record<number, { label: string; icon: React.ReactNode; color: string }> = {
  [PERMISSION_STAFF]: { label: 'Staff', icon: <Shield className="w-4 h-4" />, color: 'text-blue-400' },
  [PERMISSION_SUPERVISOR]: { label: 'Supervisor', icon: <ShieldCheck className="w-4 h-4" />, color: 'text-yellow-400' },
  [PERMISSION_ADMIN]: { label: 'Admin', icon: <ShieldAlert className="w-4 h-4" />, color: 'text-red-400' },
};

// Profile search result type
interface ProfileSearchResult {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  meca_id?: string;
}

export function TicketStaffManagement() {
  const [staff, setStaff] = useState<TicketStaffResponse[]>([]);
  const [departments, setDepartments] = useState<TicketDepartmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // User search state for adding new staff
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<ProfileSearchResult[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [showUserSearchDropdown, setShowUserSearchDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ProfileSearchResult | null>(null);
  const userSearchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    profile_id: '',
    permission_level: 1,
    can_be_assigned_tickets: true,
    receive_email_notifications: true,
    is_active: true,
    department_ids: [] as string[],
  });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const [staffData, deptData] = await Promise.all([
        ticketAdminApi.listStaff(showInactive),
        ticketAdminApi.listDepartments(false),
      ]);
      setStaff(staffData);
      setDepartments(deptData);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [showInactive]);

  // Search for users when typing in the user search field
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setUserSearchLoading(true);
    try {
      const response = await fetch(`/api/profiles/search?q=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const results: ProfileSearchResult[] = await response.json();
        // Filter out users who are already staff
        const existingProfileIds = new Set(staff.map((s) => s.profile_id));
        const filteredResults = results.filter((r) => !existingProfileIds.has(r.id));
        setUserSearchResults(filteredResults);
      }
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setUserSearchLoading(false);
    }
  }, [staff]);

  // Debounce user search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(userSearchQuery);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [userSearchQuery, searchUsers]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userSearchRef.current && !userSearchRef.current.contains(event.target as Node)) {
        setShowUserSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectUser = (user: ProfileSearchResult) => {
    setSelectedUser(user);
    setFormData({ ...formData, profile_id: user.id });
    setUserSearchQuery('');
    setShowUserSearchDropdown(false);
    setUserSearchResults([]);
  };

  const clearSelectedUser = () => {
    setSelectedUser(null);
    setFormData({ ...formData, profile_id: '' });
  };

  const getDisplayName = (user: ProfileSearchResult) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email?.split('@')[0] || 'Unknown';
  };

  const handleCreate = async () => {
    try {
      await ticketAdminApi.createStaff({
        profile_id: formData.profile_id,
        permission_level: formData.permission_level,
        can_be_assigned_tickets: formData.can_be_assigned_tickets,
        receive_email_notifications: formData.receive_email_notifications,
        department_ids: formData.department_ids.length > 0 ? formData.department_ids : undefined,
      });
      setShowCreateForm(false);
      resetForm();
      fetchStaff();
    } catch (err) {
      console.error('Failed to create staff:', err);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await ticketAdminApi.updateStaff(id, {
        permission_level: formData.permission_level,
        can_be_assigned_tickets: formData.can_be_assigned_tickets,
        receive_email_notifications: formData.receive_email_notifications,
        is_active: formData.is_active,
      });
      // Update department assignments separately
      await ticketAdminApi.assignStaffToDepartments(id, formData.department_ids);
      setEditingId(null);
      resetForm();
      fetchStaff();
    } catch (err) {
      console.error('Failed to update staff:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await ticketAdminApi.deleteStaff(id);
      fetchStaff();
    } catch (err) {
      console.error('Failed to delete staff:', err);
    }
  };

  const startEdit = (member: TicketStaffResponse) => {
    setEditingId(member.id);
    setFormData({
      profile_id: member.profile_id,
      permission_level: member.permission_level,
      can_be_assigned_tickets: member.can_be_assigned_tickets,
      receive_email_notifications: member.receive_email_notifications,
      is_active: member.is_active,
      department_ids: member.departments?.map((d) => d.id) || [],
    });
  };

  const resetForm = () => {
    setFormData({
      profile_id: '',
      permission_level: 1,
      can_be_assigned_tickets: true,
      receive_email_notifications: true,
      is_active: true,
      department_ids: [],
    });
    setSelectedUser(null);
    setUserSearchQuery('');
    setUserSearchResults([]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowCreateForm(false);
    resetForm();
  };

  const getProfileName = (member: TicketStaffResponse) => {
    if (member.profile) {
      const { first_name, last_name, email } = member.profile;
      if (first_name || last_name) return `${first_name || ''} ${last_name || ''}`.trim();
      return email?.split('@')[0] || 'Unknown';
    }
    return 'Unknown';
  };

  const filteredStaff = staff.filter((member) => {
    if (!searchQuery) return true;
    const name = getProfileName(member).toLowerCase();
    const email = member.profile?.email?.toLowerCase() || '';
    return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Users className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Ticket Staff</h2>
            <p className="text-sm text-gray-400">Manage who can access the ticket system</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500"
            />
            Show Inactive
          </label>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Staff
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-slate-800 rounded-xl p-6 border border-green-500/30">
          <h3 className="text-white font-medium mb-4">Add Staff Member</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">User *</label>
              {selectedUser ? (
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-700 border border-green-500 rounded-lg">
                  <div className="flex-1">
                    <p className="text-white font-medium">{getDisplayName(selectedUser)}</p>
                    <p className="text-sm text-gray-400">{selectedUser.email}</p>
                    {selectedUser.meca_id && (
                      <p className="text-xs text-gray-500">MECA ID: {selectedUser.meca_id}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedUser}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative" ref={userSearchRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => {
                        setUserSearchQuery(e.target.value);
                        setShowUserSearchDropdown(true);
                      }}
                      onFocus={() => setShowUserSearchDropdown(true)}
                      placeholder="Search by name, email, or MECA ID..."
                      className="w-full pl-10 pr-10 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {userSearchLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                    )}
                  </div>
                  {showUserSearchDropdown && userSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {userSearchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-600 transition-colors border-b border-slate-600 last:border-b-0"
                        >
                          <p className="text-white font-medium">{getDisplayName(user)}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                          {user.meca_id && (
                            <p className="text-xs text-gray-500">MECA ID: {user.meca_id}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {showUserSearchDropdown && userSearchQuery.length >= 2 && !userSearchLoading && userSearchResults.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-gray-400 text-sm">
                      No users found matching "{userSearchQuery}"
                    </div>
                  )}
                  {showUserSearchDropdown && userSearchQuery.length > 0 && userSearchQuery.length < 2 && (
                    <div className="absolute z-10 w-full mt-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-gray-400 text-sm">
                      Type at least 2 characters to search
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Permission Level</label>
              <select
                value={formData.permission_level}
                onChange={(e) => setFormData({ ...formData, permission_level: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value={1}>Staff</option>
                <option value={2}>Supervisor</option>
                <option value={3}>Admin</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Departments</label>
              <div className="flex flex-wrap gap-2">
                {departments.map((dept) => (
                  <label
                    key={dept.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      formData.department_ids.includes(dept.id)
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.department_ids.includes(dept.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, department_ids: [...formData.department_ids, dept.id] });
                        } else {
                          setFormData({
                            ...formData,
                            department_ids: formData.department_ids.filter((id) => id !== dept.id),
                          });
                        }
                      }}
                      className="hidden"
                    />
                    <Building2 className="w-4 h-4" />
                    {dept.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.can_be_assigned_tickets}
                  onChange={(e) => setFormData({ ...formData, can_be_assigned_tickets: e.target.checked })}
                  className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500"
                />
                Can be assigned tickets
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.receive_email_notifications}
                  onChange={(e) => setFormData({ ...formData, receive_email_notifications: e.target.checked })}
                  className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500"
                />
                Receive email notifications
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={cancelEdit} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!formData.profile_id}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="w-4 h-4" />
              Add Staff
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search staff..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Staff List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No staff members found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Permission</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Departments</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Settings</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredStaff.map((member) => (
                <tr key={member.id} className={`${!member.is_active ? 'opacity-50' : ''}`}>
                  {editingId === member.id ? (
                    <>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white font-medium">{getProfileName(member)}</p>
                          <p className="text-sm text-gray-400">{member.profile?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={formData.permission_level}
                          onChange={(e) => setFormData({ ...formData, permission_level: parseInt(e.target.value) })}
                          className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        >
                          <option value={1}>Staff</option>
                          <option value={2}>Supervisor</option>
                          <option value={3}>Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {departments.map((dept) => (
                            <label
                              key={dept.id}
                              className={`px-2 py-1 rounded text-xs cursor-pointer ${
                                formData.department_ids.includes(dept.id)
                                  ? 'bg-green-600 text-white'
                                  : 'bg-slate-700 text-gray-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.department_ids.includes(dept.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, department_ids: [...formData.department_ids, dept.id] });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      department_ids: formData.department_ids.filter((id) => id !== dept.id),
                                    });
                                  }
                                }}
                                className="hidden"
                              />
                              {dept.name}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 text-xs text-gray-400">
                            <input
                              type="checkbox"
                              checked={formData.can_be_assigned_tickets}
                              onChange={(e) => setFormData({ ...formData, can_be_assigned_tickets: e.target.checked })}
                              className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500"
                            />
                            Assignable
                          </label>
                          <label className="flex items-center gap-2 text-xs text-gray-400">
                            <input
                              type="checkbox"
                              checked={formData.receive_email_notifications}
                              onChange={(e) =>
                                setFormData({ ...formData, receive_email_notifications: e.target.checked })
                              }
                              className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500"
                            />
                            Emails
                          </label>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="rounded bg-slate-700 border-slate-600 text-green-500 focus:ring-green-500"
                          />
                          <span className="text-sm text-gray-300">Active</span>
                        </label>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUpdate(member.id)}
                            className="p-2 text-green-400 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-2 text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white font-medium">{getProfileName(member)}</p>
                          <p className="text-sm text-gray-400">{member.profile?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-2 ${permissionLabels[member.permission_level]?.color}`}>
                          {permissionLabels[member.permission_level]?.icon}
                          {permissionLabels[member.permission_level]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {member.departments?.map((dept) => (
                            <span
                              key={dept.id}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 text-gray-300 text-xs rounded"
                            >
                              <Building2 className="w-3 h-3" />
                              {dept.name}
                              {dept.is_department_head && (
                                <span className="text-yellow-400 text-[10px]">(Head)</span>
                              )}
                            </span>
                          )) || <span className="text-gray-500 text-sm">None</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {member.can_be_assigned_tickets ? (
                            <span title="Can be assigned">
                              <UserCheck className="w-4 h-4 text-green-400" />
                            </span>
                          ) : (
                            <span title="Cannot be assigned">
                              <UserX className="w-4 h-4 text-gray-500" />
                            </span>
                          )}
                          {member.receive_email_notifications ? (
                            <span title="Receives emails">
                              <Mail className="w-4 h-4 text-blue-400" />
                            </span>
                          ) : (
                            <span title="No emails">
                              <MailX className="w-4 h-4 text-gray-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                            member.is_active
                              ? 'bg-green-500/10 text-green-400 border border-green-500'
                              : 'bg-gray-500/10 text-gray-400 border border-gray-500'
                          }`}
                        >
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(member)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default TicketStaffManagement;
