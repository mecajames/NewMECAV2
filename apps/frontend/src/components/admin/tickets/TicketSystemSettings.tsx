import { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Building2,
  Paperclip,
  Clock,
  Tag,
  Mail,
} from 'lucide-react';
import * as ticketAdminApi from '../../../api-client/ticket-admin.api-client';
import { TicketSettingsMap, TicketDepartmentResponse } from '@newmeca/shared';

export function TicketSystemSettings() {
  const [settings, setSettings] = useState<TicketSettingsMap | null>(null);
  const [departments, setDepartments] = useState<TicketDepartmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Local form state
  const [formData, setFormData] = useState<TicketSettingsMap>({
    allow_user_department_selection: false,
    allow_attachments: true,
    max_attachment_size_mb: 10,
    require_category: true,
    auto_close_resolved_days: 7,
    enable_email_notifications: false,
    default_department_id: undefined,
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [settingsData, deptData] = await Promise.all([
        ticketAdminApi.getSettingsMap(),
        ticketAdminApi.listDepartments(false),
      ]);
      setSettings(settingsData);
      setFormData(settingsData);
      setDepartments(deptData);
      setUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: keyof TicketSettingsMap, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save each changed setting
      const settingEntries: [keyof TicketSettingsMap, any][] = [
        ['allow_user_department_selection', formData.allow_user_department_selection],
        ['allow_attachments', formData.allow_attachments],
        ['max_attachment_size_mb', formData.max_attachment_size_mb],
        ['require_category', formData.require_category],
        ['auto_close_resolved_days', formData.auto_close_resolved_days],
        ['enable_email_notifications', formData.enable_email_notifications],
      ];

      for (const [key, value] of settingEntries) {
        if (settings && value !== settings[key]) {
          await ticketAdminApi.updateSetting(key, String(value));
        }
      }

      // Handle default_department_id separately (optional)
      if (formData.default_department_id !== settings?.default_department_id) {
        await ticketAdminApi.updateSetting(
          'default_department_id',
          formData.default_department_id || ''
        );
      }

      await fetchSettings();
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const ToggleSwitch = ({
    checked,
    onChange,
    label,
    description,
    icon,
  }: {
    checked: boolean;
    onChange: (value: boolean) => void;
    label: string;
    description: string;
    icon: React.ReactNode;
  }) => (
    <div className="flex items-start justify-between p-4 bg-slate-900/50 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-slate-800 rounded-lg text-gray-400">{icon}</div>
        <div>
          <p className="text-white font-medium">{label}</p>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`flex-shrink-0 ${checked ? 'text-green-400' : 'text-gray-500'}`}
      >
        {checked ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <Settings className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Ticket System Settings</h2>
            <p className="text-sm text-gray-400">Configure global ticket system behavior</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={!unsavedChanges || saving}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {unsavedChanges && (
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
          <Settings className="w-4 h-4" />
          You have unsaved changes
        </div>
      )}

      {/* Settings Grid */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
        <h3 className="text-white font-medium mb-4">General Settings</h3>

        <ToggleSwitch
          checked={formData.allow_user_department_selection}
          onChange={(value) => handleChange('allow_user_department_selection', value)}
          label="Allow User Department Selection"
          description="Let users choose which department to submit tickets to. If disabled, tickets will be automatically routed."
          icon={<Building2 className="w-5 h-5" />}
        />

        <ToggleSwitch
          checked={formData.require_category}
          onChange={(value) => handleChange('require_category', value)}
          label="Require Category"
          description="Require users to select a category when creating a ticket."
          icon={<Tag className="w-5 h-5" />}
        />

        <ToggleSwitch
          checked={formData.enable_email_notifications}
          onChange={(value) => handleChange('enable_email_notifications', value)}
          label="Email Notifications"
          description="Send email notifications to staff when tickets are created or updated."
          icon={<Mail className="w-5 h-5" />}
        />

        {/* Default Department */}
        <div className="p-4 bg-slate-900/50 rounded-lg">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-slate-800 rounded-lg text-gray-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-medium">Default Department</p>
              <p className="text-sm text-gray-400 mt-1">
                Tickets will be assigned to this department if no routing rule matches.
              </p>
            </div>
          </div>
          <select
            value={formData.default_department_id || ''}
            onChange={(e) => handleChange('default_department_id', e.target.value || undefined)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">No default</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name} {dept.is_default && '(Current Default)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Attachments Settings */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
        <h3 className="text-white font-medium mb-4">Attachment Settings</h3>

        <ToggleSwitch
          checked={formData.allow_attachments}
          onChange={(value) => handleChange('allow_attachments', value)}
          label="Allow Attachments"
          description="Let users attach files to tickets and comments."
          icon={<Paperclip className="w-5 h-5" />}
        />

        {formData.allow_attachments && (
          <div className="p-4 bg-slate-900/50 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-slate-800 rounded-lg text-gray-400">
                <Paperclip className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-medium">Maximum File Size</p>
                <p className="text-sm text-gray-400 mt-1">Maximum size for uploaded attachments in megabytes.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="50"
                value={formData.max_attachment_size_mb}
                onChange={(e) => handleChange('max_attachment_size_mb', parseInt(e.target.value) || 10)}
                className="w-24 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-gray-400">MB</span>
            </div>
          </div>
        )}
      </div>

      {/* Auto-Close Settings */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
        <h3 className="text-white font-medium mb-4">Automation</h3>

        <div className="p-4 bg-slate-900/50 rounded-lg">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-slate-800 rounded-lg text-gray-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-medium">Auto-Close Resolved Tickets</p>
              <p className="text-sm text-gray-400 mt-1">
                Automatically close tickets that have been resolved for the specified number of days.
                Set to 0 to disable auto-close.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              max="365"
              value={formData.auto_close_resolved_days}
              onChange={(e) => handleChange('auto_close_resolved_days', parseInt(e.target.value) || 0)}
              className="w-24 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <span className="text-gray-400">days after resolution</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TicketSystemSettings;
