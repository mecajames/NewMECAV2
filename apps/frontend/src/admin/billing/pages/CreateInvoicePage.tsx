import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Search, Save, ChevronDown, X } from 'lucide-react';
import { billingApi, CreateInvoiceDto } from '@/api-client/billing.api-client';
import { profilesApi } from '@/profiles';
import { membershipTypeConfigsApi, MembershipTypeConfig } from '@/membership-type-configs/membership-type-configs.api-client';
import { shopApi } from '@/shop/shop.api-client';
import type { ShopProduct } from '@newmeca/shared';

interface ItemRow {
  description: string;
  quantity: number;
  unitPrice: string;
  itemType: string;
  /** UUID of the membership type or shop product if picked from a preset (informational). */
  referenceId?: string;
}

/** Catalog entry rendered in the line-item typeahead. */
type CatalogEntry =
  | { kind: 'membership'; id: string; label: string; sublabel: string; price: number; itemType: 'membership' }
  | { kind: 'shop'; id: string; label: string; sublabel: string; price: number; itemType: 'shop_product' };

export default function CreateInvoicePage() {
  const navigate = useNavigate();

  // ── Customer ──────────────────────────────────────────────────────────
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Customer details — usable both with and without a linked member. When
  // a member is picked we prefill these from the profile; admin can still
  // override before submitting.
  const [custName, setCustName] = useState('');
  const [custCompany, setCustCompany] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress1, setCustAddress1] = useState('');
  const [custAddress2, setCustAddress2] = useState('');
  const [custCity, setCustCity] = useState('');
  const [custState, setCustState] = useState('');
  const [custPostalCode, setCustPostalCode] = useState('');
  const [custCountry, setCustCountry] = useState('USA');

  // ── Line items ────────────────────────────────────────────────────────
  const [items, setItems] = useState<ItemRow[]>([
    { description: '', quantity: 1, unitPrice: '0.00', itemType: 'other' },
  ]);

  // Catalog cache — fetched once on mount, used for the typeahead picker.
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  // Per-row picker state (which row's dropdown is open + its current query).
  const [pickerOpenIdx, setPickerOpenIdx] = useState<number | null>(null);
  const [pickerQueries, setPickerQueries] = useState<Record<number, string>>({});
  const pickerRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // ── Misc ──────────────────────────────────────────────────────────────
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load membership types + shop products once.
  useEffect(() => {
    (async () => {
      try {
        const [memTypes, shopProducts] = await Promise.all([
          membershipTypeConfigsApi.getAll(false).catch((): MembershipTypeConfig[] => []),
          shopApi.getProducts().catch((): ShopProduct[] => []),
        ]);
        const entries: CatalogEntry[] = [];
        for (const m of memTypes) {
          entries.push({
            kind: 'membership',
            id: m.id,
            label: m.name,
            sublabel: `${m.category} membership`,
            price: Number(m.price ?? 0),
            itemType: 'membership',
          });
        }
        for (const p of shopProducts) {
          entries.push({
            kind: 'shop',
            id: p.id,
            label: p.name,
            sublabel: `${p.category}${p.sku ? ` · SKU ${p.sku}` : ''}`,
            price: Number(p.price ?? 0),
            itemType: 'shop_product',
          });
        }
        setCatalog(entries);
      } finally {
        setCatalogLoaded(true);
      }
    })();
  }, []);

  // Close pickers on outside click.
  useEffect(() => {
    if (pickerOpenIdx === null) return;
    const onClick = (e: MouseEvent) => {
      const ref = pickerRefs.current[pickerOpenIdx];
      if (ref && !ref.contains(e.target as Node)) {
        setPickerOpenIdx(null);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [pickerOpenIdx]);

  const searchMembers = async (q: string) => {
    setMemberSearch(q);
    if (!q || q.length < 2) {
      setMemberResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await profilesApi.searchProfiles(q);
      setMemberResults(res);
    } catch {
      setMemberResults([]);
    } finally {
      setSearching(false);
    }
  };

  const pickMember = (m: any) => {
    setSelectedMember(m);
    setMemberResults([]);
    setMemberSearch('');
    // Prefill customer details — admin can edit any field afterward.
    const fullName = `${m.first_name || ''} ${m.last_name || ''}`.trim();
    setCustName(fullName);
    setCustEmail(m.email || '');
    setCustPhone(m.phone || '');
    setCustAddress1(m.address || m.billing_street || '');
    setCustAddress2('');
    setCustCity(m.city || m.billing_city || '');
    setCustState(m.state || m.billing_state || '');
    setCustPostalCode(m.postal_code || m.billing_zip || '');
    setCustCountry(m.country || m.billing_country || 'USA');
  };

  const clearMember = () => {
    setSelectedMember(null);
    // Customer fields stay populated — admin may have just been using the
    // member as a starting point for a non-member invoice. Clear-all is a
    // separate explicit button below.
  };

  const clearCustomerFields = () => {
    setCustName('');
    setCustCompany('');
    setCustEmail('');
    setCustPhone('');
    setCustAddress1('');
    setCustAddress2('');
    setCustCity('');
    setCustState('');
    setCustPostalCode('');
    setCustCountry('USA');
  };

  const setItem = (idx: number, patch: Partial<ItemRow>) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addItem = () => setItems(prev => [
    ...prev,
    { description: '', quantity: 1, unitPrice: '0.00', itemType: 'other' },
  ]);

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
    setPickerOpenIdx(null);
  };

  const applyCatalogEntry = (idx: number, entry: CatalogEntry) => {
    setItem(idx, {
      description: entry.label,
      itemType: entry.itemType,
      unitPrice: entry.price.toFixed(2),
      referenceId: entry.id,
    });
    setPickerOpenIdx(null);
    setPickerQueries(q => ({ ...q, [idx]: '' }));
  };

  const filterCatalog = (query: string): CatalogEntry[] => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(e =>
      e.label.toLowerCase().includes(q) || e.sublabel.toLowerCase().includes(q),
    );
  };

  const subtotal = items.reduce((sum, it) => sum + (it.quantity * parseFloat(it.unitPrice || '0')), 0);

  const handleSubmit = async () => {
    setError(null);
    if (items.length === 0) {
      setError('At least one line item is required.');
      return;
    }
    for (const it of items) {
      if (!it.description.trim()) {
        setError('Every line item needs a description.');
        return;
      }
      if (it.quantity <= 0) {
        setError('Quantity must be at least 1 on every line item.');
        return;
      }
    }
    setSubmitting(true);
    try {
      // Build billing address from the customer fields. Skip wholly-empty
      // addresses (don't send {} which clutters the JSON).
      const billingAddress = (custName || custCompany || custEmail || custPhone
        || custAddress1 || custAddress2 || custCity || custState || custPostalCode)
        ? {
            name: custName || undefined,
            company: custCompany || undefined,
            email: custEmail || undefined,
            phone: custPhone || undefined,
            address1: custAddress1 || undefined,
            address2: custAddress2 || undefined,
            city: custCity || undefined,
            state: custState || undefined,
            postalCode: custPostalCode || undefined,
            country: custCountry || undefined,
          }
        : undefined;

      const dto: CreateInvoiceDto = {
        userId: selectedMember?.id,
        dueDate: dueDate || undefined,
        items: items.map(it => ({
          description: it.description.trim(),
          quantity: it.quantity,
          unitPrice: parseFloat(it.unitPrice).toFixed(2),
          itemType: it.itemType,
          referenceId: it.referenceId,
        })),
        billingAddress,
        notes: notes.trim() || undefined,
      };
      const created = await billingApi.createInvoice(dto);
      navigate(`/admin/billing/invoices/${created.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => navigate('/admin/billing/invoices')}
          className="mb-4 inline-flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Invoices
        </button>

        <h1 className="text-3xl font-bold text-white mb-1">Create Invoice</h1>
        <p className="text-gray-400 text-sm mb-6">
          Pick a member to prefill billing details, or fill them in manually for an
          external recipient. Add line items by searching the catalog (memberships,
          shop products) or typing a custom description.
        </p>

        {/* ── Customer block ─────────────────────────────────────────── */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Customer</h2>
            {selectedMember && (
              <button
                onClick={clearMember}
                className="text-xs text-gray-400 hover:text-white"
              >
                Unlink member
              </button>
            )}
          </div>

          {selectedMember ? (
            <div className="flex items-center justify-between bg-slate-700/40 px-4 py-3 rounded-lg border border-slate-700 mb-4">
              <div>
                <div className="text-white font-medium">
                  {selectedMember.first_name} {selectedMember.last_name}
                </div>
                <div className="text-xs text-gray-400">
                  {selectedMember.email}
                  {selectedMember.meca_id && (
                    <span className="ml-2 text-orange-400">#{selectedMember.meca_id}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search a member by name, email, or MECA ID — optional"
                  value={memberSearch}
                  onChange={(e) => searchMembers(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              {memberSearch && memberResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {memberResults.map(m => (
                    <button
                      key={m.id}
                      onClick={() => pickMember(m)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 border-b border-slate-700 last:border-0"
                    >
                      <div className="text-white">{m.first_name} {m.last_name}</div>
                      <div className="text-xs text-gray-400">
                        {m.email}
                        {m.meca_id && <span className="ml-2 text-orange-400">#{m.meca_id}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {memberSearch && !searching && memberResults.length === 0 && memberSearch.length >= 2 && (
                <p className="text-xs text-gray-500 mt-2">No matches. Fill in the customer details manually below — the invoice will be unlinked.</p>
              )}
            </div>
          )}

          {/* Editable customer details — used regardless of whether a member is linked */}
          <div className="border-t border-slate-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-300 font-medium">Billing details {selectedMember && <span className="text-xs text-gray-500">(prefilled — editable)</span>}</p>
              <button
                onClick={clearCustomerFields}
                className="text-xs text-gray-500 hover:text-white inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear all
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Name" value={custName} onChange={setCustName} placeholder="Full name" />
              <Field label="Company" value={custCompany} onChange={setCustCompany} placeholder="Company / business name (optional)" />
              <Field label="Email" value={custEmail} onChange={setCustEmail} placeholder="email@example.com" type="email" />
              <Field label="Phone" value={custPhone} onChange={setCustPhone} placeholder="(555) 123-4567" />
              <Field label="Address line 1" value={custAddress1} onChange={setCustAddress1} placeholder="Street address" wide />
              <Field label="Address line 2" value={custAddress2} onChange={setCustAddress2} placeholder="Apt, suite, unit (optional)" wide />
              <Field label="City" value={custCity} onChange={setCustCity} />
              <Field label="State / Province" value={custState} onChange={setCustState} />
              <Field label="Postal Code" value={custPostalCode} onChange={setCustPostalCode} />
              <Field label="Country" value={custCountry} onChange={setCustCountry} />
            </div>
          </div>
        </div>

        {/* ── Line Items block ───────────────────────────────────────── */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Line Items</h2>
            <button
              onClick={addItem}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg"
            >
              <Plus className="h-4 w-4" /> Add Line
            </button>
          </div>

          <div className="space-y-3">
            {items.map((it, idx) => {
              const pickerQuery = pickerQueries[idx] ?? '';
              const filtered = filterCatalog(it.description || pickerQuery);

              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  {/* Description with typeahead */}
                  <div className="col-span-6 relative" ref={(el) => { pickerRefs.current[idx] = el; }}>
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={it.description}
                        onChange={(e) => {
                          setItem(idx, { description: e.target.value, referenceId: undefined });
                          setPickerOpenIdx(idx);
                          setPickerQueries(q => ({ ...q, [idx]: e.target.value }));
                        }}
                        onFocus={() => setPickerOpenIdx(idx)}
                        placeholder="Search memberships / shop products, or type a custom item"
                        className="w-full pr-8 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <ChevronDown
                        onClick={() => setPickerOpenIdx(pickerOpenIdx === idx ? null : idx)}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer transition-transform ${pickerOpenIdx === idx ? 'rotate-180' : ''}`}
                      />
                    </div>
                    {it.referenceId && (
                      <div className="text-[10px] text-emerald-400 mt-0.5">
                        Linked to {it.itemType === 'membership' ? 'membership type' : 'shop product'}
                      </div>
                    )}
                    {pickerOpenIdx === idx && (
                      <div className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-slate-800 border border-slate-600 rounded-lg shadow-xl">
                        {!catalogLoaded ? (
                          <div className="px-3 py-3 text-sm text-gray-500">Loading catalog…</div>
                        ) : filtered.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-gray-400">
                            No catalog match. Continue typing to add this as a custom line.
                          </div>
                        ) : (
                          <>
                            {(['membership', 'shop'] as Array<'membership' | 'shop'>).map(group => {
                              const inGroup = filtered.filter(e => e.kind === group);
                              if (inGroup.length === 0) return null;
                              return (
                                <div key={group}>
                                  <div className="px-3 py-1.5 bg-slate-900/50 text-[10px] uppercase tracking-wider text-gray-400 sticky top-0">
                                    {group === 'membership' ? 'Memberships' : 'Shop Products'}
                                  </div>
                                  {inGroup.map(e => (
                                    <button
                                      key={`${e.kind}-${e.id}`}
                                      onClick={() => applyCatalogEntry(idx, e)}
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 border-b border-slate-700 last:border-0"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="text-white">{e.label}</div>
                                          <div className="text-xs text-gray-400">{e.sublabel}</div>
                                        </div>
                                        <div className="text-emerald-400 text-sm font-medium">
                                          ${e.price.toFixed(2)}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Type</label>
                    <select
                      value={it.itemType}
                      onChange={(e) => setItem(idx, { itemType: e.target.value })}
                      className="w-full px-2 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                    >
                      <option value="membership">Membership</option>
                      <option value="event_class">Event Class</option>
                      <option value="shop_product">Shop Product</option>
                      <option value="processing_fee">Processing Fee</option>
                      <option value="discount">Discount</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-400 mb-1">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => setItem(idx, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="w-full px-2 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Unit Price</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={it.unitPrice}
                      onChange={(e) => setItem(idx, { unitPrice: e.target.value })}
                      className="w-full px-2 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div className="col-span-1 flex items-end justify-end h-full pb-1">
                    <button
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      className="px-2 py-2 text-rose-400 hover:text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end mt-4 pt-3 border-t border-slate-700">
            <div className="text-right">
              <div className="text-xs text-gray-400">Subtotal</div>
              <div className="text-2xl font-bold text-white">${subtotal.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* ── Due date + notes ───────────────────────────────────────── */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Notes (internal)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional internal notes"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-sm rounded p-3 mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={() => navigate('/admin/billing/invoices')}
            disabled={submitting}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
          >
            <Save className="h-4 w-4" />
            {submitting ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Tiny labeled-input helper used by the customer details grid. */
function Field({
  label, value, onChange, placeholder, type = 'text', wide = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
    </div>
  );
}
