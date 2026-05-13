import { useEffect, useRef, useState } from 'react';
import { Paperclip, Loader2, AlertTriangle } from 'lucide-react';
import axios from '@/lib/axios';

interface Props {
  ticketId: string;
  attachmentId: string;
  fileName: string;
  mimeType?: string | null;
  fileSizeLabel?: string;
  /**
   * When provided, clicking the thumbnail invokes this instead of opening
   * the file in a new tab. Used by TicketDetail to launch the lightbox
   * with the clicked image as the starting slide.
   */
  onOpen?: () => void;
}

/**
 * Renders a ticket attachment by streaming it through the backend proxy
 * (`/api/tickets/:ticketId/attachments/:attachmentId/download`). The
 * proxy enforces per-ticket access control AND keeps the Supabase storage
 * hostname out of the browser — so a leaked screenshot URL is no longer
 * a credential to view the file.
 *
 * Because authenticated requests can't be issued via a plain <img src> tag
 * (the browser won't attach our Bearer token), we fetch the bytes with
 * axios, wrap them in a blob URL, and use that for both the inline preview
 * and the "open in new tab" link. The blob URL is revoked on unmount so we
 * don't leak memory if the user paginates through many tickets.
 */
export function TicketAttachmentImage({
  ticketId,
  attachmentId,
  fileName,
  mimeType,
  fileSizeLabel,
  onOpen,
}: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Hold the URL in a ref too so the unmount cleanup can revoke it even if
  // state has been swapped out by a later effect run.
  const blobUrlRef = useRef<string | null>(null);

  const isImage = (mimeType ?? '').startsWith('image/');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    axios
      .get(`/api/tickets/${ticketId}/attachments/${attachmentId}/download`, {
        responseType: 'blob',
      })
      .then((resp) => {
        if (cancelled) return;
        const url = URL.createObjectURL(resp.data);
        blobUrlRef.current = url;
        setBlobUrl(url);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load attachment:', err);
        const status = err?.response?.status;
        setError(
          status === 403
            ? "You don't have permission to view this attachment."
            : status === 404
              ? 'This attachment is no longer available.'
              : 'Unable to load attachment.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [ticketId, attachmentId]);

  // When the parent wires an onOpen handler, treat the thumbnail as a
  // button that launches the lightbox. Otherwise fall back to the old
  // "open the blob in a new tab" behavior for non-image attachments or
  // any caller that hasn't adopted the lightbox.
  const interactive = !!onOpen;
  const handleClick = (e: React.MouseEvent) => {
    if (interactive) {
      e.preventDefault();
      onOpen?.();
      return;
    }
    if (!blobUrl) e.preventDefault();
  };

  return (
    <a
      href={interactive ? undefined : (blobUrl ?? '#')}
      target={interactive ? undefined : '_blank'}
      rel={interactive ? undefined : 'noopener noreferrer'}
      onClick={handleClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className="block bg-slate-700 rounded-lg overflow-hidden border border-slate-600 hover:border-orange-500 transition-colors cursor-pointer"
    >
      {loading ? (
        <div className="w-full h-32 flex items-center justify-center bg-slate-900">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="w-full h-32 flex flex-col items-center justify-center bg-slate-900 px-2 text-center">
          <AlertTriangle className="w-6 h-6 text-yellow-500 mb-1" />
          <p className="text-xs text-gray-400">{error}</p>
        </div>
      ) : isImage && blobUrl ? (
        <img
          src={blobUrl}
          alt={fileName}
          className="w-full h-32 object-cover bg-slate-900"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-32 flex items-center justify-center bg-slate-900">
          <Paperclip className="w-8 h-8 text-gray-500" />
        </div>
      )}
      <div className="p-2">
        <p className="text-white text-xs truncate" title={fileName}>
          {fileName}
        </p>
        {fileSizeLabel && (
          <p className="text-gray-500 text-[10px]">{fileSizeLabel}</p>
        )}
      </div>
    </a>
  );
}

export default TicketAttachmentImage;
