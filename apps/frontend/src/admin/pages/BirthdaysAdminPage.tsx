import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cake, Save, Send, RefreshCw, ArrowLeft, CheckCircle, XCircle, Clock,
  AlertTriangle, Gift, Upload, X,
} from 'lucide-react';
import { useAuth } from '@/auth/contexts/AuthContext';
import { birthdaysApi, BirthdayEmailSettings, UpcomingBirthdayRow } from '@/birthdays/birthdays.api-client';
import RichTextEditor from '@/announcements/RichTextEditor';
import { mediaFilesApi, MediaFile } from '@/media-files';
import { uploadFile } from '@/api-client/uploads.api-client';
import { getStorageUrl } from '@/lib/storage';

/**
 * Admin → Birthday Emails. Three jobs:
 *  1. Edit the birthday email template (subject, optional image, HTML body
 *     with the {{first_name}} placeholder) and toggle the daily send.
 *  2. See every active member's upcoming birthday (soonest first).
 *  3. See per-member send indicators — sent ✓ (when), failed ✗ (why), or
 *     scheduled — fed by the birthday_email_log table.
 * The send itself runs automatically every day at 9:00 AM Eastern.
 */
export default function BirthdaysAdminPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [settings, setSettings] = useState<BirthdayEmailSettings | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingBirthdayRow[]>([]);
  const [days, setDays] = useState(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Insert-image picker (upload or Media Library). Promise-based so the
  // editor's Insert Image button can await the admin's choice.
  const [imagePicker, setImagePicker] = useState<null | { resolve: (url: string | null) => void }>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requestImage = () =>
    new Promise<string | null>((resolve) => {
      setImagePicker({ resolve });
      mediaFilesApi.getAllMediaFiles('image').then(setMediaFiles).catch(() => setMediaFiles([]));
    });

  const closeImagePicker = (url: string | null) => {
    imagePicker?.resolve(url);
    setImagePicker(null);
  };

  const handleUploadImage = async (file: File) => {
    setUploadingImage(true);
    try {
      const result = await uploadFile(file, 'media-library');
      closeImagePicker(result.publicUrl);
    } catch (err: any) {
      flash('error', err?.response?.data?.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const flash = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([
        birthdaysApi.getSettings(),
        birthdaysApi.getUpcoming(days),
      ]);
      setSettings(s);
      setUpcoming(u);
    } catch (err: any) {
      flash('error', err?.response?.data?.message || 'Failed to load birthday settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  useEffect(() => {
    if (profile?.email && !testTo) setTestTo(profile.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.email]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await birthdaysApi.updateSettings(settings);
      setSettings(updated);
      flash('success', 'Birthday email template saved.');
    } catch (err: any) {
      flash('error', err?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testTo.trim()) return;
    setSendingTest(true);
    try {
      const result = await birthdaysApi.sendTest(testTo.trim());
      if (result.success) flash('success', `Test email sent to ${testTo.trim()}.`);
      else flash('error', `Test email failed: ${result.error || 'unknown error'}`);
    } catch (err: any) {
      flash('error', err?.response?.data?.message || 'Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  const handleRunNow = async () => {
    if (!window.confirm("Send birthday emails to every active member whose birthday is TODAY? (Members already emailed this year are skipped automatically.)")) return;
    setRunningNow(true);
    try {
      const result = await birthdaysApi.runNow();
      flash('success', `Run complete: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped.`);
      load();
    } catch (err: any) {
      flash('error', err?.response?.data?.message || 'Failed to run birthday send');
    } finally {
      setRunningNow(false);
    }
  };

  const statusChip = (row: UpcomingBirthdayRow) => {
    if (row.lastStatus === 'sent') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border bg-green-500/10 text-green-400 border-green-500"
          title={row.sentAt ? `Sent ${new Date(row.sentAt).toLocaleString()}` : 'Sent'}
        >
          <CheckCircle className="w-3 h-3" />
          Sent{row.sentAt ? ` ${new Date(row.sentAt).toLocaleDateString()}` : ''}
        </span>
      );
    }
    if (row.lastStatus === 'failed') {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border bg-red-500/10 text-red-400 border-red-500"
          title={row.error || 'Send failed'}
        >
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      );
    }
    if (row.lastStatus === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500">
          <Clock className="w-3 h-3" />
          Sending…
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border bg-slate-600/30 text-gray-400 border-slate-600">
        <Clock className="w-3 h-3" />
        {row.daysUntil === 0 ? 'Due today' : 'Scheduled'}
      </span>
    );
  };

  const formatBirthday = (row: UpcomingBirthdayRow) => {
    const d = new Date(row.nextDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pink-500/10 rounded-xl">
              <Cake className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Birthday Emails</h1>
              <p className="text-gray-400 text-sm">
                Automatic birthday greetings for active members — sent daily at 9:00 AM Eastern
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>

        {message && (
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${
            message.type === 'success' ? 'bg-green-900/30 border-green-700 text-green-300' : 'bg-red-900/30 border-red-700 text-red-300'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            {message.text}
          </div>
        )}

        {loading && !settings ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
          </div>
        ) : settings && (
          <>
            {/* Template editor */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-pink-400" />
                  <h2 className="text-lg font-semibold text-white">Email Template</h2>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    className="w-5 h-5 rounded bg-slate-700 border-slate-600 accent-orange-500"
                  />
                  <span className={`text-sm font-medium ${settings.enabled ? 'text-green-400' : 'text-gray-400'}`}>
                    {settings.enabled ? 'Automatic sending ON' : 'Automatic sending OFF'}
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                <input
                  type="text"
                  value={settings.subject}
                  onChange={(e) => setSettings({ ...settings, subject: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                {/* WYSIWYG — the admins editing this aren't HTML folks. The
                    toolbar's image button uploads or picks from the Media
                    Library and drops the image INTO the message content. The
                    result is wrapped in the standard branded MECA email
                    template (same header/footer as every other email). */}
                <RichTextEditor
                  value={settings.bodyHtml}
                  onChange={(html) => setSettings({ ...settings, bodyHtml: html })}
                  placeholder="Write the birthday message…"
                  extended
                  onInsertImage={requestImage}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Type <code className="bg-slate-700 px-1 rounded">{'{{first_name}}'}</code> where the member's first name should appear.
                  Use the image button in the toolbar to upload a picture or pick one from the Media Library —
                  it's inserted right where your cursor is.
                  The message is wrapped in the standard branded MECA email layout (header &amp; footer) automatically.
                </p>
              </div>

              {/* Live-ish preview */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Preview (message content only — the branded MECA header/footer is added automatically)</label>
                <div className="bg-white rounded-lg p-4 text-slate-900 max-h-72 overflow-y-auto [&_img]:max-w-full [&_img]:rounded-lg">
                  <div dangerouslySetInnerHTML={{ __html: settings.bodyHtml.replace(/\{\{\s*first_name\s*\}\}/gi, 'James') }} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-700">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Save Template'}
                </button>
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="email"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder="test@email.com"
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={handleSendTest}
                    disabled={sendingTest || !testTo.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                    title="Sends the saved template to this address with a [TEST] subject"
                  >
                    <Send className="w-4 h-4" />
                    {sendingTest ? 'Sending…' : 'Send Test'}
                  </button>
                </div>
              </div>
            </div>

            {/* Upcoming birthdays */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <Cake className="w-5 h-5 text-pink-400" />
                  <h2 className="text-lg font-semibold text-white">Upcoming Birthdays</h2>
                  <span className="text-sm text-gray-400">({upcoming.length} active member{upcoming.length === 1 ? '' : 's'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value))}
                    className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none"
                  >
                    <option value={30}>Next 30 days</option>
                    <option value={60}>Next 60 days</option>
                    <option value={90}>Next 90 days</option>
                    <option value={366}>Whole year</option>
                  </select>
                  <button
                    onClick={handleRunNow}
                    disabled={runningNow}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                    title="Runs today's send immediately (already-emailed members are skipped)"
                  >
                    <RefreshCw className={`w-4 h-4 ${runningNow ? 'animate-spin' : ''}`} />
                    Run Today's Send Now
                  </button>
                </div>
              </div>

              {upcoming.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                  No active members have a birthday in this window — or none have set a birthday
                  in their profile yet. Members add it under My Profile → Contact Information.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Member</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">MECA ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Birthday</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">In</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {upcoming.map((row) => (
                        <tr key={row.profileId} className={`${row.daysUntil === 0 ? 'bg-pink-500/5' : ''} hover:bg-slate-700/40 transition-colors`}>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => navigate(`/admin/members/${row.profileId}`)}
                              className="text-white font-medium hover:text-orange-400 transition-colors"
                            >
                              {[row.firstName, row.lastName].filter(Boolean).join(' ') || '—'}
                            </button>
                            {row.daysUntil === 0 && <span className="ml-2 text-xs text-pink-400 font-semibold">🎂 TODAY</span>}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-orange-400">{row.mecaId || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{row.email || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{formatBirthday(row)}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {row.daysUntil === 0 ? 'Today' : row.daysUntil === 1 ? 'Tomorrow' : `${row.daysUntil} days`}
                          </td>
                          <td className="px-4 py-3">{statusChip(row)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Insert-image picker: upload a new image or choose from the Media
            Library. Resolves the editor's pending insert with the chosen URL. */}
        {imagePicker && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Insert Image</h3>
                <button
                  onClick={() => closeImagePicker(null)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUploadImage(file);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                {uploadingImage ? 'Uploading…' : 'Upload a New Image'}
              </button>

              <p className="text-sm text-gray-400 mb-3">…or choose from the Media Library:</p>
              {mediaFiles.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No images in the Media Library yet.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {mediaFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => closeImagePicker(getStorageUrl(file.fileUrl))}
                      className="relative aspect-video bg-slate-700 rounded-lg overflow-hidden hover:ring-2 hover:ring-orange-500 transition-all"
                    >
                      <img
                        src={getStorageUrl(file.fileUrl)}
                        alt={file.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1.5">
                        <p className="text-white text-xs truncate">{file.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
