import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard, Search, Filter, Loader2, Eye, Check, Truck,
  Package, X, ChevronDown, FileText, ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '@/shared/components';
import {
  membershipsApi,
  AdminCardItem,
  AdminCardsFilters,
} from '@/memberships/memberships.api-client';
import {
  membershipTypeConfigsApi,
  MembershipTypeConfig,
} from '@/membership-type-configs/membership-type-configs.api-client';
import MembershipCard from '@/memberships/components/MembershipCard';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Normalize a raw item from either raw SQL or ORM response
function normalizeItem(item: AdminCardItem) {
  return {
    id: item.id,
    mecaId: item.meca_id ?? item.mecaId,
    competitorName: item.competitor_name ?? item.competitorName ?? null,
    startDate: item.start_date ?? item.startDate,
    endDate: item.end_date ?? item.endDate ?? null,
    cardCreatedAt: item.card_created_at ?? item.cardCreatedAt ?? null,
    cardAssignedAt: item.card_assigned_at ?? item.cardAssignedAt ?? null,
    cardShippedAt: item.card_shipped_at ?? item.cardShippedAt ?? null,
    cardTrackingNumber: item.card_tracking_number ?? item.cardTrackingNumber ?? null,
    cardNotes: item.card_notes ?? item.cardNotes ?? null,
    paymentStatus: item.payment_status ?? item.paymentStatus,
    firstName: item.first_name ?? item.user?.firstName ?? '',
    lastName: item.last_name ?? item.user?.lastName ?? '',
    email: item.email ?? item.user?.email ?? '',
    userId: item.user_id ?? item.user?.id ?? '',
    membershipTypeName: item.membership_type_name ?? item.membershipTypeConfig?.name ?? '',
    membershipTypeCategory: item.membership_type_category ?? item.membershipTypeConfig?.category ?? '',
    isActive: item.isActive ?? (item.end_date ? new Date(item.end_date) >= new Date() : false),
  };
}

export default function MembershipCardsAdminPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminCardItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [membershipTypes, setMembershipTypes] = useState<MembershipTypeConfig[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [membershipStatus, setMembershipStatus] = useState<'active' | 'expired' | ''>('');
  const [cardStatus, setCardStatus] = useState<'no_card' | 'created' | 'shipped' | ''>('');
  const [membershipTypeConfigId, setMembershipTypeConfigId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Selected for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail modal
  const [detailItem, setDetailItem] = useState<ReturnType<typeof normalizeItem> | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailForm, setDetailForm] = useState({
    cardCreatedAt: '' as string,
    cardAssignedAt: '' as string,
    cardShippedAt: '' as string,
    cardTrackingNumber: '' as string,
    cardNotes: '' as string,
  });

  // Bulk action loading
  const [bulkLoading, setBulkLoading] = useState(false);

  // Assign all active loading
  const [assignAllLoading, setAssignAllLoading] = useState(false);

  // Server-side stats
  const [cardStats, setCardStats] = useState({ total: 0, cardsCreated: 0, cardsShipped: 0, pending: 0 });

  const fetchCardStats = async () => {
    try {
      const stats = await membershipsApi.getAdminCardStats();
      setCardStats(stats);
    } catch (err) {
      console.error('Failed to fetch card stats:', err);
    }
  };

  useEffect(() => {
    membershipTypeConfigsApi.getAll().then(setMembershipTypes).catch(() => {});
    fetchCardStats();
  }, []);

  useEffect(() => {
    fetchCards();
  }, [currentPage, itemsPerPage, membershipStatus, cardStatus, membershipTypeConfigId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchCards();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const filters: AdminCardsFilters = {
        search: search || undefined,
        membershipStatus: membershipStatus || undefined,
        cardStatus: cardStatus || undefined,
        membershipTypeConfigId: membershipTypeConfigId || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      };
      const result = await membershipsApi.getAdminCardsList(filters);
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to fetch cards:', err);
    } finally {
      setLoading(false);
    }
    fetchCardStats();
  };

  const normalizedItems = useMemo(() => items.map(normalizeItem), [items]);

  const totalPages = Math.ceil(total / itemsPerPage);

  const stats = cardStats;

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === normalizedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(normalizedItems.map(i => i.id)));
    }
  };

  // Bulk actions
  const handleBulkMarkCreated = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      await membershipsApi.bulkUpdateCardStatus(Array.from(selectedIds), {
        cardCreatedAt: new Date().toISOString(),
      });
      setSelectedIds(new Set());
      fetchCards();
    } catch (err) {
      console.error('Bulk update failed:', err);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkMarkShipped = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      await membershipsApi.bulkUpdateCardStatus(Array.from(selectedIds), {
        cardShippedAt: new Date().toISOString(),
      });
      setSelectedIds(new Set());
      fetchCards();
    } catch (err) {
      console.error('Bulk update failed:', err);
    } finally {
      setBulkLoading(false);
    }
  };

  // Assign cards to all active members
  const handleAssignAllActive = async () => {
    if (!confirm('This will mark all active members without a card as "Card Created". Continue?')) return;
    setAssignAllLoading(true);
    try {
      const result = await membershipsApi.assignCardsToAllActive();
      alert(`Successfully assigned cards to ${result.updated} active members.`);
      fetchCards();
    } catch (err) {
      console.error('Assign all failed:', err);
      alert('Failed to assign cards. Please try again.');
    } finally {
      setAssignAllLoading(false);
    }
  };

  // Open detail modal
  const openDetail = (item: ReturnType<typeof normalizeItem>) => {
    setDetailItem(item);
    setDetailForm({
      cardCreatedAt: item.cardCreatedAt ? new Date(item.cardCreatedAt).toISOString().slice(0, 16) : '',
      cardAssignedAt: item.cardAssignedAt ? new Date(item.cardAssignedAt).toISOString().slice(0, 16) : '',
      cardShippedAt: item.cardShippedAt ? new Date(item.cardShippedAt).toISOString().slice(0, 16) : '',
      cardTrackingNumber: item.cardTrackingNumber || '',
      cardNotes: item.cardNotes || '',
    });
    setDetailModalOpen(true);
  };

  const saveDetail = async () => {
    if (!detailItem) return;
    setDetailSaving(true);
    try {
      await membershipsApi.updateCardStatus(detailItem.id, {
        cardCreatedAt: detailForm.cardCreatedAt ? new Date(detailForm.cardCreatedAt).toISOString() : null,
        cardAssignedAt: detailForm.cardAssignedAt ? new Date(detailForm.cardAssignedAt).toISOString() : null,
        cardShippedAt: detailForm.cardShippedAt ? new Date(detailForm.cardShippedAt).toISOString() : null,
        cardTrackingNumber: detailForm.cardTrackingNumber || null,
        cardNotes: detailForm.cardNotes || null,
      });
      setDetailModalOpen(false);
      fetchCards();
    } catch (err) {
      console.error('Failed to save card status:', err);
    } finally {
      setDetailSaving(false);
    }
  };

  // Quick mark created
  const quickMarkCreated = async (id: string) => {
    try {
      await membershipsApi.updateCardStatus(id, {
        cardCreatedAt: new Date().toISOString(),
      });
      fetchCards();
    } catch (err) {
      console.error('Quick mark failed:', err);
    }
  };

  // Quick mark shipped
  const quickMarkShipped = async (id: string) => {
    try {
      await membershipsApi.updateCardStatus(id, {
        cardShippedAt: new Date().toISOString(),
      });
      fetchCards();
    } catch (err) {
      console.error('Quick mark failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-orange-500" />
              Membership Card Management
            </h1>
            <p className="text-slate-400 mt-1">Track and manage physical membership ID cards</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <button
              onClick={handleAssignAllActive}
              disabled={assignAllLoading}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {assignAllLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              Assign Cards to All Active Members
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Total Members</p>
            <p className="text-2xl font-bold text-white">{total}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Cards Created</p>
            <p className="text-2xl font-bold text-blue-400">{stats.cardsCreated}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Cards Shipped</p>
            <p className="text-2xl font-bold text-green-400">{stats.cardsShipped}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-bold text-orange-400">{stats.pending}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search name, email, MECA ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Membership Status */}
            <select
              value={membershipStatus}
              onChange={e => { setMembershipStatus(e.target.value as any); setCurrentPage(1); }}
              className="bg-slate-700 border border-slate-600 rounded-lg text-white text-sm px-3 py-2 focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>

            {/* Card Status */}
            <select
              value={cardStatus}
              onChange={e => { setCardStatus(e.target.value as any); setCurrentPage(1); }}
              className="bg-slate-700 border border-slate-600 rounded-lg text-white text-sm px-3 py-2 focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Card Statuses</option>
              <option value="no_card">No Card Created</option>
              <option value="created">Card Created</option>
              <option value="shipped">Card Shipped</option>
            </select>

            {/* Membership Type */}
            <select
              value={membershipTypeConfigId}
              onChange={e => { setMembershipTypeConfigId(e.target.value); setCurrentPage(1); }}
              className="bg-slate-700 border border-slate-600 rounded-lg text-white text-sm px-3 py-2 focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Types</option>
              {membershipTypes.filter(t => t.isActive && !t.isUpgradeOnly).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 mb-4 flex items-center gap-4">
            <span className="text-orange-400 text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <button
              onClick={handleBulkMarkCreated}
              disabled={bulkLoading}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Package className="w-3.5 h-3.5" />
              Mark Created
            </button>
            <button
              onClick={handleBulkMarkShipped}
              disabled={bulkLoading}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Truck className="w-3.5 h-3.5" />
              Mark Shipped
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
            >
              Clear
            </button>
            {bulkLoading && <Loader2 className="w-4 h-4 animate-spin text-orange-500" />}
          </div>
        )}

        {/* Table */}
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : normalizedItems.length === 0 ? (
            <div className="text-center py-20">
              <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No memberships found matching your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-700">
                    <th className="p-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === normalizedItems.length && normalizedItems.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500"
                      />
                    </th>
                    <th className="p-3">Member</th>
                    <th className="p-3">MECA ID</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Card Created</th>
                    <th className="p-3">Card Assigned</th>
                    <th className="p-3">Card Shipped</th>
                    <th className="p-3">Tracking #</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedItems.map(item => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => openDetail(item)}
                    >
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500"
                        />
                      </td>
                      <td className="p-3">
                        <div className="text-white font-medium">
                          {item.competitorName || `${item.firstName} ${item.lastName}`.trim() || 'Unknown'}
                        </div>
                        <div className="text-slate-500 text-xs">{item.email}</div>
                      </td>
                      <td className="p-3 text-orange-400 font-mono font-bold">{item.mecaId}</td>
                      <td className="p-3 text-slate-300">{item.membershipTypeName}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          item.isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {item.isActive ? 'Active' : 'Expired'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 text-xs">{formatDate(item.cardCreatedAt)}</td>
                      <td className="p-3 text-slate-300 text-xs">{formatDate(item.cardAssignedAt)}</td>
                      <td className="p-3 text-slate-300 text-xs">{formatDate(item.cardShippedAt)}</td>
                      <td className="p-3 text-slate-400 text-xs font-mono">{item.cardTrackingNumber || '\u2014'}</td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {!item.cardCreatedAt && (
                            <button
                              onClick={() => quickMarkCreated(item.id)}
                              title="Mark Created"
                              className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                            >
                              <Package className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {item.cardCreatedAt && !item.cardShippedAt && (
                            <button
                              onClick={() => quickMarkShipped(item.id)}
                              title="Mark Shipped"
                              className="p-1.5 text-green-400 hover:bg-green-500/20 rounded transition-colors"
                            >
                              <Truck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => openDetail(item)}
                            title="View Details"
                            className="p-1.5 text-slate-400 hover:bg-slate-600 rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-700">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={total}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {detailModalOpen && detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setDetailModalOpen(false)}>
          <div className="bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Card Details</h2>
                <button onClick={() => setDetailModalOpen(false)} className="p-1 hover:bg-slate-700 rounded">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Card Preview */}
              <div className="mb-6 flex justify-center">
                <MembershipCard
                  memberName={detailItem.competitorName || `${detailItem.firstName} ${detailItem.lastName}`.trim() || 'Unknown'}
                  mecaId={detailItem.mecaId}
                  memberSince={detailItem.startDate}
                  expirationDate={detailItem.endDate}
                  membershipId={detailItem.id}
                  showPrintButton={false}
                />
              </div>

              {/* Member Info */}
              <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                <div>
                  <p className="text-slate-500 text-xs uppercase">Name</p>
                  <p className="text-white">{detailItem.competitorName || `${detailItem.firstName} ${detailItem.lastName}`.trim()}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase">MECA ID</p>
                  <p className="text-orange-400 font-bold">{detailItem.mecaId}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase">Type</p>
                  <p className="text-white">{detailItem.membershipTypeName}</p>
                </div>
              </div>

              {/* Card Tracking Form */}
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-white">Card Tracking</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-400 text-xs uppercase mb-1">Card Created</label>
                    <input
                      type="datetime-local"
                      value={detailForm.cardCreatedAt}
                      onChange={e => setDetailForm(f => ({ ...f, cardCreatedAt: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg text-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs uppercase mb-1">Card Assigned</label>
                    <input
                      type="datetime-local"
                      value={detailForm.cardAssignedAt}
                      onChange={e => setDetailForm(f => ({ ...f, cardAssignedAt: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg text-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs uppercase mb-1">Card Shipped</label>
                    <input
                      type="datetime-local"
                      value={detailForm.cardShippedAt}
                      onChange={e => setDetailForm(f => ({ ...f, cardShippedAt: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg text-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-xs uppercase mb-1">Tracking Number</label>
                  <input
                    type="text"
                    value={detailForm.cardTrackingNumber}
                    onChange={e => setDetailForm(f => ({ ...f, cardTrackingNumber: e.target.value }))}
                    placeholder="Enter tracking number..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg text-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-xs uppercase mb-1">Notes</label>
                  <textarea
                    value={detailForm.cardNotes}
                    onChange={e => setDetailForm(f => ({ ...f, cardNotes: e.target.value }))}
                    placeholder="Add notes about this card..."
                    rows={3}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg text-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setDetailModalOpen(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveDetail}
                    disabled={detailSaving}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {detailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
