import { useState, useEffect, useRef } from 'react';
import {
  UserCheck,
  Users,
  Building2,
  ChevronDown,
  Check,
  Loader2,
  EyeOff,
  AlertTriangle,
  Tags,
} from 'lucide-react';
import * as ticketAdminApi from '../../ticket-admin.api-client';
import { listCategories, updateCategory } from '../../ticket-categories.api-client';
import { reportError } from './error-helper';
import { TicketDepartmentResponse, TicketStaffResponse, TicketCategoryConfig } from '@newmeca/shared';

type SaveState = 'saving' | 'saved' | undefined;

function staffDisplayName(member: TicketStaffResponse): string {
  const p = member.profile;
  if (!p) return 'Unknown';
  if (p.first_name || p.last_name) return `${p.first_name || ''} ${p.last_name || ''}`.trim();
  return p.email?.split('@')[0] || 'Unknown';
}

/** Small inline save-state indicator shown next to each control. */
function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'saving') return <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />;
  if (state === 'saved') return <Check className="w-4 h-4 text-green-400" />;
  return null;
}

/** Multi-select dropdown of staff members with checkboxes. */
function StaffMultiSelect({
  staff,
  selectedIds,
  onToggle,
}: {
  staff: TicketStaffResponse[];
  selectedIds: string[];
  onToggle: (staffId: string, checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedNames = staff
    .filter((s) => selectedIds.includes(s.id))
    .map(staffDisplayName);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-left hover:border-slate-500 transition-colors"
      >
        <span className={selectedNames.length ? 'text-white' : 'text-gray-400'}>
          {selectedNames.length ? selectedNames.join(', ') : 'No staff assigned'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {staff.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">No active staff members</p>
          ) : (
            staff.map((member) => {
              const checked = selectedIds.includes(member.id);
              return (
                <label
                  key={member.id}
                  className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-slate-600 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onToggle(member.id, e.target.checked)}
                    className="rounded bg-slate-800 border-slate-500 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-white">{staffDisplayName(member)}</span>
                  <span className="text-xs text-gray-400 truncate">{member.profile?.email}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One-stop assignment configuration: per department, pick which staff work it
 * (multi-select) and who new tickets auto-assign to; per category, an optional
 * auto-assign override. This is the simple replacement for digging through
 * routing rules and the per-staff department checkboxes.
 */
export function TicketAssignments() {
  const [departments, setDepartments] = useState<TicketDepartmentResponse[]>([]);
  const [staff, setStaff] = useState<TicketStaffResponse[]>([]);
  const [categories, setCategories] = useState<TicketCategoryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const savedTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptData, staffData, catData] = await Promise.all([
        ticketAdminApi.listDepartments(false),
        ticketAdminApi.listStaff(false),
        listCategories(),
      ]);
      setDepartments(deptData);
      setStaff(staffData);
      setCategories(catData.filter((c) => c.is_active));
    } catch (err) {
      reportError(err, 'load assignment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timers = savedTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  const markSaving = (key: string) => setSaveStates((s) => ({ ...s, [key]: 'saving' }));
  const markSaved = (key: string) => {
    setSaveStates((s) => ({ ...s, [key]: 'saved' }));
    if (savedTimers.current[key]) clearTimeout(savedTimers.current[key]);
    savedTimers.current[key] = setTimeout(() => {
      setSaveStates((s) => ({ ...s, [key]: undefined }));
    }, 2000);
  };
  const markFailed = (key: string) => setSaveStates((s) => ({ ...s, [key]: undefined }));

  // Staff working a department, derived from each staff member's department list.
  const staffIdsForDepartment = (deptId: string): string[] =>
    staff.filter((s) => s.departments?.some((d) => d.id === deptId)).map((s) => s.id);

  const assignableStaff = staff.filter((s) => s.can_be_assigned_tickets);

  const handleToggleDepartmentStaff = async (deptId: string, staffId: string, checked: boolean) => {
    const current = staffIdsForDepartment(deptId);
    const next = checked ? [...current, staffId] : current.filter((id) => id !== staffId);
    const key = `${deptId}:staff`;
    markSaving(key);
    try {
      const refreshed = await ticketAdminApi.setDepartmentStaff(deptId, next);
      setStaff(refreshed);
      markSaved(key);
    } catch (err) {
      markFailed(key);
      reportError(err, 'update department staff');
    }
  };

  const handleDepartmentAssignee = async (deptId: string, profileId: string) => {
    const key = `${deptId}:auto`;
    markSaving(key);
    try {
      await ticketAdminApi.updateDepartment(deptId, { default_assignee_id: profileId || null });
      setDepartments((deps) =>
        deps.map((d) => (d.id === deptId ? { ...d, default_assignee_id: profileId || null } : d)),
      );
      markSaved(key);
    } catch (err) {
      markFailed(key);
      reportError(err, 'update department auto-assignee');
    }
  };

  const handleCategoryAssignee = async (catId: string, profileId: string) => {
    const key = `cat:${catId}`;
    markSaving(key);
    try {
      await updateCategory(catId, { default_assignee_id: profileId || null });
      setCategories((cats) =>
        cats.map((c) => (c.id === catId ? { ...c, default_assignee_id: profileId || null } : c)),
      );
      markSaved(key);
    } catch (err) {
      markFailed(key);
      reportError(err, 'update category auto-assignee');
    }
  };

  const renderAssigneeSelect = (
    value: string,
    onChange: (profileId: string) => void,
    emptyLabel: string,
  ) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
    >
      <option value="">{emptyLabel}</option>
      {assignableStaff.map((s) => (
        <option key={s.id} value={s.profile_id}>
          {staffDisplayName(s)}
        </option>
      ))}
    </select>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-500/10 rounded-lg">
          <UserCheck className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Support Assignments</h2>
          <p className="text-sm text-gray-400">
            For each department, choose who works it and who new tickets are automatically assigned to.
            Changes save immediately.
          </p>
        </div>
      </div>

      {departments.map((dept) => {
        const deptStaffIds = staffIdsForDepartment(dept.id);
        const deptCategories = categories
          .filter((c) => c.department_id === dept.id)
          .sort((a, b) => a.display_order - b.display_order || a.label.localeCompare(b.label));
        const hasAssignee = !!dept.default_assignee_id;
        // Show what "Department default" resolves to, so the category dropdowns
        // are never a guessing game.
        const deptAssignee = staff.find((s) => s.profile_id === dept.default_assignee_id);
        const deptDefaultLabel = !dept.default_assignee_id
          ? 'Department default (nobody)'
          : deptAssignee
            ? `Department default (${staffDisplayName(deptAssignee)})`
            : 'Department default';

        return (
          <div key={dept.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            {/* Department header */}
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-white font-medium">{dept.name}</h3>
              {dept.is_private && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 text-gray-400 text-xs rounded-full">
                  <EyeOff className="w-3 h-3" />
                  Hidden from form
                </span>
              )}
              {dept.is_default && (
                <span className="px-2 py-0.5 bg-cyan-600/20 text-cyan-400 text-xs rounded-full">
                  Fallback department
                </span>
              )}
              {!hasAssignee && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-400 text-xs rounded-full"
                  title="New tickets in this department will stay unassigned"
                >
                  <AlertTriangle className="w-3 h-3" />
                  No auto-assignee
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                  <Users className="w-3.5 h-3.5" />
                  Support staff for this department
                  <SaveIndicator state={saveStates[`${dept.id}:staff`]} />
                </label>
                <StaffMultiSelect
                  staff={staff}
                  selectedIds={deptStaffIds}
                  onToggle={(staffId, checked) => handleToggleDepartmentStaff(dept.id, staffId, checked)}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  Auto-assign new tickets to
                  <SaveIndicator state={saveStates[`${dept.id}:auto`]} />
                </label>
                {renderAssigneeSelect(
                  dept.default_assignee_id || '',
                  (profileId) => handleDepartmentAssignee(dept.id, profileId),
                  'Nobody (leave unassigned)',
                )}
              </div>
            </div>

            {/* Per-category overrides */}
            {deptCategories.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Tags className="w-3.5 h-3.5" />
                  Category overrides (optional — only set these when a category should go to someone else)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {deptCategories.map((cat) => (
                    <div key={cat.id}>
                      <label className="flex items-center gap-2 text-xs text-gray-500 mb-1 truncate" title={cat.label}>
                        {cat.label}
                        <SaveIndicator state={saveStates[`cat:${cat.id}`]} />
                      </label>
                      {renderAssigneeSelect(
                        cat.default_assignee_id || '',
                        (profileId) => handleCategoryAssignee(cat.id, profileId),
                        deptDefaultLabel,
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {departments.length === 0 && (
        <div className="text-center py-12 bg-slate-800 rounded-xl border border-slate-700">
          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No active departments configured</p>
        </div>
      )}
    </div>
  );
}

export default TicketAssignments;
