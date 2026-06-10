import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Users, User, Shield, Crown, Trash2, Loader2,
  CheckCircle, XCircle, UserPlus, UserMinus, RefreshCw, Eye, EyeOff,
} from 'lucide-react';
import {
  teamsApi,
  type AdminTeamSummary,
  type AdminMemberSearchResult,
  type AdminUserTeams,
  type Team,
  type TeamMemberRole,
} from '@/teams/teams.api-client';

type Tab = 'teams' | 'members';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  co_owner: 'Co-Owner',
  moderator: 'Moderator',
  member: 'Member',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  pending_approval: 'Pending Approval',
  pending_invite: 'Pending Invite',
  pending_renewal: 'Pending Renewal',
  inactive: 'Inactive',
};

function ownerName(o?: { first_name?: string; last_name?: string }): string {
  if (!o) return 'Unknown';
  return `${o.first_name || ''} ${o.last_name || ''}`.trim() || 'Unknown';
}

export default function TeamManagementPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('teams');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Teams tab state — full list loaded up front, filtered client-side
  const [teamQuery, setTeamQuery] = useState('');
  const [teamResults, setTeamResults] = useState<AdminTeamSummary[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [ownerStatusFilter, setOwnerStatusFilter] = useState<string>('all');

  // Selected team detail
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string; location: string; teamType: string; isPublic: boolean } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [addMecaId, setAddMecaId] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [reassignMecaId, setReassignMecaId] = useState('');
  const [reassignRemovePrev, setReassignRemovePrev] = useState(true);

  // Members tab state
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<AdminMemberSearchResult[]>([]);
  const [membersSearched, setMembersSearched] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [userTeams, setUserTeams] = useState<AdminUserTeams | null>(null);
  const [userTeamsLoading, setUserTeamsLoading] = useState(false);

  const flash = (msg: string) => {
    setNotice(msg);
    setError(null);
    setTimeout(() => setNotice(null), 4000);
  };

  const fail = (err: unknown, fallback: string) => {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
    setError(Array.isArray(msg) ? msg.join(', ') : msg);
    setNotice(null);
  };

  // ============================================
  // TEAMS TAB
  // ============================================

  // Load EVERY team once; the text box and dropdowns filter client-side.
  const loadTeams = useCallback(async () => {
    try {
      setTeamsLoading(true);
      setError(null);
      const results = await teamsApi.adminSearchTeams('');
      setTeamResults(results);
    } catch (err) {
      fail(err, 'Failed to load teams');
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // Owner membership statuses actually present in the data drive the filter options
  const ownerStatuses = useMemo(
    () => Array.from(new Set(teamResults.map(t => t.owner?.membership_status).filter(Boolean))).sort() as string[],
    [teamResults],
  );

  const filteredTeams = useMemo(() => {
    const q = teamQuery.trim().toLowerCase();
    return teamResults.filter(t => {
      if (q) {
        const haystack = `${t.name} ${t.owner?.first_name || ''} ${t.owner?.last_name || ''} ${t.owner?.meca_id || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (statusFilter !== 'all' && (statusFilter === 'active') !== t.isActive) return false;
      if (visibilityFilter !== 'all' && (visibilityFilter === 'public') !== t.isPublic) return false;
      if (ownerStatusFilter !== 'all' && (t.owner?.membership_status || 'unknown') !== ownerStatusFilter) return false;
      return true;
    });
  }, [teamResults, teamQuery, statusFilter, visibilityFilter, ownerStatusFilter]);

  const openTeamDetail = useCallback(async (teamId: string) => {
    try {
      setDetailLoading(true);
      setError(null);
      setTab('teams');
      const team = await teamsApi.getTeam(teamId);
      setSelectedTeam(team);
      setEditForm({
        name: team.name,
        location: team.location || '',
        teamType: team.teamType || 'competitive',
        isPublic: team.isPublic !== false,
      });
    } catch (err) {
      fail(err, 'Failed to load team');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const refreshDetail = async () => {
    if (selectedTeam) await openTeamDetail(selectedTeam.id);
  };

  const handleSaveEdit = async () => {
    if (!selectedTeam || !editForm) return;
    try {
      setSavingEdit(true);
      await teamsApi.updateTeam(selectedTeam.id, {
        name: editForm.name,
        location: editForm.location || undefined,
        team_type: editForm.teamType as never,
        is_public: editForm.isPublic,
      });
      flash('Team updated');
      await refreshDetail();
      await loadTeams();
    } catch (err) {
      fail(err, 'Failed to update team');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSetActive = async (isActive: boolean) => {
    if (!selectedTeam) return;
    try {
      setActionBusy('active');
      await teamsApi.adminSetTeamActive(selectedTeam.id, isActive);
      flash(isActive ? 'Team activated' : 'Team deactivated');
      await refreshDetail();
      await loadTeams();
    } catch (err) {
      fail(err, 'Failed to change team status');
    } finally {
      setActionBusy(null);
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return;
    if (!window.confirm(`Permanently DELETE team "${selectedTeam.name}" and all of its member records? This cannot be undone.`)) return;
    try {
      setActionBusy('delete');
      await teamsApi.deleteTeam(selectedTeam.id);
      flash('Team deleted');
      setSelectedTeam(null);
      setEditForm(null);
      await loadTeams();
    } catch (err) {
      fail(err, 'Failed to delete team');
    } finally {
      setActionBusy(null);
    }
  };

  const handleTransferOwnership = async (newOwnerId: string, name: string) => {
    if (!selectedTeam) return;
    if (!window.confirm(`Make ${name} the owner of "${selectedTeam.name}"? The current owner becomes a co-owner.`)) return;
    try {
      setActionBusy(`transfer-${newOwnerId}`);
      await teamsApi.transferOwnership(selectedTeam.id, newOwnerId);
      flash('Ownership transferred');
      await refreshDetail();
    } catch (err) {
      fail(err, 'Failed to transfer ownership');
    } finally {
      setActionBusy(null);
    }
  };

  const handleReassignOwner = async () => {
    if (!selectedTeam || !reassignMecaId.trim()) return;
    const verb = reassignRemovePrev ? 'replaces and removes' : 'replaces (kept as member)';
    if (!window.confirm(`Reassign "${selectedTeam.name}" to MECA ID ${reassignMecaId.trim()}? This ${verb} the current owner.`)) return;
    try {
      setActionBusy('reassign');
      setError(null);
      await teamsApi.adminReassignOwner(selectedTeam.id, reassignMecaId.trim(), reassignRemovePrev);
      flash('Team reassigned to new owner');
      setReassignMecaId('');
      await refreshDetail();
      await loadTeams();
    } catch (err) {
      fail(err, 'Failed to reassign owner');
    } finally {
      setActionBusy(null);
    }
  };

  const handleChangeRole = async (userId: string, role: TeamMemberRole) => {
    if (!selectedTeam) return;
    try {
      setActionBusy(`role-${userId}`);
      await teamsApi.updateMemberRole(selectedTeam.id, userId, role);
      flash('Role updated');
      await refreshDetail();
    } catch (err) {
      fail(err, 'Failed to update role');
    } finally {
      setActionBusy(null);
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from this team?`)) return;
    try {
      setActionBusy(`remove-${userId}`);
      await teamsApi.removeMember(teamId, userId);
      flash('Member removed');
      if (selectedTeam?.id === teamId) await refreshDetail();
      if (userTeams) await openUserTeams(userTeams.profile.id);
    } catch (err) {
      fail(err, 'Failed to remove member');
    } finally {
      setActionBusy(null);
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeam || !addMecaId.trim()) return;
    try {
      setAddingMember(true);
      setError(null);
      const lookup = await teamsApi.lookupMemberByMecaId(addMecaId.trim());
      if (!lookup.found || !lookup.member) {
        setError('No member found with that MECA ID');
        return;
      }
      await teamsApi.addMember(selectedTeam.id, lookup.member.id);
      flash(`Added ${lookup.member.first_name || ''} ${lookup.member.last_name || ''} to the team`);
      setAddMecaId('');
      await refreshDetail();
    } catch (err) {
      fail(err, 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  // ============================================
  // MEMBERS TAB
  // ============================================

  const searchMembers = async () => {
    try {
      setMembersLoading(true);
      setError(null);
      const results = await teamsApi.adminSearchMembers(memberQuery);
      setMemberResults(results);
      setMembersSearched(true);
    } catch (err) {
      fail(err, 'Failed to search members');
    } finally {
      setMembersLoading(false);
    }
  };

  const openUserTeams = async (userId: string) => {
    try {
      setUserTeamsLoading(true);
      setError(null);
      const data = await teamsApi.adminGetUserTeams(userId);
      setUserTeams(data);
    } catch (err) {
      fail(err, 'Failed to load member teams');
    } finally {
      setUserTeamsLoading(false);
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderTeamRow = (t: AdminTeamSummary) => (
    <tr
      key={t.id}
      onClick={() => openTeamDetail(t.id)}
      className={`cursor-pointer border-b border-slate-700/50 hover:bg-slate-700/40 transition-colors ${selectedTeam?.id === t.id ? 'bg-slate-700/60' : ''}`}
    >
      <td className="px-4 py-3">
        <div className="text-white font-medium">{t.name}</div>
        <div className="text-xs text-gray-500">{t.teamType}{t.location ? ` · ${t.location}` : ''}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-gray-300">{ownerName(t.owner)}</div>
        <div className="text-xs text-gray-500">
          {t.owner.meca_id ? `MECA ${t.owner.meca_id}` : ''}
          {t.owner.membership_status && (
            <span className={t.owner.membership_status === 'active' ? 'text-green-500 ml-1' : 'text-red-400 ml-1'}>
              ({t.owner.membership_status})
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center text-gray-300">{t.activeMemberCount}</td>
      <td className="px-4 py-3 text-center text-gray-400">{t.pendingCount || '—'}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full ${t.isActive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
            {t.isActive ? 'Active' : 'Inactive'}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${t.isPublic ? 'bg-cyan-500/15 text-cyan-400' : 'bg-slate-600/40 text-gray-400'}`}>
            {t.isPublic ? 'Public' : 'Hidden'}
          </span>
        </div>
      </td>
    </tr>
  );

  const renderTeamDetail = () => {
    if (detailLoading) {
      return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 flex justify-center">
          <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
        </div>
      );
    }
    if (!selectedTeam || !editForm) return null;
    const team = selectedTeam;

    return (
      <div className="bg-slate-800 rounded-xl border border-orange-500/40 p-6 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              {team.name}
              {!team.isActive && <span className="text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full">Inactive</span>}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Owner: {ownerName(team.owner)} {team.owner?.meca_id ? `(MECA ${team.owner.meca_id})` : ''}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleSetActive(!team.isActive)}
              disabled={actionBusy === 'active'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-slate-700 text-gray-200 hover:bg-slate-600 disabled:opacity-50"
            >
              {actionBusy === 'active' ? <Loader2 className="h-4 w-4 animate-spin" /> : team.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {team.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={handleDeleteTeam}
              disabled={actionBusy === 'delete'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-50"
            >
              {actionBusy === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Team
            </button>
            <button
              onClick={() => { setSelectedTeam(null); setEditForm(null); }}
              className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 text-gray-300 hover:bg-slate-600"
            >
              Close
            </button>
          </div>
        </div>

        {/* Edit team */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Team Name</label>
            <input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Location</label>
            <input
              value={editForm.location}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              placeholder="City, ST"
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select
              value={editForm.teamType}
              onChange={(e) => setEditForm({ ...editForm, teamType: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="competitive">Competitive</option>
              <option value="casual">Casual</option>
              <option value="shop">Shop</option>
              <option value="club">Club</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-300 pb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.isPublic}
                onChange={(e) => setEditForm({ ...editForm, isPublic: e.target.checked })}
                className="rounded"
              />
              Public
            </label>
            <button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>

        {/* Reassign owner — fixes teams assigned to the wrong member */}
        <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-lg p-4">
          <h4 className="text-white font-semibold flex items-center gap-2 mb-1">
            <Crown className="h-4 w-4 text-yellow-500" /> Reassign Team Owner
          </h4>
          <p className="text-xs text-gray-400 mb-3">
            Hands this team to a different member by MECA ID — they don't need to be on the roster yet.
            Use this when a team is assigned to the wrong person.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={reassignMecaId}
              onChange={(e) => setReassignMecaId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReassignOwner()}
              placeholder="New owner's MECA ID"
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm w-48"
            />
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={reassignRemovePrev}
                onChange={(e) => setReassignRemovePrev(e.target.checked)}
                className="rounded"
              />
              Remove current owner from team
            </label>
            <button
              onClick={handleReassignOwner}
              disabled={actionBusy === 'reassign' || !reassignMecaId.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/40 disabled:opacity-50"
            >
              {actionBusy === 'reassign' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
              Reassign Owner
            </button>
          </div>
        </div>

        {/* Members */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h4 className="text-white font-semibold">Members ({team.members?.length || 0})</h4>
            <div className="flex gap-2">
              <input
                value={addMecaId}
                onChange={(e) => setAddMecaId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                placeholder="Add by MECA ID"
                className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-1.5 text-sm w-40"
              />
              <button
                onClick={handleAddMember}
                disabled={addingMember || !addMecaId.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {addingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Add
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {(team.members || []).map((m) => {
              const isOwnerRow = m.userId === team.captainId;
              const name = `${m.user?.first_name || ''} ${m.user?.last_name || ''}`.trim() || m.userId;
              return (
                <div key={m.userId} className="flex items-center justify-between bg-slate-700/40 rounded-lg px-4 py-2.5 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {isOwnerRow ? <Crown className="h-4 w-4 text-yellow-500" /> : <User className="h-4 w-4 text-gray-400" />}
                    <div>
                      <div className="text-white text-sm font-medium">{name}</div>
                      <div className="text-xs text-gray-500">
                        {m.user?.meca_id ? `MECA ${m.user.meca_id}` : ''}
                        {m.user?.membership_status && (
                          <span className={m.user.membership_status === 'active' ? 'text-green-500 ml-1' : 'text-red-400 ml-1'}>
                            ({m.user.membership_status})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwnerRow ? (
                      <span className="text-xs bg-yellow-500/15 text-yellow-400 px-2 py-1 rounded-full flex items-center gap-1">
                        <Crown className="h-3 w-3" /> Owner
                      </span>
                    ) : (
                      <>
                        <select
                          value={m.role === 'owner' ? 'member' : m.role}
                          onChange={(e) => handleChangeRole(m.userId, e.target.value as TeamMemberRole)}
                          disabled={actionBusy === `role-${m.userId}`}
                          className="bg-slate-700 border border-slate-600 text-gray-200 rounded-lg px-2 py-1 text-xs"
                        >
                          <option value="member">Member</option>
                          <option value="moderator">Moderator</option>
                          <option value="co_owner">Co-Owner</option>
                        </select>
                        <button
                          onClick={() => handleTransferOwnership(m.userId, name)}
                          disabled={actionBusy === `transfer-${m.userId}`}
                          title="Make owner"
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25 disabled:opacity-50"
                        >
                          {actionBusy === `transfer-${m.userId}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Crown className="h-3 w-3" />}
                          Make Owner
                        </button>
                        <button
                          onClick={() => handleRemoveMember(team.id, m.userId, name)}
                          disabled={actionBusy === `remove-${m.userId}`}
                          title="Remove from team"
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-50"
                        >
                          {actionBusy === `remove-${m.userId}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />}
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {(team.members || []).length === 0 && (
              <p className="text-gray-500 text-sm py-2">No members on this team.</p>
            )}
          </div>
        </div>

        {/* Pending requests / invites (admin sees these from getTeam) */}
        {((team.pendingRequests?.length || 0) > 0 || (team.pendingInvites?.length || 0) > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(team.pendingRequests?.length || 0) > 0 && (
              <div>
                <h4 className="text-white font-semibold mb-2">Pending Join Requests</h4>
                {team.pendingRequests!.map((r) => (
                  <div key={r.userId} className="flex items-center justify-between bg-slate-700/40 rounded-lg px-4 py-2 mb-2">
                    <span className="text-sm text-gray-300">{`${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim() || r.userId}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => { await teamsApi.approveJoinRequest(team.id, r.userId); flash('Request approved'); refreshDetail(); }}
                        className="text-green-400 hover:text-green-300" title="Approve"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => { await teamsApi.rejectJoinRequest(team.id, r.userId); flash('Request rejected'); refreshDetail(); }}
                        className="text-red-400 hover:text-red-300" title="Reject"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(team.pendingInvites?.length || 0) > 0 && (
              <div>
                <h4 className="text-white font-semibold mb-2">Pending Invites</h4>
                {team.pendingInvites!.map((i) => (
                  <div key={i.userId} className="flex items-center justify-between bg-slate-700/40 rounded-lg px-4 py-2 mb-2">
                    <span className="text-sm text-gray-300">{`${i.user?.first_name || ''} ${i.user?.last_name || ''}`.trim() || i.userId}</span>
                    <button
                      onClick={async () => { await teamsApi.cancelInvite(team.id, i.userId); flash('Invite cancelled'); refreshDetail(); }}
                      className="text-red-400 hover:text-red-300" title="Cancel invite"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Admin Dashboard
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="h-7 w-7 text-orange-500" />
            Team Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Search any team to see its owner and members, fix ownership, manage rosters, or look up every team a member is on.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">{error}</div>
        )}
        {notice && (
          <div className="p-3 bg-green-500/10 border border-green-500 rounded-lg text-green-400 text-sm">{notice}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('teams')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === 'teams' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}
          >
            <Users className="h-4 w-4" /> Teams
          </button>
          <button
            onClick={() => setTab('members')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === 'members' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-gray-300 hover:bg-slate-700'}`}
          >
            <User className="h-4 w-4" /> Members
          </button>
        </div>

        {tab === 'teams' && (
          <>
            {/* Filter bar */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="relative flex-1 min-w-[220px] max-w-md">
                  <label className="block text-xs text-gray-400 mb-1">Filter by team or owner</label>
                  <Search className="absolute left-3 bottom-2.5 h-4 w-4 text-gray-500" />
                  <input
                    value={teamQuery}
                    onChange={(e) => setTeamQuery(e.target.value)}
                    placeholder="Team name, owner name, or MECA ID"
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg pl-9 pr-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Team Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Visibility</label>
                  <select
                    value={visibilityFilter}
                    onChange={(e) => setVisibilityFilter(e.target.value as typeof visibilityFilter)}
                    className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Owner Membership</label>
                  <select
                    value={ownerStatusFilter}
                    onChange={(e) => setOwnerStatusFilter(e.target.value)}
                    className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    {ownerStatuses.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <button
                  onClick={loadTeams}
                  disabled={teamsLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-gray-200 hover:bg-slate-600 disabled:opacity-50 text-sm"
                >
                  {teamsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </button>
                <span className="text-gray-500 text-sm pb-2 ml-auto">
                  {filteredTeams.length} of {teamResults.length} team{teamResults.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {renderTeamDetail()}

            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              {teamsLoading && teamResults.length === 0 ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-slate-700 bg-slate-800/80">
                          <th className="px-4 py-3 font-medium">Team</th>
                          <th className="px-4 py-3 font-medium">Owner</th>
                          <th className="px-4 py-3 font-medium text-center">Members</th>
                          <th className="px-4 py-3 font-medium text-center">Pending</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTeams.map(renderTeamRow)}
                      </tbody>
                    </table>
                  </div>
                  {filteredTeams.length === 0 && (
                    <p className="text-gray-500 text-sm p-6 text-center">No teams match the current filters.</p>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {tab === 'members' && (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchMembers()}
                  placeholder="Member name, email, or MECA ID"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-9 pr-3 py-2"
                />
              </div>
              <button
                onClick={searchMembers}
                disabled={membersLoading || !memberQuery.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {membersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </button>
            </div>

            {/* Member's team associations */}
            {userTeamsLoading && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 flex justify-center">
                <Loader2 className="h-6 w-6 text-orange-500 animate-spin" />
              </div>
            )}
            {userTeams && !userTeamsLoading && (
              <div className="bg-slate-800 rounded-xl border border-orange-500/40 p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-lg font-bold text-white">
                    {ownerName(userTeams.profile)}{' '}
                    <span className="text-sm font-normal text-gray-400">
                      {userTeams.profile.meca_id ? `MECA ${userTeams.profile.meca_id} · ` : ''}{userTeams.profile.email}
                    </span>
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openUserTeams(userTeams.profile.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-slate-700 text-gray-200 hover:bg-slate-600"
                    >
                      <RefreshCw className="h-4 w-4" /> Refresh
                    </button>
                    <button
                      onClick={() => setUserTeams(null)}
                      className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 text-gray-300 hover:bg-slate-600"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" /> Owns ({userTeams.ownedTeams.length})
                  </h4>
                  {userTeams.ownedTeams.length === 0 && <p className="text-gray-500 text-sm">Does not own any teams.</p>}
                  <div className="space-y-2">
                    {userTeams.ownedTeams.map((t) => (
                      <div key={t.id} className="flex items-center justify-between bg-slate-700/40 rounded-lg px-4 py-2.5 flex-wrap gap-2">
                        <div>
                          <span className="text-white text-sm font-medium">{t.name}</span>
                          <span className="text-xs text-gray-500 ml-2">{t.activeMemberCount} member{t.activeMemberCount !== 1 ? 's' : ''}</span>
                          {!t.isActive && <span className="text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full ml-2">Inactive</span>}
                        </div>
                        <button
                          onClick={() => openTeamDetail(t.id)}
                          className="text-sm text-orange-400 hover:text-orange-300"
                        >
                          Manage →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-cyan-400" /> Team Memberships ({userTeams.memberRows.length})
                  </h4>
                  {userTeams.memberRows.length === 0 && <p className="text-gray-500 text-sm">No team membership records.</p>}
                  <div className="space-y-2">
                    {userTeams.memberRows.map((row) => (
                      <div key={`${row.teamId}`} className="flex items-center justify-between bg-slate-700/40 rounded-lg px-4 py-2.5 flex-wrap gap-2">
                        <div>
                          <span className="text-white text-sm font-medium">{row.team?.name || `(deleted team ${row.teamId.slice(0, 8)}…)`}</span>
                          <span className="text-xs text-gray-400 ml-2">{ROLE_LABELS[row.role] || row.role}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${row.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                            {STATUS_LABELS[row.status] || row.status}
                          </span>
                          {row.team && row.team.owner?.id !== userTeams.profile.id && (
                            <span className="text-xs text-gray-500 ml-2">owner: {ownerName(row.team.owner)}</span>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          {row.team && (
                            <button
                              onClick={() => openTeamDetail(row.teamId)}
                              className="text-sm text-orange-400 hover:text-orange-300"
                            >
                              Manage →
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveMember(row.teamId, userTeams.profile.id, ownerName(userTeams.profile))}
                            disabled={actionBusy === `remove-${userTeams.profile.id}`}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-50"
                          >
                            <UserMinus className="h-3 w-3" /> Remove from team
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {membersSearched && !userTeams && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-slate-700 bg-slate-800/80">
                        <th className="px-4 py-3 font-medium">Member</th>
                        <th className="px-4 py-3 font-medium">MECA ID</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-center">Teams Owned</th>
                        <th className="px-4 py-3 font-medium text-center">Team Records</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberResults.map((m) => (
                        <tr
                          key={m.id}
                          onClick={() => openUserTeams(m.id)}
                          className="cursor-pointer border-b border-slate-700/50 hover:bg-slate-700/40 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="text-white font-medium">{ownerName(m)}</div>
                            <div className="text-xs text-gray-500">{m.email}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{m.meca_id || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${m.membership_status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                              {m.membership_status || 'unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-300">{m.ownedTeamCount}</td>
                          <td className="px-4 py-3 text-center text-gray-300">{m.teamMemberRows}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {memberResults.length === 0 && !membersLoading && (
                  <p className="text-gray-500 text-sm p-6 text-center">No members found.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
