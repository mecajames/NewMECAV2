import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { ArrowLeft, Save, Trash2, Eye, Code, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { staffSignaturesApi } from '@/tickets/ticket-support-tools.api-client';

/**
 * Per-agent signature editor. Lets a support staff member compose a
 * rich-text signature that auto-appends to outbound ticket reply
 * emails. Stored server-side keyed by user_id (one signature per
 * agent), sanitized server-side on save via a strict allowlist.
 *
 * The editor is intentionally simple: a textarea for raw HTML plus a
 * live DOMPurify-sanitized preview. This avoids pulling in a heavy
 * WYSIWYG dependency for a feature that most agents will use once and
 * forget. Common patterns (MECA logo + name + title + phone) are
 * pre-loaded as a starter template.
 *
 * The editor is exported as a standalone component (StaffSignatureEditor)
 * so it can be embedded both in its own route (default export below) and
 * in the "My Tools" tab of the ticket admin.
 */
const STARTER_TEMPLATE = `<p style="margin: 0; font-weight: bold;">{{Your Name}}</p>
<p style="margin: 0; color: #64748b; font-size: 13px;">{{Your Title}} | MECA Support</p>
<p style="margin: 0; color: #64748b; font-size: 13px;">
  <a href="https://mecacaraudio.com" target="_blank" rel="noopener noreferrer">mecacaraudio.com</a>
</p>
<p style="margin: 6px 0 0 0; color: #f97316; font-size: 12px; font-style: italic;">Fun, Fair, Loud and Clear!</p>`;

export function StaffSignatureEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [html, setHtml] = useState('');
  const [plainText, setPlainText] = useState('');
  const [isActive, setIsActive] = useState(true);
  // Default to the editable view so the signature is immediately editable —
  // landing on a read-only preview made people think they couldn't edit it.
  const [view, setView] = useState<'html' | 'preview'>('html');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    staffSignaturesApi.getMine()
      .then((sig) => {
        if (cancelled) return;
        setHtml(sig.html);
        setPlainText(sig.plain_text);
        setIsActive(sig.is_active);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message || 'Failed to load signature');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const flashSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const next = await staffSignaturesApi.upsertMine({ html, plain_text: plainText, is_active: isActive });
      setHtml(next.html);
      setPlainText(next.plain_text);
      setIsActive(next.is_active);
      flashSuccess('Signature saved.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save signature');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete your signature? It will no longer be appended to ticket replies.')) return;
    setSaving(true);
    setError(null);
    try {
      await staffSignaturesApi.deleteMine();
      setHtml('');
      setPlainText('');
      setIsActive(true);
      flashSuccess('Signature deleted.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete signature');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadStarter = () => {
    if (html.trim() && !window.confirm('Replace the current signature with the starter template?')) return;
    setHtml(STARTER_TEMPLATE);
    setPlainText('{{Your Name}}\n{{Your Title}} | MECA Support\nmecacaraudio.com\nFun, Fair, Loud and Clear!');
  };

  // Sanitize before injecting into preview. The server also sanitizes
  // on save, but rendering raw user HTML on the admin's own page
  // without client-side sanitization would still be a self-XSS risk
  // when the agent pastes a malicious snippet from elsewhere.
  const sanitizedPreview = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['a', 'b', 'br', 'div', 'em', 'h2', 'h3', 'h4', 'i', 'img', 'li', 'ol', 'p', 'span', 'strong', 'u', 'ul'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'title', 'src', 'alt', 'width', 'height', 'style'],
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-2">My Reply Signature</h2>
      <p className="text-gray-400 mb-6">
        Auto-appended to outbound ticket reply emails. HTML is sanitized server-side
        on save: anything outside the allowed tag list is stripped silently.
      </p>

      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-300">
          {successMsg}
        </div>
      )}

      {/* Active toggle */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 mb-4 flex items-center justify-between">
        <div>
          <p className="text-white font-medium">Signature active</p>
          <p className="text-gray-400 text-sm">Turn off to send replies without your signature without deleting it.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          onClick={() => setIsActive(v => !v)}
          className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${isActive ? 'bg-orange-500' : 'bg-slate-600'}`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
        </button>
      </div>

      {/* HTML editor + preview */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 mb-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-700 p-3">
          <div className="flex gap-2">
            <button
              onClick={() => setView('html')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${view === 'html' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
            >
              <Code className="w-3.5 h-3.5" />
              Edit (HTML)
            </button>
            <button
              onClick={() => setView('preview')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${view === 'preview' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
          </div>
          <button
            onClick={handleLoadStarter}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Load starter template
          </button>
        </div>

        {view === 'html' ? (
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="<p>Best,<br/>Your Name</p>"
            spellCheck={false}
            className="w-full p-4 bg-slate-900 text-white font-mono text-sm focus:outline-none min-h-[280px]"
          />
        ) : (
          <div className="p-6 bg-slate-900 min-h-[280px]">
            {html.trim() ? (
              <div
                className="ticket-signature-preview text-white"
                dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
              />
            ) : (
              <p className="text-gray-500 italic">Preview empty - switch to HTML and add content.</p>
            )}
          </div>
        )}
      </div>

      {/* Plain-text version */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 mb-6 p-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Plain-text version (shown to recipients who can't render HTML email)
        </label>
        <textarea
          value={plainText}
          onChange={(e) => setPlainText(e.target.value)}
          placeholder="Your Name&#10;Your Title | MECA Support&#10;mecacaraudio.com"
          className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[100px]"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={handleDelete}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/20 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          Delete signature
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save signature
        </button>
      </div>
    </div>
  );
}

/**
 * Standalone route wrapper — keeps the existing /admin/settings/signature
 * URL working with its own page chrome + back button.
 */
export default function StaffSignatureSettingsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <StaffSignatureEditor />
      </div>
    </div>
  );
}
