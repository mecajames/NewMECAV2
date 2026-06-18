import { useState, useEffect, useRef } from 'react';
import {
  Plus, Pencil, Trash2, Loader2, AlertTriangle, ArrowLeft, Save, Calendar,
} from 'lucide-react';
import {
  AnnouncementType,
  UserRole,
  type Announcement,
  type CreateAnnouncementDto,
} from '@newmeca/shared';
import { announcementsApi } from './announcements.api-client';
import RichTextEditor from './RichTextEditor';
import AnnouncementMemberPicker, { type SelectedMember } from './AnnouncementMemberPicker';
import { styleForType, ANNOUNCEMENT_TYPE_STYLES } from './announcementStyles';
import { sanitizeAnnouncementHtml } from './sanitize';
import { profilesApi } from '@/profiles';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: UserRole.COMPETITOR, label: 'Competitors' },
  { value: UserRole.EVENT_DIRECTOR, label: 'Event Directors' },
  { value: UserRole.JUDGE, label: 'Judges' },
  { value: UserRole.RETAILER, label: 'Retailers' },
  { value: UserRole.MANUFACTURER, label: 'Manufacturers' },
  { value: UserRole.ADMIN, label: 'Admins' },
];

interface FormState {
  title: string;
  body: string;
  type: AnnouncementType;
  useTypeColors: boolean;
  panelColor: string;
  textColor: string;
  startsAt: string; // datetime-local
  endsAt: string;
  isActive: boolean;
  priority: number;
  dismissible: boolean;
  audience: {
    everyone: boolean;
    authenticated: boolean;
    activeMembers: boolean;
    staff: boolean;
    roles: UserRole[];
    members: SelectedMember[];
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function toLocalInput(d: Date | string): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emptyForm(): FormState {
  return {
    title: '',
    body: '',
    type: AnnouncementType.INFO,
    useTypeColors: true,
    panelColor: '#334155',
    textColor: '#ffffff',
    startsAt: toLocalInput(new Date()),
    endsAt: toLocalInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    isActive: true,
    priority: 0,
    dismissible: true,
    audience: {
      everyone: true,
      authenticated: false,
      activeMembers: false,
      staff: false,
      roles: [],
      members: [],
    },
  };
}

function roleLabel(role: UserRole): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

function audienceSummary(a: Announcement): string {
  const au = a.audience;
  if (!au) return 'No audience';
  if (au.everyone) return 'Everyone (public)';
  const parts: string[] = [];
  if (au.authenticated) parts.push('All logged-in');
  if (au.activeMembers) parts.push('Active members');
  if (au.staff) parts.push('Staff');
  if (au.roles?.length) parts.push(au.roles.map(roleLabel).join(', '));
  if (au.memberIds?.length) parts.push(`${au.memberIds.length} specific member(s)`);
  return parts.join(' · ') || 'No audience';
}

/** Resolve stored member ids to display names so editing shows real names, not ids. */
async function resolveMembers(ids: string[]): Promise<SelectedMember[]> {
  return Promise.all(
    ids.map(async (id): Promise<SelectedMember> => {
      try {
        const p: any = await profilesApi.getById(id);
        return {
          id,
          name:
            [p.first_name, p.last_name].filter(Boolean).join(' ') ||
            p.full_name ||
            p.email ||
            `Member ${id.slice(0, 8)}`,
          mecaId: p.meca_id,
          email: p.email,
        };
      } catch {
        return { id, name: `Member ${id.slice(0, 8)}` };
      }
    }),
  );
}

export default function AnnouncementsManager() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Bumped on each openEdit so a slow name-resolution for one announcement can't
  // clobber the members of a different one opened right after.
  const editToken = useRef(0);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setList(await announcementsApi.adminGetAll());
    } catch {
      setError('Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setError(null);
    setMode('form');
  };

  const openEdit = (a: Announcement) => {
    const token = ++editToken.current;
    const memberIds = a.audience?.memberIds ?? [];
    setForm({
      title: a.title,
      body: a.body,
      type: a.type,
      useTypeColors: !a.panelColor && !a.textColor,
      panelColor: a.panelColor || styleForType(a.type).panelColor,
      textColor: a.textColor || styleForType(a.type).textColor,
      startsAt: toLocalInput(a.startsAt),
      endsAt: toLocalInput(a.endsAt),
      isActive: a.isActive,
      priority: a.priority,
      dismissible: a.dismissible,
      audience: {
        everyone: !!a.audience?.everyone,
        authenticated: !!a.audience?.authenticated,
        activeMembers: !!a.audience?.activeMembers,
        staff: !!a.audience?.staff,
        roles: a.audience?.roles ?? [],
        // Show short id labels immediately, then resolve to real names below.
        members: memberIds.map((id) => ({ id, name: `Member ${id.slice(0, 8)}` })),
      },
    });
    setEditingId(a.id);
    setError(null);
    setMode('form');

    // Resolve the stored member ids to real names in the background.
    if (memberIds.length > 0) {
      resolveMembers(memberIds).then((resolved) => {
        if (editToken.current === token) {
          setForm((f) => ({ ...f, audience: { ...f.audience, members: resolved } }));
        }
      });
    }
  };

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));
  const patchAudience = (p: Partial<FormState['audience']>) =>
    setForm((f) => ({ ...f, audience: { ...f.audience, ...p } }));
  const toggleRole = (role: UserRole) =>
    setForm((f) => ({
      ...f,
      audience: {
        ...f.audience,
        roles: f.audience.roles.includes(role)
          ? f.audience.roles.filter((r) => r !== role)
          : [...f.audience.roles, role],
      },
    }));

  const save = async () => {
    const plainBody = form.body.replace(/<[^>]*>/g, '').trim();
    if (!form.title.trim()) return setError('Title is required.');
    if (!plainBody) return setError('Announcement message is required.');
    if (!form.startsAt || !form.endsAt) return setError('Start and end date/time are required.');
    if (new Date(form.endsAt) <= new Date(form.startsAt))
      return setError('End date must be after the start date.');
    const au = form.audience;
    const hasAudience =
      au.everyone || au.authenticated || au.activeMembers || au.staff || au.roles.length > 0 || au.members.length > 0;
    if (!hasAudience) return setError('Choose at least one audience (who can see this).');

    const dto: CreateAnnouncementDto = {
      title: form.title.trim(),
      body: sanitizeAnnouncementHtml(form.body),
      type: form.type,
      panelColor: form.useTypeColors ? null : form.panelColor,
      textColor: form.useTypeColors ? null : form.textColor,
      startsAt: new Date(form.startsAt),
      endsAt: new Date(form.endsAt),
      isActive: form.isActive,
      priority: Number(form.priority) || 0,
      dismissible: form.dismissible,
      audience: {
        everyone: au.everyone,
        // "Everyone" is public and overrides the rest, so we normalize the stored
        // record to everyone-only — no confusing everyone+roles rows on re-edit.
        authenticated: au.everyone ? false : au.authenticated,
        activeMembers: au.everyone ? false : au.activeMembers,
        staff: au.everyone ? false : au.staff,
        roles: au.everyone ? [] : au.roles,
        memberIds: au.everyone ? [] : au.members.map((m) => m.id),
      },
    };

    setSaving(true);
    setError(null);
    try {
      if (editingId) await announcementsApi.adminUpdate(editingId, dto);
      else await announcementsApi.adminCreate(dto);
      await load();
      setMode('list');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save announcement.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: Announcement) => {
    if (!window.confirm(`Delete announcement "${a.title}"? This cannot be undone.`)) return;
    setDeletingId(a.id);
    try {
      await announcementsApi.adminDelete(a.id);
      await load();
    } catch {
      setError('Failed to delete announcement.');
    } finally {
      setDeletingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Form view
  // ---------------------------------------------------------------------------
  if (mode === 'form') {
    const previewStyle = styleForType(form.type);
    const previewBg = form.useTypeColors ? previewStyle.panelColor : form.panelColor;
    const previewFg = form.useTypeColors ? previewStyle.textColor : form.textColor;
    const PreviewIcon = previewStyle.Icon;

    return (
      <div className="bg-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">
            {editingId ? 'Edit Announcement' : 'New Announcement'}
          </h3>
          <button
            onClick={() => setMode('list')}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back to list
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-300 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        {/* Live preview */}
        <div className="mb-6">
          <p className="text-xs uppercase text-gray-500 mb-2">Preview</p>
          <div style={{ backgroundColor: previewBg, color: previewFg }} className="rounded-lg">
            <div className="px-4 py-2 flex items-start gap-3 text-sm">
              <PreviewIcon className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                {form.title && <span className="font-semibold mr-2">{form.title}</span>}
                <span
                  className="[&_a]:underline [&_a]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: sanitizeAnnouncementHtml(form.body) }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              maxLength={200}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
              placeholder="e.g. Scheduled maintenance Saturday night"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Message *</label>
            <RichTextEditor value={form.body} onChange={(html) => patch({ body: html })} />
            <p className="text-gray-500 text-xs mt-1">Use the toolbar for bold/italic/underline and to insert links.</p>
          </div>

          {/* Type + colors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => patch({ type: e.target.value as AnnouncementType })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
              >
                {Object.values(AnnouncementType).map((t) => (
                  <option key={t} value={t}>
                    {ANNOUNCEMENT_TYPE_STYLES[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
              <input
                type="number"
                min={0}
                max={1000}
                value={form.priority}
                onChange={(e) => patch({ priority: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-gray-500 text-xs mt-1">Higher priority shows first when several are live.</p>
            </div>
          </div>

          {/* Color override */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.useTypeColors}
                onChange={(e) => patch({ useTypeColors: e.target.checked })}
                className="rounded border-slate-600 bg-slate-700 text-orange-500"
              />
              Use default colors for this type
            </label>
            {!form.useTypeColors && (
              <div className="flex gap-6 mt-3">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  Panel
                  <input
                    type="color"
                    value={form.panelColor}
                    onChange={(e) => patch({ panelColor: e.target.value })}
                    className="h-8 w-12 rounded bg-transparent border border-slate-600"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  Text
                  <input
                    type="color"
                    value={form.textColor}
                    onChange={(e) => patch({ textColor: e.target.value })}
                    className="h-8 w-12 rounded bg-transparent border border-slate-600"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" /> Starts
              </label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => patch({ startsAt: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" /> Ends
              </label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => patch({ endsAt: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => patch({ isActive: e.target.checked })}
                className="rounded border-slate-600 bg-slate-700 text-orange-500"
              />
              Active (uncheck to disable without deleting)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.dismissible}
                onChange={(e) => patch({ dismissible: e.target.checked })}
                className="rounded border-slate-600 bg-slate-700 text-orange-500"
              />
              Allow viewers to dismiss
            </label>
          </div>

          {/* Audience */}
          <div className="border-t border-slate-700 pt-5">
            <h4 className="text-sm font-semibold text-white mb-3">Who can see this?</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.audience.everyone}
                  onChange={(e) => patchAudience({ everyone: e.target.checked })}
                  className="rounded border-slate-600 bg-slate-700 text-orange-500" />
                Everyone (public)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.audience.authenticated}
                  onChange={(e) => patchAudience({ authenticated: e.target.checked })}
                  className="rounded border-slate-600 bg-slate-700 text-orange-500" />
                Any logged-in user
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.audience.activeMembers}
                  onChange={(e) => patchAudience({ activeMembers: e.target.checked })}
                  className="rounded border-slate-600 bg-slate-700 text-orange-500" />
                Active members
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={form.audience.staff}
                  onChange={(e) => patchAudience({ staff: e.target.checked })}
                  className="rounded border-slate-600 bg-slate-700 text-orange-500" />
                Staff
              </label>
            </div>

            {form.audience.everyone && (
              <p className="text-xs text-amber-300/80 mb-3">
                "Everyone" makes this public — the other rules below are ignored while it's checked.
              </p>
            )}

            <p className="text-xs uppercase text-gray-500 mb-2">By role</p>
            <div className="flex flex-wrap gap-3 mb-4">
              {ROLE_OPTIONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={form.audience.roles.includes(r.value)}
                    onChange={() => toggleRole(r.value)}
                    className="rounded border-slate-600 bg-slate-700 text-orange-500" />
                  {r.label}
                </label>
              ))}
            </div>

            <p className="text-xs uppercase text-gray-500 mb-2">Specific members</p>
            <AnnouncementMemberPicker
              value={form.audience.members}
              onChange={(members) => patchAudience({ members })}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-700 pt-5">
            <button
              onClick={() => setMode('list')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Save changes' : 'Create announcement'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // List view
  // ---------------------------------------------------------------------------
  const now = Date.now();
  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Announcement Banners</h3>
          <p className="text-gray-400 text-sm mt-1">
            Site-wide banners shown above the navigation bar, scheduled and audience-targeted.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> New Announcement
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No announcements yet. Click <span className="text-orange-400">New Announcement</span> to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const style = styleForType(a.type);
            const StyleIcon = style.Icon;
            const live =
              a.isActive &&
              new Date(a.startsAt).getTime() <= now &&
              new Date(a.endsAt).getTime() >= now;
            return (
              <div key={a.id} className="border border-slate-700 rounded-lg p-4 flex items-start gap-4">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: a.panelColor || style.panelColor, color: a.textColor || style.textColor }}
                >
                  <StyleIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">{a.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-gray-300">{style.label}</span>
                    {live ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Live now</span>
                    ) : a.isActive ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-gray-400">Scheduled</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-gray-500">Disabled</span>
                    )}
                    {!a.dismissible && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">Not dismissible</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    {new Date(a.startsAt).toLocaleString()} → {new Date(a.endsAt).toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">Audience: {audienceSummary(a)} · Priority {a.priority}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(a)}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-200"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(a)}
                    disabled={deletingId === a.id}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
