import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Repeat, Play, Pause, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import {
  recurringInvoicesApi,
  RecurringInvoiceTemplate,
} from '@/api-client/recurring-invoices.api-client';

/**
 * Admin list page for recurring invoice templates. Templates are created
 * via the existing "Create Invoice" page with a recurring toggle (TODO);
 * for now this list lets admins activate/deactivate/delete and trigger
 * the run-due-templates job manually.
 */
export default function RecurringInvoicesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<RecurringInvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const data = await recurringInvoicesApi.list();
      setTemplates(data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load recurring templates');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetch(); }, []);

  const formatDate = (s?: string) => s ? new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const fmtCurrency = (val: string, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(parseFloat(val) || 0);

  const handleToggle = async (tpl: RecurringInvoiceTemplate) => {
    setBusyId(tpl.id);
    try {
      if (tpl.active) await recurringInvoicesApi.deactivate(tpl.id);
      else await recurringInvoicesApi.activate(tpl.id);
      await fetch();
    } finally {
      setBusyId(null);
    }
  };
  const handleDelete = async (tpl: RecurringInvoiceTemplate) => {
    if (!confirm(`Delete recurring template "${tpl.name}"? This cannot be undone.`)) return;
    setBusyId(tpl.id);
    try {
      await recurringInvoicesApi.remove(tpl.id);
      await fetch();
    } finally {
      setBusyId(null);
    }
  };
  const handleRunDue = async () => {
    if (!confirm('Run the recurring-invoice job now? This will generate invoices for all templates whose next run date is today or earlier.')) return;
    setRunning(true);
    try {
      const r = await recurringInvoicesApi.runDue();
      alert(`Generated ${r.generated} invoice(s); ${r.failed} failed.`);
      await fetch();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="border-b border-slate-700 bg-slate-800">
        <div className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Repeat className="h-7 w-7 text-orange-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Recurring Invoices</h1>
              <p className="text-sm text-gray-400">Templates that auto-generate invoices on a monthly / quarterly / annual cycle</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRunDue}
              disabled={running}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
            >
              <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
              {running ? 'Running…' : 'Run Job Now'}
            </button>
            <button
              onClick={() => navigate('/admin/billing/invoices')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Billing
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-gray-400">Loading…</div>
          ) : templates.length === 0 ? (
            <div className="py-16 text-center">
              <Repeat className="h-12 w-12 mx-auto mb-3 text-slate-600" />
              <p className="text-gray-400 mb-2">No recurring templates yet</p>
              <p className="text-sm text-gray-500">
                Templates can be created via the API for now. Admin creation UI coming soon.
              </p>
            </div>
          ) : (
            <table className="w-full divide-y divide-slate-700">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Template</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Frequency</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Next Run</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Last Run</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {templates.map(tpl => {
                  const computedTotal = tpl.lineItems.reduce(
                    (sum, li) => sum + li.quantity * parseFloat(li.unitPrice || '0'),
                    0,
                  );
                  const total = (computedTotal + parseFloat(tpl.tax || '0') - parseFloat(tpl.discount || '0')).toFixed(2);
                  return (
                    <tr key={tpl.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-white">{tpl.name}</div>
                        <div className="text-xs text-gray-500">{tpl.lineItems.length} item{tpl.lineItems.length !== 1 ? 's' : ''}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {tpl.user ? (
                          <>
                            <div className="text-white">{`${tpl.user.first_name || ''} ${tpl.user.last_name || ''}`.trim() || tpl.user.email}</div>
                            <div className="text-xs text-gray-500">{tpl.user.email}</div>
                          </>
                        ) : (
                          <span className="text-gray-400 italic">External / unlinked</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300 capitalize">
                          {tpl.frequency}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-white font-medium">
                        {fmtCurrency(total, tpl.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{formatDate(tpl.nextRunDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {tpl.lastRunAt ? formatDate(tpl.lastRunAt) : '—'}
                        {tpl.runCount > 0 && (
                          <div className="text-xs text-gray-500">{tpl.runCount} run{tpl.runCount !== 1 ? 's' : ''}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {tpl.active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-gray-400">
                            Paused
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggle(tpl)}
                            disabled={busyId === tpl.id}
                            className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-slate-600 disabled:opacity-50"
                            title={tpl.active ? 'Pause' : 'Activate'}
                          >
                            {tpl.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(tpl)}
                            disabled={busyId === tpl.id}
                            className="p-1.5 rounded text-rose-400 hover:text-rose-300 hover:bg-slate-600 disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
