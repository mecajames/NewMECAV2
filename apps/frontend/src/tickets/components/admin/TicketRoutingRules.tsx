import { useState, useEffect } from 'react';
import {
  Route,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Building2,
  User,
  Tag,
  FileText,
  AlertCircle,
  Play,
} from 'lucide-react';
import * as ticketAdminApi from '../../ticket-admin.api-client';
import { TicketRoutingRuleResponse, TicketDepartmentResponse, TicketStaffResponse } from '@newmeca/shared';

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'text-blue-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'critical', label: 'Critical', color: 'text-red-400' },
];

const categoryOptions = [
  { value: 'general', label: 'General' },
  { value: 'membership', label: 'Membership' },
  { value: 'event_registration', label: 'Event Registration' },
  { value: 'payment', label: 'Payment' },
  { value: 'technical', label: 'Technical' },
  { value: 'competition_results', label: 'Competition Results' },
  { value: 'event_hosting', label: 'Event Hosting' },
  { value: 'account', label: 'Account' },
  { value: 'other', label: 'Other' },
];

export function TicketRoutingRules() {
  const [rules, setRules] = useState<TicketRoutingRuleResponse[]>([]);
  const [departments, setDepartments] = useState<TicketDepartmentResponse[]>([]);
  const [staff, setStaff] = useState<TicketStaffResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  // Test routing state
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    category: 'general',
    user_membership_status: '',
  });
  const [testResult, setTestResult] = useState<ticketAdminApi.TestRoutingResult | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    priority: 0,
    conditions: {
      category: '',
      keywords: [] as string[],
      user_membership_status: '',
      title_contains: '',
      description_contains: '',
    },
    assign_to_department_id: '',
    assign_to_staff_id: '',
    set_priority: '',
  });
  const [keywordInput, setKeywordInput] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rulesData, deptData, staffData] = await Promise.all([
        ticketAdminApi.listRoutingRules(showInactive),
        ticketAdminApi.listDepartments(false),
        ticketAdminApi.listStaff(false),
      ]);
      setRules(rulesData);
      setDepartments(deptData);
      setStaff(staffData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [showInactive]);

  const handleCreate = async () => {
    try {
      const conditions: any = {};
      if (formData.conditions.category) conditions.category = formData.conditions.category;
      if (formData.conditions.keywords.length > 0) conditions.keywords = formData.conditions.keywords;
      if (formData.conditions.user_membership_status) conditions.user_membership_status = formData.conditions.user_membership_status;
      if (formData.conditions.title_contains) conditions.title_contains = formData.conditions.title_contains;
      if (formData.conditions.description_contains) conditions.description_contains = formData.conditions.description_contains;

      await ticketAdminApi.createRoutingRule({
        name: formData.name,
        description: formData.description || undefined,
        is_active: formData.is_active,
        priority: formData.priority,
        conditions,
        assign_to_department_id: formData.assign_to_department_id || undefined,
        assign_to_staff_id: formData.assign_to_staff_id || undefined,
        set_priority: formData.set_priority as any || undefined,
      });
      setShowCreateForm(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Failed to create rule:', err);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const conditions: any = {};
      if (formData.conditions.category) conditions.category = formData.conditions.category;
      if (formData.conditions.keywords.length > 0) conditions.keywords = formData.conditions.keywords;
      if (formData.conditions.user_membership_status) conditions.user_membership_status = formData.conditions.user_membership_status;
      if (formData.conditions.title_contains) conditions.title_contains = formData.conditions.title_contains;
      if (formData.conditions.description_contains) conditions.description_contains = formData.conditions.description_contains;

      await ticketAdminApi.updateRoutingRule(id, {
        name: formData.name,
        description: formData.description || undefined,
        is_active: formData.is_active,
        priority: formData.priority,
        conditions,
        assign_to_department_id: formData.assign_to_department_id || null,
        assign_to_staff_id: formData.assign_to_staff_id || null,
        set_priority: formData.set_priority as any || null,
      });
      setEditingId(null);
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Failed to update rule:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this routing rule?')) return;
    try {
      await ticketAdminApi.deleteRoutingRule(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleTestRouting = async () => {
    try {
      const result = await ticketAdminApi.testRouting(testData);
      setTestResult(result);
    } catch (err) {
      console.error('Failed to test routing:', err);
    }
  };

  const startEdit = (rule: TicketRoutingRuleResponse) => {
    setEditingId(rule.id);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      is_active: rule.is_active,
      priority: rule.priority,
      conditions: {
        category: rule.conditions.category || '',
        keywords: rule.conditions.keywords || [],
        user_membership_status: rule.conditions.user_membership_status || '',
        title_contains: rule.conditions.title_contains || '',
        description_contains: rule.conditions.description_contains || '',
      },
      assign_to_department_id: rule.assign_to_department_id || '',
      assign_to_staff_id: rule.assign_to_staff_id || '',
      set_priority: rule.set_priority || '',
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true,
      priority: 0,
      conditions: {
        category: '',
        keywords: [],
        user_membership_status: '',
        title_contains: '',
        description_contains: '',
      },
      assign_to_department_id: '',
      assign_to_staff_id: '',
      set_priority: '',
    });
    setKeywordInput('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowCreateForm(false);
    resetForm();
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.conditions.keywords.includes(keywordInput.trim())) {
      setFormData({
        ...formData,
        conditions: {
          ...formData.conditions,
          keywords: [...formData.conditions.keywords, keywordInput.trim()],
        },
      });
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      conditions: {
        ...formData.conditions,
        keywords: formData.conditions.keywords.filter((k) => k !== keyword),
      },
    });
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRules(newExpanded);
  };

  const getDepartmentName = (id: string | null) => {
    if (!id) return null;
    return departments.find((d) => d.id === id)?.name || 'Unknown';
  };

  const getStaffName = (id: string | null) => {
    if (!id) return null;
    const member = staff.find((s) => s.id === id);
    if (!member) return 'Unknown';
    return member.profile?.first_name || member.profile?.email?.split('@')[0] || 'Unknown';
  };

  const renderFormFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Rule name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Priority (higher = checked first)</label>
        <input
          type="number"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          rows={2}
        />
      </div>

      {/* Conditions */}
      <div className="md:col-span-2 p-4 bg-slate-900/50 rounded-lg">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          Conditions (any match triggers this rule)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Category</label>
            <select
              value={formData.conditions.category}
              onChange={(e) => setFormData({ ...formData, conditions: { ...formData.conditions, category: e.target.value } })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="">Any category</option>
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">User Membership Status</label>
            <select
              value={formData.conditions.user_membership_status}
              onChange={(e) => setFormData({ ...formData, conditions: { ...formData.conditions, user_membership_status: e.target.value } })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="">Any status</option>
              <option value="active">Active Member</option>
              <option value="expired">Expired Member</option>
              <option value="none">Non-Member</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title Contains</label>
            <input
              type="text"
              value={formData.conditions.title_contains}
              onChange={(e) => setFormData({ ...formData, conditions: { ...formData.conditions, title_contains: e.target.value } })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              placeholder="Text to match in title"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description Contains</label>
            <input
              type="text"
              value={formData.conditions.description_contains}
              onChange={(e) => setFormData({ ...formData, conditions: { ...formData.conditions, description_contains: e.target.value } })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              placeholder="Text to match in description"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1">Keywords</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                placeholder="Add keyword..."
              />
              <button
                type="button"
                onClick={addKeyword}
                className="px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.conditions.keywords.map((kw) => (
                <span key={kw} className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-600/20 text-cyan-400 text-sm rounded">
                  {kw}
                  <button onClick={() => removeKeyword(kw)} className="hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="md:col-span-2 p-4 bg-slate-900/50 rounded-lg">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <Route className="w-4 h-4 text-cyan-400" />
          Actions (when rule matches)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Assign to Department</label>
            <select
              value={formData.assign_to_department_id}
              onChange={(e) => setFormData({ ...formData, assign_to_department_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="">No change</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Assign to Staff</label>
            <select
              value={formData.assign_to_staff_id}
              onChange={(e) => setFormData({ ...formData, assign_to_staff_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="">No change</option>
              {staff.filter((s) => s.can_be_assigned_tickets).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.profile?.first_name || s.profile?.email?.split('@')[0]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Set Priority</label>
            <select
              value={formData.set_priority}
              onChange={(e) => setFormData({ ...formData, set_priority: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="">No change</option>
              {priorityOptions.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500"
        />
        <label className="text-sm text-gray-300">Active</label>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <Route className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Routing Rules</h2>
            <p className="text-sm text-gray-400">Automatic ticket assignment based on conditions</p>
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
            onClick={() => setShowTestPanel(!showTestPanel)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showTestPanel ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            <Play className="w-4 h-4" />
            Test
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Test Panel */}
      {showTestPanel && (
        <div className="bg-slate-800 rounded-xl p-6 border border-cyan-500/30">
          <h3 className="text-white font-medium mb-4">Test Routing Rules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Title</label>
              <input
                type="text"
                value={testData.title}
                onChange={(e) => setTestData({ ...testData, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                placeholder="Ticket title"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <select
                value={testData.category}
                onChange={(e) => setTestData({ ...testData, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea
                value={testData.description}
                onChange={(e) => setTestData({ ...testData, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                rows={2}
                placeholder="Ticket description"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">User Membership Status</label>
              <select
                value={testData.user_membership_status}
                onChange={(e) => setTestData({ ...testData, user_membership_status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              >
                <option value="">None</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="none">Non-Member</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleTestRouting}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500"
              >
                <Play className="w-4 h-4" />
                Run Test
              </button>
            </div>
          </div>
          {testResult && (
            <div className={`mt-4 p-4 rounded-lg ${testResult.matched ? 'bg-green-500/10 border border-green-500/30' : 'bg-gray-500/10 border border-gray-500/30'}`}>
              {testResult.matched ? (
                <div className="space-y-2">
                  <p className="text-green-400 font-medium">Matched: {testResult.rule_name}</p>
                  {testResult.department_id && (
                    <p className="text-gray-300 text-sm">Department: {getDepartmentName(testResult.department_id)}</p>
                  )}
                  {testResult.staff_id && (
                    <p className="text-gray-300 text-sm">Staff: {getStaffName(testResult.staff_id)}</p>
                  )}
                  {testResult.priority && (
                    <p className="text-gray-300 text-sm">Priority: {testResult.priority}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">No routing rule matched</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-slate-800 rounded-xl p-6 border border-cyan-500/30">
          <h3 className="text-white font-medium mb-4">New Routing Rule</h3>
          {renderFormFields()}
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={cancelEdit} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!formData.name}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="w-4 h-4" />
              Create
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12">
            <Route className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No routing rules configured</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {rules.map((rule) => (
              <div key={rule.id} className={`${!rule.is_active ? 'opacity-50' : ''}`}>
                {editingId === rule.id ? (
                  <div className="p-6">
                    {renderFormFields()}
                    <div className="flex justify-end gap-2 mt-4">
                      <button onClick={cancelEdit} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdate(rule.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => toggleExpand(rule.id)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          {expandedRules.has(rule.id) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Priority: {rule.priority}</span>
                            <h4 className="text-white font-medium">{rule.name}</h4>
                          </div>
                          {rule.description && (
                            <p className="text-sm text-gray-400 mt-1">{rule.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          rule.is_active
                            ? 'bg-green-500/10 text-green-400 border border-green-500'
                            : 'bg-gray-500/10 text-gray-400 border border-gray-500'
                        }`}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => startEdit(rule)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {expandedRules.has(rule.id) && (
                      <div className="mt-4 pl-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <h5 className="text-xs font-medium text-gray-400 uppercase mb-2">Conditions</h5>
                          <div className="space-y-1 text-sm">
                            {rule.conditions.category && (
                              <div className="flex items-center gap-2 text-gray-300">
                                <Tag className="w-3 h-3" />
                                Category: {rule.conditions.category.replace(/_/g, ' ')}
                              </div>
                            )}
                            {rule.conditions.title_contains && (
                              <div className="flex items-center gap-2 text-gray-300">
                                <FileText className="w-3 h-3" />
                                Title contains: {rule.conditions.title_contains}
                              </div>
                            )}
                            {rule.conditions.description_contains && (
                              <div className="flex items-center gap-2 text-gray-300">
                                <FileText className="w-3 h-3" />
                                Description contains: {rule.conditions.description_contains}
                              </div>
                            )}
                            {rule.conditions.user_membership_status && (
                              <div className="flex items-center gap-2 text-gray-300">
                                <User className="w-3 h-3" />
                                Membership: {rule.conditions.user_membership_status}
                              </div>
                            )}
                            {rule.conditions.keywords && rule.conditions.keywords.length > 0 && (
                              <div className="flex items-start gap-2 text-gray-300">
                                <Tag className="w-3 h-3 mt-1" />
                                <div className="flex flex-wrap gap-1">
                                  {rule.conditions.keywords.map((kw) => (
                                    <span key={kw} className="px-2 py-0.5 bg-cyan-600/20 text-cyan-400 text-xs rounded">
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <h5 className="text-xs font-medium text-gray-400 uppercase mb-2">Actions</h5>
                          <div className="space-y-1 text-sm">
                            {rule.assign_to_department_id && (
                              <div className="flex items-center gap-2 text-gray-300">
                                <Building2 className="w-3 h-3" />
                                Assign to: {getDepartmentName(rule.assign_to_department_id)}
                              </div>
                            )}
                            {rule.assign_to_staff_id && (
                              <div className="flex items-center gap-2 text-gray-300">
                                <User className="w-3 h-3" />
                                Assign to: {getStaffName(rule.assign_to_staff_id)}
                              </div>
                            )}
                            {rule.set_priority && (
                              <div className="flex items-center gap-2 text-gray-300">
                                <AlertCircle className="w-3 h-3" />
                                Set priority: {rule.set_priority}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketRoutingRules;
