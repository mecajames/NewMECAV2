import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trophy, CheckCircle, AlertCircle, ShoppingCart, Minus, Plus, Package, MapPin, Calendar, Shirt } from 'lucide-react';
import { worldFinalsApi } from '@/api-client/world-finals.api-client';
import { competitionFormatsApi } from '@/competition-formats';
import { competitionClassesApi } from '@/competition-classes';

const DEFAULT_TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
const DEFAULT_RING_SIZES = ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13', '14', '15'];

export default function WorldFinalsPreRegisterPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const isPreview = searchParams.get('preview') === 'true';
  const previewSeasonId = searchParams.get('seasonId') || '';
  const previewEventId = searchParams.get('eventId') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);

  // Selection state
  const [selectedGroupIdx, setSelectedGroupIdx] = useState<number>(-1);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [selectedClasses, setSelectedClasses] = useState<any[]>([]);
  const [addonSelections, setAddonSelections] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    tshirtSize: '', ringSize: '',
    hotelNeeded: false, hotelNotes: '',
    guestCount: 0, notes: '',
  });
  const [extraTshirtSizes, setExtraTshirtSizes] = useState<string[]>([]);

  // Lookups so the eligible-class checkbox grid sorts by the same admin-
  // editable Display Order as the public Results page. Backend's
  // pkg.eligibleClasses is a flat list of { class_name, format, ... } with
  // no order info, so we build (format -> display_order) and
  // (format::name -> class.display_order) maps client-side and sort with
  // them. Failure is non-fatal — falls back to backend insertion order.
  const [formatOrder, setFormatOrder] = useState<Map<string, number>>(new Map());
  const [classOrder, setClassOrder] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    Promise.all([competitionFormatsApi.getActive(), competitionClassesApi.getActive()])
      .then(([formats, classes]) => {
        setFormatOrder(new Map(formats.map(f => [f.name, f.display_order])));
        // Same (format, name) pair can recur per season — keep the lowest
        // display_order so admin tweaks to one season don't reorder the
        // pre-register grid for another.
        const co = new Map<string, number>();
        for (const c of classes) {
          const key = `${c.format}::${c.name}`;
          const prev = co.get(key);
          if (prev === undefined || c.display_order < prev) co.set(key, c.display_order);
        }
        setClassOrder(co);
      })
      .catch(err => console.error('Error fetching format/class lookups:', err));
  }, []);

  useEffect(() => {
    if (isPreview && previewSeasonId) {
      worldFinalsApi.getPreRegistrationPreview(previewSeasonId, previewEventId || undefined)
        .then(data => {
          setValidation(data);
          setForm(prev => ({ ...prev, firstName: data.competitor.firstName || '', lastName: data.competitor.lastName || '', email: data.competitor.email || '' }));
          if (data.eventGroups?.length === 1) setSelectedGroupIdx(0);
        })
        .catch(err => setError(err?.response?.data?.message || 'No pre-registration config found for this season. Set up packages first.'))
        .finally(() => setLoading(false));
      return;
    }
    if (isPreview) { setError('Season ID required for preview. Use ?preview=true&seasonId=xxx'); setLoading(false); return; }
    if (!token) { setError('No registration token provided. Please use the link from your invitation email.'); setLoading(false); return; }
    worldFinalsApi.validatePreRegistration(token)
      .then(data => {
        setValidation(data);
        setForm(prev => ({ ...prev, firstName: data.competitor.firstName || '', lastName: data.competitor.lastName || '', email: data.competitor.email || '' }));
        if (data.eventGroups?.length === 1) setSelectedGroupIdx(0);
      })
      .catch(err => setError(err?.response?.data?.message || 'Invalid or expired registration link.'))
      .finally(() => setLoading(false));
  }, [token, isPreview, previewSeasonId, previewEventId]);

  // Reset package/class when group changes
  useEffect(() => { setSelectedPackageId(''); setSelectedClasses([]); setAddonSelections({}); }, [selectedGroupIdx]);
  useEffect(() => { setSelectedClasses([]); }, [selectedPackageId]);

  const eventGroups: any[] = validation?.eventGroups || [];
  const selectedGroup = selectedGroupIdx >= 0 ? eventGroups[selectedGroupIdx] : null;
  const config = validation?.config;

  // Flatten all packages from all events in the selected group
  const availablePackages = useMemo(() => {
    if (!selectedGroup) return [];
    const pkgs: any[] = [];
    for (const evt of selectedGroup.events) {
      for (const pkg of evt.packages) {
        if (pkg.eligibleClasses?.length > 0) {
          pkgs.push({ ...pkg, _eventId: evt.id, _eventName: evt.name, _pricingTier: evt.pricingTier });
        }
      }
    }
    return pkgs;
  }, [selectedGroup]);

  // Auto-select if only one package
  useEffect(() => {
    const unregistered = availablePackages.filter(p => !p.alreadyRegistered);
    if (unregistered.length === 1) setSelectedPackageId(unregistered[0].id);
  }, [availablePackages]);

  const selectedPkg = availablePackages.find(p => p.id === selectedPackageId);
  // Sort eligible classes by (format.display_order, class.display_order,
  // class_name) so this page matches the Results-page panel order. Unknown
  // formats/classes fall back to +Infinity which sorts them to the end.
  const eligibleClasses = useMemo(() => {
    const raw: any[] = selectedPkg?.eligibleClasses || [];
    return [...raw].sort((a, b) => {
      const fa = formatOrder.get(a.format) ?? Number.POSITIVE_INFINITY;
      const fb = formatOrder.get(b.format) ?? Number.POSITIVE_INFINITY;
      if (fa !== fb) return fa - fb;
      const ca = classOrder.get(`${a.format}::${a.class_name}`) ?? Number.POSITIVE_INFINITY;
      const cb = classOrder.get(`${b.format}::${b.class_name}`) ?? Number.POSITIVE_INFINITY;
      if (ca !== cb) return ca - cb;
      return String(a.class_name).localeCompare(String(b.class_name));
    });
  }, [selectedPkg, formatOrder, classOrder]);
  const isEarlyBird = selectedPkg?._pricingTier === 'early_bird';
  const addonItems = selectedGroup?.addonItems || [];

  // Find the event for pricing tier display
  const selectedEvent = selectedGroup?.events?.find((e: any) =>
    e.packages?.some((p: any) => p.id === selectedPackageId)
  );

  const toggleClass = (cls: any) => {
    setSelectedClasses(prev => {
      const exists = prev.find(c => c.class_name === cls.class_name);
      if (exists) return prev.filter(c => c.class_name !== cls.class_name);
      return [...prev, cls];
    });
  };

  const updateAddonQty = (itemId: string, delta: number, max: number) => {
    setAddonSelections(prev => ({ ...prev, [itemId]: Math.max(0, Math.min(max, (prev[itemId] || 0) + delta)) }));
  };

  const extraTshirtTotalQty = extraTshirtSizes.length;
  const extraTshirtPrice = Number(config?.extra_tshirt_price || 25);

  const pricing = useMemo(() => {
    if (!selectedPkg || selectedClasses.length === 0) return null;
    const basePrice = isEarlyBird ? Number(selectedPkg.base_price_early) : Number(selectedPkg.base_price_regular);
    const additionalPrice = isEarlyBird ? Number(selectedPkg.additional_class_price_early) : Number(selectedPkg.additional_class_price_regular);
    const includedClasses = Number(selectedPkg.included_classes);

    const standardClasses = selectedClasses.filter(c => !c.is_premium);
    const premiumClasses = selectedClasses.filter(c => c.is_premium);
    const extraStandard = Math.max(0, standardClasses.length - includedClasses);
    const classTotal = standardClasses.length > 0 ? basePrice + (extraStandard * additionalPrice) : 0;
    const premiumTotal = premiumClasses.reduce((sum: number, c: any) => sum + Number(c.premium_price || 0), 0);
    const addonsTotal = addonItems.reduce((sum: number, item: any) => sum + Number(item.price) * (addonSelections[item.id] || 0), 0);
    const extraTshirtTotal = extraTshirtTotalQty * extraTshirtPrice;

    return { basePrice, additionalPrice, includedClasses, standardCount: standardClasses.length, extraStandard, classTotal, premiumTotal, addonsTotal, extraTshirtTotal, total: classTotal + premiumTotal + addonsTotal + extraTshirtTotal };
  }, [selectedPkg, selectedClasses, addonSelections, isEarlyBird, addonItems, extraTshirtTotalQty, extraTshirtPrice]);

  const handleSubmit = async () => {
    if (isPreview) { alert('This is a preview. Submission is disabled.'); return; }
    if (!selectedPackageId) { alert('Please select a package.'); return; }
    if (selectedClasses.length === 0) { alert('Please select at least one class.'); return; }
    if (!form.email) { alert('Email is required.'); return; }
    setSubmitting(true);
    try {
      const selectedAddonItems = addonItems.filter((item: any) => (addonSelections[item.id] || 0) > 0)
        .map((item: any) => ({ itemId: item.id, name: item.name, quantity: addonSelections[item.id], price: Number(item.price) }));
      // Group individual size selections into { size, quantity } format
      const sizeCounts: Record<string, number> = {};
      extraTshirtSizes.forEach(s => { sizeCounts[s] = (sizeCounts[s] || 0) + 1; });
      const extraTshirtsArray = Object.entries(sizeCounts).map(([size, quantity]) => ({ size, quantity }));
      const result = await worldFinalsApi.submitPreRegistration({
        token, packageId: selectedPackageId,
        eventId: selectedPkg?._eventId,
        classes: selectedClasses.map((c: any) => ({ className: c.class_name, format: c.format || '', isPremium: c.is_premium, premiumPrice: c.is_premium ? Number(c.premium_price) : 0 })),
        addonItems: selectedAddonItems, email: form.email, firstName: form.firstName, lastName: form.lastName, phone: form.phone,
        tshirtSize: form.tshirtSize || undefined, ringSize: form.ringSize || undefined,
        extraTshirts: extraTshirtsArray.length > 0 ? extraTshirtsArray : undefined,
        hotelNeeded: form.hotelNeeded, hotelNotes: form.hotelNotes || undefined, guestCount: form.guestCount, notes: form.notes || undefined,
      });
      setConfirmation(result);
    } catch (err: any) { alert(err?.response?.data?.message || 'Registration failed.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" /></div>;

  if (error) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="bg-slate-800 border border-red-500/30 rounded-xl p-8 max-w-md text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" /><h2 className="text-xl font-bold text-white mb-2">Registration Unavailable</h2><p className="text-gray-400">{error}</p></div></div>
  );

  if (confirmation) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="bg-slate-800 border border-green-500/30 rounded-xl p-8 max-w-lg text-center">
        <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" /><h2 className="text-2xl font-bold text-white mb-2">Registration Submitted!</h2>
        <p className="text-gray-400 mb-4">Your World Finals pre-registration has been received.</p>
        <div className="bg-slate-700 rounded-lg p-4 text-left space-y-2">
          <p className="text-white"><span className="text-gray-400">Package:</span> {selectedPkg?.name}</p>
          <p className="text-white"><span className="text-gray-400">Classes:</span> {selectedClasses.length}</p>
          <p className="text-white"><span className="text-gray-400">Total:</span> <span className="text-green-400 font-bold">${confirmation.totalAmount?.toFixed(2)}</span></p>
          <p className="text-white"><span className="text-gray-400">ID:</span> <span className="font-mono text-xs">{confirmation.registrationId}</span></p>
        </div>
        <p className="text-gray-500 text-sm mt-4">You will receive a confirmation email shortly.</p></div></div>
  );

  const competitor = validation?.competitor;

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Preview Banner */}
        {isPreview && (
          <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg px-4 py-3 mb-6 text-center">
            <p className="text-amber-300 font-semibold text-sm">PREVIEW MODE — This is a preview with sample data. Submission is disabled.</p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          {/* Registration Image */}
          {(config?.registration_image_url || selectedGroup?.events?.[0]?.flyer_url) && (
            <div className="mb-6">
              <img src={config?.registration_image_url || selectedGroup?.events?.[0]?.flyer_url}
                alt="World Finals" className="max-h-64 mx-auto rounded-xl object-cover shadow-lg" />
            </div>
          )}
          <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">World Finals Pre-Registration</h1>
          <p className="text-gray-400">Welcome, <span className="text-orange-400 font-semibold">{competitor?.name}</span> (MECA ID #{competitor?.mecaId})</p>
          {config?.custom_message && <p className="text-amber-200/70 mt-3 max-w-2xl mx-auto">{config.custom_message}</p>}
          <a href="/events" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-sm text-orange-400 hover:text-orange-300 underline">
            <Calendar className="h-4 w-4" />View Event Calendar for more details
          </a>
        </div>

        {/* Member Info */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Your Information</h3>
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-gray-400">MECA ID:</span> <span className="text-orange-400 font-semibold">#{competitor?.mecaId}</span></div>
              <div><span className="text-gray-400">Email:</span> <span className="text-white">{form.email}</span></div>
              <div><span className="text-gray-400">Name:</span> <span className="text-white">{form.firstName} {form.lastName}</span></div>
            </div>
          </div>
        </div>

        {/* Event Group Selection (if multiple groups) */}
        {eventGroups.length > 1 && (
          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Select Event</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {eventGroups.map((group, idx) => {
                const firstEvent = group.events[0];
                const eventNames = group.events.map((e: any) => e.name).join(' + ');
                const location = [firstEvent?.venue_name, firstEvent?.city, firstEvent?.state].filter(Boolean).join(', ');
                const eventDate = firstEvent?.event_date ? new Date(firstEvent.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;
                return (
                  <button key={idx} onClick={() => setSelectedGroupIdx(idx)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      selectedGroupIdx === idx ? 'bg-orange-500/20 border-orange-500' : 'bg-slate-700 border-slate-600 hover:border-slate-500'}`}>
                    <h4 className="text-white font-semibold">{eventNames}</h4>
                    {location && <p className="text-gray-400 text-sm mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" />{location}</p>}
                    {eventDate && <p className="text-gray-400 text-sm flex items-center gap-1"><Calendar className="h-3 w-3" />{eventDate}</p>}
                    {firstEvent?.custom_message && <p className="text-amber-200/60 text-xs mt-2">{firstEvent.custom_message}</p>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Event Info (when group selected) */}
        {selectedGroup && selectedGroup.events.length > 0 && (
          <div className="mb-6">
            {selectedGroup.events.map((evt: any) => {
              const location = [evt.venue_name, evt.city, evt.state].filter(Boolean).join(', ');
              const eventDate = evt.event_date ? new Date(evt.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;
              const earlyDeadline = evt.early_bird_deadline ? new Date(evt.early_bird_deadline) : null;
              const closeDate = evt.registration_close_date ? new Date(evt.registration_close_date) : null;
              const tierIsEarly = evt.pricingTier === 'early_bird';
              return (
                <div key={evt.id} className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 mb-2 flex flex-wrap items-center gap-4 text-sm">
                  <span className="text-white font-semibold">{evt.name}</span>
                  {location && <span className="text-gray-400 flex items-center gap-1"><MapPin className="h-3 w-3" />{location}</span>}
                  {eventDate && <span className="text-gray-400 flex items-center gap-1"><Calendar className="h-3 w-3" />{eventDate}</span>}
                  {tierIsEarly
                    ? <span className="text-white font-bold text-sm">Pre-registration pricing active{earlyDeadline ? ` until ${earlyDeadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}</span>
                    : <span className="text-white font-bold text-sm">Pre-registration special pricing has ended — register at regular member pricing</span>}
                  {evt.formats?.length > 0 && evt.formats.map((f: string) => (
                    <span key={f} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-gray-300">{f}</span>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Package Selection */}
        {selectedGroup && availablePackages.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Package className="h-5 w-5 text-orange-400" />Select Package</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availablePackages.map((pkg: any) => {
                const tierIsEarly = pkg._pricingTier === 'early_bird';
                return (
                  <button key={pkg.id} onClick={() => setSelectedPackageId(pkg.id)} disabled={pkg.alreadyRegistered}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      pkg.alreadyRegistered ? 'opacity-50 cursor-not-allowed border-slate-600' :
                      selectedPackageId === pkg.id ? 'bg-orange-500/20 border-orange-500' : 'bg-slate-700 border-slate-600 hover:border-slate-500'}`}>
                    <h4 className="text-white font-semibold">{pkg.name}</h4>
                    {selectedGroup.events.length > 1 && <p className="text-gray-500 text-xs">{pkg._eventName}</p>}
                    {pkg.description && <p className="text-gray-400 text-sm mt-1">{pkg.description}</p>}
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-green-400 font-bold text-lg">${Number(tierIsEarly ? pkg.base_price_early : pkg.base_price_regular).toFixed(2)}</span>
                      <span className="text-gray-500 text-xs">for {pkg.included_classes} classes</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">{pkg.eligibleClasses?.length} classes you qualified in</p>
                    {pkg.alreadyRegistered && <p className="text-amber-400 text-xs mt-1 font-medium">Already registered</p>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Class Selection */}
        {selectedPkg && (
          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-1">Select Classes</h3>
            <p className="text-gray-400 text-sm mb-4">First {selectedPkg.included_classes} standard classes included. Premium classes have separate pricing.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {eligibleClasses.map((cls: any) => {
                const selected = selectedClasses.find((c: any) => c.class_name === cls.class_name);
                return (
                  <label key={cls.class_name} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selected ? 'bg-orange-500/20 border-orange-500' : 'bg-slate-700 border-slate-600 hover:border-slate-500'}`}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={!!selected} onChange={() => toggleClass(cls)} className="sr-only" />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selected ? 'bg-orange-500 border-orange-500' : 'border-slate-500'}`}>
                        {selected && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      <span className="text-white text-sm">{cls.class_name}</span>
                    </div>
                    {cls.is_premium ? <span className="text-amber-400 text-xs font-medium">${Number(cls.premium_price).toFixed(0)} premium</span>
                      : <span className="text-gray-500 text-xs">Included</span>}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Add-Ons */}
        {addonItems.length > 0 && selectedPkg && (
          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Add-On Items</h3>
            <div className="space-y-3">
              {addonItems.map((item: any) => {
                const qty = addonSelections[item.id] || 0;
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div><p className="text-white font-medium">{item.name}</p><p className="text-green-400 text-sm">${Number(item.price).toFixed(2)}</p></div>
                    {Number(item.max_quantity) === 1
                      ? <input type="checkbox" checked={qty > 0} onChange={() => updateAddonQty(item.id, qty > 0 ? -1 : 1, 1)} className="w-5 h-5 rounded border-slate-500 text-orange-500 bg-slate-600" />
                      : <div className="flex items-center gap-2">
                          <button onClick={() => updateAddonQty(item.id, -1, Number(item.max_quantity))} className="p-1 bg-slate-600 rounded text-white"><Minus className="h-4 w-4" /></button>
                          <span className="text-white w-8 text-center">{qty}</span>
                          <button onClick={() => updateAddonQty(item.id, 1, Number(item.max_quantity))} className="p-1 bg-slate-600 rounded text-white"><Plus className="h-4 w-4" /></button>
                        </div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Additional Information */}
        {selectedPkg && (
        <div className="bg-slate-800 rounded-xl p-6 mb-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Additional Information</h3>
          {/* T-Shirt Size (included free with registration) */}
          {config?.collect_tshirt_size && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">T-Shirt Size</label>
              <p className="text-xs text-amber-200/70 mb-2">{config?.tshirt_field_label || 'Select your size for the complimentary event t-shirt included with your registration.'}</p>
              <select value={form.tshirtSize} onChange={e => setForm({ ...form, tshirtSize: e.target.value })} className="w-full sm:w-64 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                <option value="">Select</option>{(config?.available_tshirt_sizes || DEFAULT_TSHIRT_SIZES).map((s: string) => <option key={s} value={s}>{s}</option>)}</select>
            </div>
          )}

          {/* Ring Size */}
          {config?.collect_ring_size && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ring Size</label>
              <p className="text-xs text-amber-200/70 mb-2">{config?.ring_field_label || 'In case you win the world championship, we need to know your ring size to help us expedite ordering your custom ring.'}</p>
              <select value={form.ringSize} onChange={e => setForm({ ...form, ringSize: e.target.value })} className="w-full sm:w-64 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                <option value="">Select</option>{(config?.available_ring_sizes || DEFAULT_RING_SIZES).map((s: string) => <option key={s} value={s}>{s}</option>)}</select>
            </div>
          )}

          {/* Extra T-Shirt Ordering — individual size selectors */}
          {config?.collect_extra_tshirts && (
            <div className="border border-slate-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shirt className="h-5 w-5 text-orange-400" />
                <h4 className="text-white font-medium">Order Additional T-Shirts</h4>
                <span className="text-sm text-gray-400">(${Number(config.extra_tshirt_price).toFixed(2)} each)</span>
              </div>
              <p className="text-xs text-gray-400">{config?.extra_tshirt_field_label || 'Want extra event t-shirts? Add them here — each shirt is an additional charge.'}</p>
              <div className="space-y-2">
                {extraTshirtSizes.map((size, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-16">Shirt {idx + 1}</span>
                    <select value={size} onChange={e => { const updated = [...extraTshirtSizes]; updated[idx] = e.target.value; setExtraTshirtSizes(updated); }}
                      className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm w-32">
                      {(config?.available_tshirt_sizes || DEFAULT_TSHIRT_SIZES).map((s: string) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button type="button" onClick={() => setExtraTshirtSizes(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-300 text-sm">&times; Remove</button>
                  </div>
                ))}
              </div>
              {extraTshirtSizes.length < Number(config.max_extra_tshirts || 5) && (
                <button type="button" onClick={() => setExtraTshirtSizes(prev => [...prev, (config?.available_tshirt_sizes || DEFAULT_TSHIRT_SIZES)[2] || 'L'])}
                  className="flex items-center gap-1 text-sm text-orange-400 hover:text-orange-300">
                  <Plus className="h-4 w-4" />Add T-Shirt
                </button>
              )}
              {extraTshirtTotalQty > 0 && (
                <p className="text-sm text-orange-300">{extraTshirtTotalQty} extra shirt{extraTshirtTotalQty > 1 ? 's' : ''} = ${(extraTshirtTotalQty * extraTshirtPrice).toFixed(2)}</p>
              )}
            </div>
          )}

          {/* Hotel & Accommodation Information */}
          {config?.collect_hotel_info && config?.hotel_info_text && (
            <div className="border border-slate-700 rounded-lg p-4 space-y-2">
              <h4 className="text-white font-medium">{config?.hotel_field_label || 'Hotel & Accommodation Details'}</h4>
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-line">{config.hotel_info_text}</div>
            </div>
          )}

          {/* Guest Count */}
          {config?.collect_guest_count && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Guest Count</label>
              {config?.guest_count_field_label && <p className="text-xs text-gray-500 mb-2">{config.guest_count_field_label}</p>}
              <input type="number" min="0" max="20" value={form.guestCount} onChange={e => setForm({ ...form, guestCount: parseInt(e.target.value) || 0 })}
                className="w-32 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" />
            </div>
          )}
        </div>
        )}

        {/* Pricing Summary */}
        {pricing && (
          <div className="bg-slate-800 border border-orange-500/30 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-orange-400" />Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-300"><span>{selectedPkg?.name} ({pricing.includedClasses} included)</span><span>${pricing.basePrice.toFixed(2)}</span></div>
              {pricing.extraStandard > 0 && <div className="flex justify-between text-gray-300"><span>{pricing.extraStandard} extra x ${pricing.additionalPrice.toFixed(2)}</span><span>${(pricing.extraStandard * pricing.additionalPrice).toFixed(2)}</span></div>}
              {pricing.premiumTotal > 0 && <div className="flex justify-between text-amber-400"><span>Premium classes</span><span>${pricing.premiumTotal.toFixed(2)}</span></div>}
              {pricing.addonsTotal > 0 && <div className="flex justify-between text-gray-300"><span>Add-ons</span><span>${pricing.addonsTotal.toFixed(2)}</span></div>}
              {pricing.extraTshirtTotal > 0 && <div className="flex justify-between text-gray-300"><span>Extra T-Shirts ({extraTshirtTotalQty})</span><span>${pricing.extraTshirtTotal.toFixed(2)}</span></div>}
              <div className="border-t border-slate-700 pt-2 flex justify-between text-white font-bold text-lg"><span>Total</span><span className="text-green-400">${pricing.total.toFixed(2)}</span></div>
            </div>
          </div>
        )}

        {/* Submit */}
        {selectedPkg && (
        <button onClick={handleSubmit} disabled={submitting || selectedClasses.length === 0 || !selectedPackageId}
          className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-lg rounded-xl transition-colors flex items-center justify-center gap-2">
          {submitting ? <><div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />Processing...</>
            : <><Trophy className="h-5 w-5" />Complete Pre-Registration{pricing ? ` — $${pricing.total.toFixed(2)}` : ''}</>}
        </button>
        )}
      </div>
    </div>
  );
}
