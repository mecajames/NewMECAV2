import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2, FileText, CreditCard } from 'lucide-react';
import { membershipsApi, Membership } from '@/memberships';
import { renderMembershipReceiptHtml } from '@/billing/membershipReceiptHtml';

function formatCurrency(value: string | number | undefined | null): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(num) || 0);
}

function formatDate(value?: string | Date | null): string {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function statusPill(status: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    paid: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Paid' },
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pending' },
    failed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Declined' },
    refunded: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Refunded' },
    cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Cancelled' },
    processing: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Processing' },
  };
  const c = map[status?.toLowerCase()] || { bg: 'bg-slate-500/20', text: 'text-slate-300', label: status || 'Unknown' };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${c.bg} ${c.text} uppercase tracking-wider`}>
      {c.label}
    </span>
  );
}

function inferPaymentMethod(m: Membership): string {
  if (m.stripePaymentIntentId) return 'Credit / Debit Card (Stripe)';
  if (m.paypalSubscriptionId) return 'PayPal';
  const tx = (m.transactionId || '').toLowerCase();
  if (tx.includes('cash')) return 'Cash';
  if (tx.includes('check') || tx.includes('cheque')) return 'Check';
  if (tx.includes('comp') || tx.includes('admin')) return 'Complimentary / Admin';
  if (Number(m.amountPaid ?? 0) === 0) return 'Complimentary / No Charge';
  if (m.paymentStatus === 'pending') return 'Pending Payment';
  return m.transactionId ? 'Other' : 'Not Recorded';
}

export default function MembershipReceiptPage() {
  const navigate = useNavigate();
  const { membershipId } = useParams<{ membershipId: string }>();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membershipId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await membershipsApi.getById(membershipId);
        if (!cancelled) setMembership(data);
      } catch (err: any) {
        console.error('Failed to load membership:', err);
        if (!cancelled) setError(err?.response?.data?.message || 'Membership not found.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [membershipId]);

  // Open the clean printable receipt (white background, MECA logo, invoice-style template) in a new tab.
  const handlePrint = () => {
    if (!membership) return;
    const html = renderMembershipReceiptHtml(membership);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !membership) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Membership unavailable</h2>
            <p className="text-gray-400 mb-6">{error || 'This membership could not be loaded.'}</p>
            <button
              onClick={() => navigate('/billing?tab=memberships')}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              Back to Payments &amp; Invoices
            </button>
          </div>
        </div>
      </div>
    );
  }

  const planName = (membership as any).membershipTypeConfig?.name || 'Membership';
  const planCategory = (membership as any).membershipTypeConfig?.category;
  const memberName = membership.competitorName ||
    [(membership.user as any)?.first_name, (membership.user as any)?.last_name].filter(Boolean).join(' ') ||
    (membership.user as any)?.email ||
    'Member';
  const memberEmail = (membership.user as any)?.email;
  const paymentMethod = inferPaymentMethod(membership);
  const amount = Number(membership.amountPaid ?? 0);
  const reference = membership.mecaId
    ? `MECA-${membership.mecaId}`
    : `MECA-${String(membership.id).slice(0, 8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top action bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <button
            onClick={() => navigate('/billing?tab=memberships')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Payments &amp; Invoices
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print / Download
          </button>
        </div>

        {/* Receipt card */}
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-orange-500" />
                  </div>
                  <h1 className="text-3xl font-bold text-white">Membership Receipt</h1>
                </div>
                <p className="text-gray-400 font-mono text-sm">{reference}</p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2">
                {statusPill(membership.paymentStatus)}
                <p className="text-3xl font-bold text-white">{formatCurrency(amount)}</p>
              </div>
            </div>
          </div>

          {/* Member & Plan */}
          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-700">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Member</p>
              <p className="text-white font-semibold">{memberName}</p>
              {memberEmail && <p className="text-gray-400 text-sm">{memberEmail}</p>}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Membership Plan</p>
              <p className="text-white font-semibold">{planName}</p>
              {planCategory && <p className="text-gray-400 text-sm capitalize">{planCategory}</p>}
            </div>
          </div>

          {/* Dates */}
          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-slate-700">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Start Date</p>
              <p className="text-white">{formatDate(membership.startDate)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Expiration</p>
              <p className="text-white">{formatDate(membership.endDate)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Auto-Renewal</p>
              <p className="text-white">
                {membership.stripePaymentIntentId || membership.paypalSubscriptionId ? 'Configured' : 'Off'}
              </p>
            </div>
          </div>

          {/* Payment Details */}
          <div className="p-6 sm:p-8 border-b border-slate-700">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-4">Payment Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Payment Method</span>
                <span className="text-white text-right">{paymentMethod}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Status</span>
                <span className="text-white text-right capitalize">{membership.paymentStatus}</span>
              </div>
              {membership.transactionId && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Transaction ID</span>
                  <span className="text-white text-right font-mono text-xs">{membership.transactionId}</span>
                </div>
              )}
              {membership.stripePaymentIntentId && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Stripe Intent</span>
                  <span className="text-white text-right font-mono text-xs">{membership.stripePaymentIntentId}</span>
                </div>
              )}
              {membership.paypalSubscriptionId && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">PayPal Subscription</span>
                  <span className="text-white text-right font-mono text-xs">{membership.paypalSubscriptionId}</span>
                </div>
              )}
              <div className="flex justify-between gap-4 sm:col-span-2 border-t border-slate-700 pt-3 mt-1">
                <span className="text-white font-semibold">Total</span>
                <span className="text-orange-400 font-bold">{formatCurrency(amount)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 sm:p-8 bg-slate-900/40">
            <p className="text-xs text-gray-500">
              For questions about this receipt, contact{' '}
              <a href="mailto:billing@mecacaraudio.com" className="text-orange-400 hover:text-orange-300">
                billing@mecacaraudio.com
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
