import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, FileSpreadsheet, File, User, Download, Search,
  ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, Eye, X, Edit2, Trash2, Plus, Users,
} from 'lucide-react';
import { useAuth } from '@/auth';
import { seasonsApi, Season } from '@/seasons';
import axios from '@/lib/axios';
import Pagination from '@/shared/components/Pagination';

interface CompetitorDetail {
  id: string;
  competitorName: string;
  mecaId: string | null;
  membershipStatus: string;
  competitionClass: string | null;
  format: string | null;
  score: any;
  oldData: any;
  newData: any;
}

interface AuditActivity {
  id: string;
  sourceType: 'session' | 'audit_log';
  actionType: 'new_entry' | 'modification' | 'deletion';
  date: string;
  eventId: string;
  eventTitle: string | null;
  eventDate: string | null;
  seasonId: string | null;
  seasonName: string | null;
  userId: string;
  userName: string;
  userEmail: string | null;
  entryMethod: string | null;
  format: string | null;
  resultCount: number;
  filePath: string | null;
  originalFilename: string | null;
  sessionId: string | null;
  competitorNames: string[];
  competitorDetails: CompetitorDetail[];
  competitionClass: string | null;
  oldData: any;
  newData: any;
  groupedLogs: any[] | null;
}

interface Stats {
  newEntries: number;
  modifications: number;
  deletions: number;
}

const fieldLabels: Record<string, string> = {
  competitor_name: 'Competitor Name', competitorName: 'Competitor Name',
  meca_id: 'MECA ID', mecaId: 'MECA ID',
  competition_class: 'Competition Class', competitionClass: 'Competition Class',
  format: 'Format', score: 'Score', placement: 'Placement',
  points_earned: 'Points Earned', pointsEarned: 'Points Earned',
  vehicle_info: 'Vehicle Info', vehicleInfo: 'Vehicle Info',
  notes: 'Notes', wattage: 'Wattage', frequency: 'Frequency',
};
const skipFields = [
  'id', 'created_at', 'createdAt', 'updated_at', 'updatedAt',
  'event_id', 'eventId', 'competitor', 'event',
  'competitor_id', 'competitorId', '__entity', '__helper', '__meta',
  'classId', 'class_id', 'seasonId', 'season_id',
  'createdBy', 'created_by', 'updatedBy', 'updated_by',
  'revisionCount', 'revision_count', 'modification_reason', 'modificationReason',
  'deletion_reason',
];

export default function AuditLogAdminPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<AuditActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats>({ newEntries: 0, modifications: 0, deletions: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedActivity, setSelectedActivity] = useState<AuditActivity | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) fetchSeasons();
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) fetchActivities();
  }, [isAdmin, page, itemsPerPage, search, selectedSeasonId, actionTypeFilter]);

  const fetchSeasons = async () => {
    try {
      const data = await seasonsApi.getAll();
      setSeasons(data);
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(itemsPerPage));
      params.set('offset', String((page - 1) * itemsPerPage));
      if (search) params.set('search', search);
      if (selectedSeasonId) params.set('seasonId', selectedSeasonId);
      if (actionTypeFilter !== 'all') params.set('actionType', actionTypeFilter);

      const response = await axios.get(`/api/audit/admin/all-activity?${params.toString()}`);
      setActivities(response.data.activities || []);
      setTotal(response.data.total || 0);
      setStats(response.data.stats || { newEntries: 0, modifications: 0, deletions: 0 });
    } catch (error) {
      console.error('Error fetching audit activities:', error);
      setActivities([]);
    }
    setLoading(false);
  };

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    setPage(1);
  };

  const handleDownloadFile = async (sessionId: string, filename: string) => {
    try {
      const response = await axios.get(`/api/audit/session/${sessionId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || `session-${sessionId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  const handleViewDetail = async (activity: AuditActivity) => {
    setSelectedActivity(activity);
    setDetailData(null);

    if (activity.sourceType === 'session' && activity.sessionId) {
      setLoadingDetail(true);
      try {
        const response = await axios.get(`/api/audit/event/${activity.eventId}/sessions`);
        const session = (response.data || []).find((s: any) => s.id === activity.sessionId);
        setDetailData(session || null);
      } catch (error) {
        console.error('Error fetching session detail:', error);
      }
      setLoadingDetail(false);
    } else if (activity.sourceType === 'audit_log') {
      // For grouped modifications/deletions, pass all the details
      if (activity.groupedLogs && activity.groupedLogs.length > 0) {
        setDetailData({
          action: activity.actionType === 'modification' ? 'update' : 'delete',
          grouped: true,
          logs: activity.groupedLogs,
          competitorDetails: activity.competitorDetails,
          userName: activity.userName,
          userEmail: activity.userEmail,
          timestamp: activity.date,
        });
      } else {
        setDetailData({
          action: activity.actionType === 'modification' ? 'update' : 'delete',
          grouped: false,
          old_data: activity.oldData,
          new_data: activity.newData,
          competitorDetails: activity.competitorDetails,
          userName: activity.userName,
          userEmail: activity.userEmail,
          timestamp: activity.date,
        });
      }
    }
  };

  const getEntryMethodIcon = (method: string | null) => {
    switch (method) {
      case 'excel': return <FileSpreadsheet className="h-4 w-4 text-green-400" />;
      case 'termlab': return <File className="h-4 w-4 text-blue-400" />;
      case 'manual': return <Edit2 className="h-4 w-4 text-purple-400" />;
      default: return <File className="h-4 w-4 text-gray-400" />;
    }
  };

  const getEntryMethodLabel = (method: string | null) => {
    switch (method) {
      case 'excel': return 'Excel';
      case 'termlab': return 'TermLab';
      case 'manual': return 'Manual';
      default: return '-';
    }
  };

  const getActionTypeBadge = (actionType: string) => {
    switch (actionType) {
      case 'new_entry':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded font-medium">
            <Plus className="h-3 w-3" /> New Entry
          </span>
        );
      case 'modification':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded font-medium">
            <Edit2 className="h-3 w-3" /> Modified
          </span>
        );
      case 'deletion':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded font-medium">
            <Trash2 className="h-3 w-3" /> Deleted
          </span>
        );
      default: return <span className="text-gray-400 text-xs">Unknown</span>;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const sortedActivities = [...activities].sort((a, b) => {
    let aVal: any = '';
    let bVal: any = '';
    switch (sortColumn) {
      case 'date': aVal = new Date(a.date).getTime(); bVal = new Date(b.date).getTime(); break;
      case 'event': aVal = a.eventTitle || ''; bVal = b.eventTitle || ''; break;
      case 'user': aVal = a.userName || ''; bVal = b.userName || ''; break;
      case 'member': aVal = (a.competitorNames || []).join(', '); bVal = (b.competitorNames || []).join(', '); break;
      case 'actionType': aVal = a.actionType; bVal = b.actionType; break;
      case 'method': aVal = a.entryMethod || ''; bVal = b.entryMethod || ''; break;
      case 'results': aVal = a.resultCount; bVal = b.resultCount; break;
      case 'file': aVal = a.originalFilename || ''; bVal = b.originalFilename || ''; break;
      default: return 0;
    }
    if (typeof aVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const getChangedFields = (oldData: any, newData: any) => {
    const changes: { label: string; oldValue: any; newValue: any }[] = [];
    if (!oldData || !newData) return changes;
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    allKeys.forEach((key) => {
      if (skipFields.includes(key)) return;
      const ov = oldData[key];
      const nv = newData[key];
      if (ov == null && nv == null) return;
      if (JSON.stringify(ov) !== JSON.stringify(nv)) {
        changes.push({
          label: fieldLabels[key] || key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(),
          oldValue: ov ?? '-',
          newValue: nv ?? '-',
        });
      }
    });
    return changes;
  };

  const getMecaIdColor = (status: string) => {
    return status === 'active' ? 'text-green-400' : 'text-red-400';
  };

  // Format competitor display for table rows
  const renderCompetitorCell = (activity: AuditActivity) => {
    const details = activity.competitorDetails || [];
    const names = activity.competitorNames || [];

    // If we have competitor details, use those (they include names from audit data)
    if (details.length === 0 && names.length === 0) {
      // For new entries with multiple results but no detail loaded yet
      if (activity.actionType === 'new_entry' && activity.resultCount > 1) {
        return (
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            <Users className="h-3 w-3" />
            <span>{activity.resultCount} competitors</span>
          </div>
        );
      }
      return <span className="text-gray-500 text-xs">-</span>;
    }

    if (details.length === 1 || names.length === 1) {
      const detail = details[0];
      const name = detail?.competitorName || names[0] || 'Unknown';
      return (
        <div>
          <div className="text-white text-xs">{name}</div>
          {detail?.mecaId && (
            <div className={`text-xs font-mono ${getMecaIdColor(detail.membershipStatus)}`}>
              #{detail.mecaId}
            </div>
          )}
        </div>
      );
    }

    // Multiple competitors
    const firstDetail = details[0];
    const firstName = firstDetail?.competitorName || names[0] || 'Unknown';
    const remainingCount = Math.max(details.length, names.length) - 1;
    return (
      <div className="flex items-center gap-1">
        <Users className="h-3 w-3 text-gray-400" />
        <div>
          <div className="text-white text-xs">{firstName}</div>
          {firstDetail?.mecaId && (
            <div className={`text-xs font-mono ${getMecaIdColor(firstDetail.membershipStatus)}`}>
              #{firstDetail.mecaId}
            </div>
          )}
          <div className="text-gray-500 text-xs">+{remainingCount} more</div>
        </div>
      </div>
    );
  };

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center text-gray-400">Admin access required.</div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-orange-500" />
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
        </div>
        <button
          onClick={() => navigate('/dashboard/admin')}
          className="flex items-center gap-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Dashboard
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-sm text-gray-400">Total Activity</div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{stats.newEntries}</div>
          <div className="text-sm text-gray-400">New Entries</div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">{stats.modifications}</div>
          <div className="text-sm text-gray-400">Modifications</div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">{stats.deletions}</div>
          <div className="text-sm text-gray-400">Deletions</div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="w-full sm:w-48">
          <select
            value={selectedSeasonId}
            onChange={(e) => handleSeasonChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Seasons</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.is_current ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, MECA ID, email, event, class, format, date, season..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          Search
        </button>
        {(search || selectedSeasonId || actionTypeFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchInput(''); setSearch('');
              setSelectedSeasonId('');
              setActionTypeFilter('all');
              setPage(1);
            }}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Action Type Filter Tabs */}
      <div className="flex gap-1 mb-4">
        {[
          { key: 'all', label: 'All', count: total },
          { key: 'new_entry', label: 'New Entries', count: stats.newEntries },
          { key: 'modification', label: 'Modifications', count: stats.modifications },
          { key: 'deletion', label: 'Deletions', count: stats.deletions },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActionTypeFilter(tab.key); setPage(1); }}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-colors ${
              actionTypeFilter === tab.key
                ? 'bg-orange-500 text-white'
                : 'bg-slate-700 text-gray-400 hover:text-white hover:bg-slate-600'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 px-1.5 py-0.5 bg-black/20 rounded text-xs">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
        </div>
      ) : sortedActivities.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-400">No audit activity found</div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm min-w-[1050px]">
              <thead className="bg-slate-800 text-gray-300">
                <tr>
                  <th className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => handleSort('date')}>
                    <div className="flex items-center">Date{renderSortIcon('date')}</div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => handleSort('event')}>
                    <div className="flex items-center">Event{renderSortIcon('event')}</div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => handleSort('user')}>
                    <div className="flex items-center">Admin{renderSortIcon('user')}</div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => handleSort('member')}>
                    <div className="flex items-center">Member{renderSortIcon('member')}</div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => handleSort('actionType')}>
                    <div className="flex items-center">Type{renderSortIcon('actionType')}</div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => handleSort('method')}>
                    <div className="flex items-center">Method{renderSortIcon('method')}</div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => handleSort('results')}>
                    <div className="flex items-center">Results{renderSortIcon('results')}</div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs uppercase cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => handleSort('file')}>
                    <div className="flex items-center">File{renderSortIcon('file')}</div>
                  </th>
                  <th className="px-3 py-2 text-left text-xs uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedActivities.map((activity, index) => (
                  <tr
                    key={`${activity.sourceType}-${activity.id}`}
                    className={`border-b border-slate-600 ${index % 2 === 0 ? 'bg-slate-700' : 'bg-slate-750'} hover:bg-slate-600`}
                  >
                    <td className="px-3 py-2 text-gray-300 text-xs whitespace-nowrap">
                      {formatDateTime(activity.date)}
                    </td>
                    <td className="px-3 py-2 text-white max-w-[160px] truncate" title={activity.eventTitle || ''}>
                      {activity.eventTitle || '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-300 text-xs">
                      <div>{activity.userName}</div>
                      {activity.userEmail && (
                        <div className="text-gray-500 truncate max-w-[130px]">{activity.userEmail}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {renderCompetitorCell(activity)}
                    </td>
                    <td className="px-3 py-2">
                      {getActionTypeBadge(activity.actionType)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {getEntryMethodIcon(activity.entryMethod)}
                        <span className="text-gray-300 text-xs">{getEntryMethodLabel(activity.entryMethod)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-orange-400 font-semibold">{activity.resultCount}</td>
                    <td className="px-3 py-2 text-gray-400 text-xs max-w-[130px] truncate" title={activity.originalFilename || ''}>
                      {activity.originalFilename || '-'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleViewDetail(activity)}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-3 w-3" /> View
                        </button>
                        {activity.filePath && activity.sessionId && (
                          <button
                            onClick={() => handleDownloadFile(activity.sessionId!, activity.originalFilename || 'download.xlsx')}
                            className="flex items-center gap-1 px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs transition-colors"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {sortedActivities.map((activity) => (
              <div
                key={`${activity.sourceType}-${activity.id}`}
                className="bg-slate-800 rounded-lg p-3 border border-slate-600"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  {getActionTypeBadge(activity.actionType)}
                  <span className="text-gray-500 text-xs">{formatDateTime(activity.date)}</span>
                </div>
                <div className="text-white text-sm mb-1 truncate">{activity.eventTitle || '-'}</div>
                <div className="text-gray-400 text-xs mb-1">
                  Admin: {activity.userName}
                </div>
                {activity.competitorNames && activity.competitorNames.length > 0 && (
                  <div className="text-gray-400 text-xs mb-1">
                    Member: {activity.competitorNames.length === 1
                      ? activity.competitorNames[0]
                      : `${activity.competitorNames[0]} +${activity.competitorNames.length - 1} more`}
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    {getEntryMethodIcon(activity.entryMethod)}
                    <span className="text-gray-400 text-xs">{getEntryMethodLabel(activity.entryMethod)}</span>
                  </div>
                  <span className="text-orange-400 text-xs font-semibold">{activity.resultCount} result(s)</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleViewDetail(activity)}
                    className="flex items-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs transition-colors"
                  >
                    <Eye className="h-3 w-3" /> View Details
                  </button>
                  {activity.filePath && activity.sessionId && (
                    <button
                      onClick={() => handleDownloadFile(activity.sessionId!, activity.originalFilename || 'download.xlsx')}
                      className="flex items-center gap-1 px-2 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs transition-colors"
                    >
                      <Download className="h-3 w-3" /> Download
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination at bottom */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={total}
            onPageChange={setPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[25, 50, 100, 250]}
          />
        </>
      )}

      {/* Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-slate-800 w-full h-full sm:w-auto sm:max-w-4xl sm:max-h-[85vh] sm:rounded-xl shadow-2xl overflow-hidden flex flex-col">
            {/* Detail Header */}
            <div className={`flex items-center justify-between p-3 sm:p-6 border-b border-slate-700 ${
              selectedActivity.actionType === 'deletion' ? 'bg-red-500/10' :
              selectedActivity.actionType === 'modification' ? 'bg-yellow-500/10' :
              'bg-green-500/10'
            }`}>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  {selectedActivity.actionType === 'new_entry' && <><Plus className="h-5 w-5 text-green-500" /> New Entry Details</>}
                  {selectedActivity.actionType === 'modification' && <><Edit2 className="h-5 w-5 text-yellow-500" /> Modification Details</>}
                  {selectedActivity.actionType === 'deletion' && <><Trash2 className="h-5 w-5 text-red-500" /> Deletion Details</>}
                </h3>
                <div className="text-sm text-gray-400 mt-1">{selectedActivity.eventTitle}</div>
              </div>
              <button onClick={() => { setSelectedActivity(null); setDetailData(null); }} className="text-gray-400 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Detail Metadata */}
            <div className="p-3 sm:p-6 border-b border-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Admin:</span>
                  <span className="ml-2 text-white font-medium">{selectedActivity.userName}</span>
                </div>
                <div>
                  <span className="text-gray-400">Email:</span>
                  <span className="ml-2 text-gray-200">{selectedActivity.userEmail || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Date/Time:</span>
                  <span className="ml-2 text-white font-medium">{formatDateTime(selectedActivity.date)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">Method:</span>
                  <span className="ml-1">{getEntryMethodIcon(selectedActivity.entryMethod)}</span>
                  <span className="text-gray-200">{getEntryMethodLabel(selectedActivity.entryMethod)}</span>
                </div>
                {selectedActivity.competitorNames && selectedActivity.competitorNames.length > 0 && (
                  <div className="sm:col-span-2">
                    <span className="text-gray-400">Member(s):</span>
                    <span className="ml-2 text-white">
                      {selectedActivity.competitorNames.join(', ')}
                    </span>
                  </div>
                )}
                {selectedActivity.resultCount > 1 && (
                  <div>
                    <span className="text-gray-400">Records Affected:</span>
                    <span className="ml-2 text-orange-400 font-semibold">{selectedActivity.resultCount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detail Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-400">Loading details...</div>
                </div>
              ) : selectedActivity.actionType === 'new_entry' && detailData ? (
                /* Session detail: show entries */
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                    <div>
                      <span className="text-gray-400">Results Count:</span>
                      <span className="ml-2 text-orange-400 font-semibold">{detailData.resultCount}</span>
                    </div>
                    {detailData.originalFilename && (
                      <div>
                        <span className="text-gray-400">File:</span>
                        <span className="ml-2 text-gray-200 break-all">{detailData.originalFilename}</span>
                      </div>
                    )}
                    {detailData.format && (
                      <div>
                        <span className="text-gray-400">Format:</span>
                        <span className="ml-2 text-gray-200">{detailData.format}</span>
                      </div>
                    )}
                  </div>
                  {detailData.filePath && (
                    <button
                      onClick={() => handleDownloadFile(detailData.id, detailData.originalFilename || 'download.xlsx')}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors mb-4 text-sm"
                    >
                      <Download className="h-4 w-4" /> Download File
                    </button>
                  )}
                  {detailData.entries && detailData.entries.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-2">Entry Details:</h4>
                      <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                        {detailData.entries.map((entry: any, idx: number) => (
                          <div key={entry.id || idx} className="bg-slate-700/50 rounded p-3 text-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                            <div>
                              <span className="text-gray-400 text-xs">Competitor:</span>
                              <div className="text-white font-medium">{entry.competitorName}</div>
                            </div>
                            <div>
                              <span className="text-gray-400 text-xs">Class:</span>
                              <div className="text-gray-200">{entry.competitionClass}</div>
                            </div>
                            <div>
                              <span className="text-gray-400 text-xs">Score:</span>
                              <div className="text-gray-200">{entry.score}</div>
                            </div>
                            <div>
                              <span className="text-gray-400 text-xs">Points:</span>
                              <div className="text-gray-200">{entry.pointsEarned}</div>
                            </div>
                            {entry.mecaId && (
                              <div className="sm:col-span-2">
                                <span className="text-gray-400 text-xs">MECA ID:</span>
                                <span className={`ml-2 font-mono ${
                                  entry.membershipStatus === 'active' ? 'text-green-400' : 'text-red-400'
                                }`}>{entry.mecaId}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (selectedActivity.actionType === 'modification' || selectedActivity.actionType === 'deletion') && detailData ? (
                /* Modification/Deletion detail - handles both single and grouped */
                <div>
                  {detailData.grouped && detailData.competitorDetails?.length > 0 ? (
                    /* Grouped: show each competitor's changes */
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-white">
                        {selectedActivity.actionType === 'modification' ? 'Changes Made' : 'Deleted Records'}{' '}
                        <span className="text-gray-400 text-sm font-normal">({detailData.competitorDetails.length} records)</span>
                      </h4>
                      {detailData.competitorDetails.map((detail: CompetitorDetail, idx: number) => (
                        <div key={detail.id || idx} className="border border-slate-600 rounded-lg overflow-hidden">
                          {/* Competitor header */}
                          <div className="bg-slate-700 px-4 py-2 flex items-center gap-3 flex-wrap">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-white font-medium text-sm">{detail.competitorName}</span>
                            {detail.mecaId && (
                              <span className={`text-xs font-mono ${getMecaIdColor(detail.membershipStatus)}`}>
                                MECA ID: {detail.mecaId}
                              </span>
                            )}
                            {detail.competitionClass && <span className="text-gray-400 text-xs">Class: {detail.competitionClass}</span>}
                          </div>
                          {/* Changes */}
                          <div className="p-4">
                            {selectedActivity.actionType === 'modification' ? (
                              (() => {
                                const changes = getChangedFields(detail.oldData || {}, detail.newData || {});
                                if (changes.length === 0) {
                                  return <div className="text-gray-400 text-sm">No specific field changes detected</div>;
                                }
                                return (
                                  <div className="space-y-2">
                                    {changes.map((change, i) => (
                                      <div key={i} className="bg-slate-700/50 rounded p-3 border border-slate-600">
                                        <div className="text-xs font-medium text-gray-300 mb-2 capitalize">{change.label}</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <div className="bg-red-500/10 rounded p-2 border border-red-500/30">
                                            <div className="text-xs text-red-400 mb-0.5">Before</div>
                                            <div className="text-white text-sm">{typeof change.oldValue === 'object' ? JSON.stringify(change.oldValue) : String(change.oldValue)}</div>
                                          </div>
                                          <div className="bg-green-500/10 rounded p-2 border border-green-500/30">
                                            <div className="text-xs text-green-400 mb-0.5">After</div>
                                            <div className="text-white text-sm">{typeof change.newValue === 'object' ? JSON.stringify(change.newValue) : String(change.newValue)}</div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()
                            ) : (
                              /* Deletion: show deleted record data */
                              <div className="bg-red-500/10 rounded p-3 border border-red-500/30">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {Object.entries(detail.oldData || {}).map(([key, value]) => {
                                    if (skipFields.includes(key) || value == null) return null;
                                    return (
                                      <div key={key} className="text-sm">
                                        <span className="text-gray-400">
                                          {fieldLabels[key] || key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}:
                                        </span>
                                        <span className="ml-2 text-red-300">{String(value)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Single record modification/deletion */
                    <div>
                      {selectedActivity.actionType === 'modification' ? (
                        <>
                          <h4 className="text-lg font-semibold text-white mb-4">Changes Made</h4>
                          {(() => {
                            const od = detailData.old_data || detailData.competitorDetails?.[0]?.oldData || {};
                            const nd = detailData.new_data || detailData.competitorDetails?.[0]?.newData || {};
                            const changes = getChangedFields(od, nd);
                            if (changes.length === 0) {
                              return <div className="text-gray-400 text-center py-8">No specific field changes detected</div>;
                            }
                            return (
                              <div className="space-y-3">
                                {changes.map((change, i) => (
                                  <div key={i} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                                    <div className="text-sm font-medium text-gray-300 mb-2 capitalize">{change.label}</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="bg-red-500/10 rounded p-3 border border-red-500/30">
                                        <div className="text-xs text-red-400 mb-1">Before</div>
                                        <div className="text-white">{typeof change.oldValue === 'object' ? JSON.stringify(change.oldValue) : String(change.oldValue)}</div>
                                      </div>
                                      <div className="bg-green-500/10 rounded p-3 border border-green-500/30">
                                        <div className="text-xs text-green-400 mb-1">After</div>
                                        <div className="text-white">{typeof change.newValue === 'object' ? JSON.stringify(change.newValue) : String(change.newValue)}</div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                          {(detailData.new_data?.modification_reason || detailData.competitorDetails?.[0]?.newData?.modification_reason) && (
                            <div className="mt-4 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                              <h4 className="text-sm font-semibold text-yellow-400 mb-1">Modification Reason</h4>
                              <p className="text-white">{detailData.new_data?.modification_reason || detailData.competitorDetails?.[0]?.newData?.modification_reason}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {(detailData.new_data?.deletion_reason || detailData.competitorDetails?.[0]?.newData?.deletion_reason) && (
                            <div className="mb-4 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                              <h4 className="text-sm font-semibold text-yellow-400 mb-1">Deletion Reason</h4>
                              <p className="text-white">{detailData.new_data?.deletion_reason || detailData.competitorDetails?.[0]?.newData?.deletion_reason}</p>
                            </div>
                          )}
                          <h4 className="text-lg font-semibold text-white mb-4">Deleted Record Data</h4>
                          <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {Object.entries(detailData.old_data || detailData.competitorDetails?.[0]?.oldData || {}).map(([key, value]) => {
                                if (skipFields.includes(key) || value == null) return null;
                                return (
                                  <div key={key} className="text-sm">
                                    <span className="text-gray-400">
                                      {fieldLabels[key] || key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}:
                                    </span>
                                    <span className="ml-2 text-red-300">{String(value)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">No detail data available</div>
              )}
            </div>

            {/* Detail Footer */}
            <div className="p-3 sm:p-6 border-t border-slate-700">
              <button
                onClick={() => { setSelectedActivity(null); setDetailData(null); }}
                className="px-4 py-2 sm:px-6 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
