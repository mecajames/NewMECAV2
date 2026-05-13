import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Download } from 'lucide-react';
import axios from '@/lib/axios';

interface Item {
  attachmentId: string;
  fileName: string;
  fileSize?: number;
}

interface Props {
  ticketId: string;
  items: Item[];
  startIndex: number;
  onClose: () => void;
}

/**
 * Modal lightbox for ticket image attachments. Fetches each slide through
 * the same authenticated proxy as the thumbnails (so the same per-ticket
 * access control applies) and cycles through them with prev/next.
 *
 * Keyboard: Escape closes, Left/Right navigate. We bind on `window` rather
 * than the modal node so the keys work even when nothing inside the modal
 * has focus.
 *
 * Blob URLs for visited slides are cached for the modal's lifetime so
 * navigating back to a previous slide doesn't re-download — and they're
 * all revoked on unmount so we don't leak memory.
 */
export function TicketAttachmentLightbox({ ticketId, items, startIndex, onClose }: Props) {
  const [index, setIndex] = useState(() =>
    Math.max(0, Math.min(startIndex, items.length - 1)),
  );
  const [urlByAttachment, setUrlByAttachment] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Keep the cache in a ref too so the unmount cleanup sees the latest set
  // even when state updates were batched right before close.
  const urlByAttachmentRef = useRef<Record<string, string>>({});

  const current = items[index];

  // Fetch the current slide if we haven't seen it yet.
  useEffect(() => {
    if (!current) return;
    if (urlByAttachmentRef.current[current.attachmentId]) {
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    axios
      .get(
        `/api/tickets/${ticketId}/attachments/${current.attachmentId}/download`,
        { responseType: 'blob' },
      )
      .then((resp) => {
        if (cancelled) return;
        const url = URL.createObjectURL(resp.data);
        urlByAttachmentRef.current = {
          ...urlByAttachmentRef.current,
          [current.attachmentId]: url,
        };
        setUrlByAttachment(urlByAttachmentRef.current);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load attachment for lightbox:', err);
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
    };
  }, [ticketId, current]);

  // Revoke every cached blob URL when the modal unmounts.
  useEffect(() => {
    return () => {
      for (const url of Object.values(urlByAttachmentRef.current)) {
        URL.revokeObjectURL(url);
      }
      urlByAttachmentRef.current = {};
    };
  }, []);

  // Keyboard shortcuts. Bound on window so the user doesn't have to click
  // into the modal to make Esc/arrows work.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setIndex((i) => (i > 0 ? i - 1 : i));
      else if (e.key === 'ArrowRight')
        setIndex((i) => (i < items.length - 1 ? i + 1 : i));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items.length, onClose]);

  if (!current) return null;

  const currentUrl = urlByAttachment[current.attachmentId];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={(e) => {
        // Backdrop click closes — only when the click lands on the backdrop
        // itself, not on a child (image, controls).
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Close button — top right, always visible regardless of slide state. */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition-colors"
        aria-label="Close"
        title="Close (Esc)"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Slide counter + file name */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg bg-slate-800/80 text-white text-sm max-w-[60%]">
        <span className="font-mono text-gray-400 mr-2">
          {index + 1} / {items.length}
        </span>
        <span className="truncate">{current.fileName}</span>
      </div>

      {/* Prev button */}
      {hasPrev && (
        <button
          type="button"
          onClick={() => setIndex((i) => i - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition-colors"
          aria-label="Previous image"
          title="Previous (←)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next button */}
      {hasNext && (
        <button
          type="button"
          onClick={() => setIndex((i) => i + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition-colors"
          aria-label="Next image"
          title="Next (→)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Slide */}
      <div className="max-w-[90vw] max-h-[90vh] flex flex-col items-center justify-center">
        {loading && !currentUrl ? (
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="text-sm">Loading…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 text-gray-200 max-w-md text-center px-6">
            <AlertTriangle className="w-10 h-10 text-yellow-500" />
            <p>{error}</p>
          </div>
        ) : currentUrl ? (
          <img
            src={currentUrl}
            alt={current.fileName}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
        ) : null}
      </div>

      {/* Download link for the current slide. Uses the cached blob URL so
          clicking it doesn't re-hit the proxy. */}
      {currentUrl && (
        <a
          href={currentUrl}
          download={current.fileName}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white text-sm transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4" />
          Download
        </a>
      )}
    </div>
  );
}

export default TicketAttachmentLightbox;
