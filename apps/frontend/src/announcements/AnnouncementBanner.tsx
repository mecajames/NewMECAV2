import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { AnnouncementType, type PublicAnnouncement } from '@newmeca/shared';
import { announcementsApi } from './announcements.api-client';
import { sanitizeAnnouncementHtml } from './sanitize';
import { styleForType } from './announcementStyles';

const DISMISS_KEY = 'meca_dismissed_announcements';

function getDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addDismissed(id: string): void {
  try {
    const set = new Set(getDismissed());
    set.add(id);
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore storage failures — dismissal just won't persist */
  }
}

/**
 * Site-wide announcement strip, mounted above the navbar. Fetches the banners the
 * current viewer is allowed to see (audience filtering happens server-side),
 * stacks them by priority, and lets the viewer dismiss the ones marked dismissible
 * (remembered per browser via localStorage).
 */
export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => getDismissed());

  useEffect(() => {
    let cancelled = false;
    announcementsApi
      .getActive()
      .then((data) => {
        if (!cancelled) setAnnouncements(data || []);
      })
      .catch(() => {
        /* banners are non-critical chrome — fail silently */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    addDismissed(id);
    setDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  // The server already returns these ordered by priority (then recency), so we
  // only need to drop the ones dismissed in this browser.
  const visible = announcements.filter((a) => !dismissed.includes(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="w-full">
      {visible.map((a) => {
        const style = styleForType(a.type ?? AnnouncementType.INFO);
        const bg = a.panelColor || style.panelColor;
        const fg = a.textColor || style.textColor;
        const Icon = style.Icon;
        return (
          <div key={a.id} style={{ backgroundColor: bg, color: fg }} className="w-full">
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-start gap-3 text-sm">
              <Icon className="h-5 w-5 mt-0.5 shrink-0" style={{ color: fg }} />
              <div className="flex-1 min-w-0">
                {a.title && <span className="font-semibold mr-2">{a.title}</span>}
                <span
                  className="[&_a]:underline [&_a]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: sanitizeAnnouncementHtml(a.body) }}
                />
              </div>
              {a.dismissible && (
                <button
                  onClick={() => dismiss(a.id)}
                  aria-label="Dismiss announcement"
                  className="shrink-0 opacity-80 hover:opacity-100 transition-opacity"
                  style={{ color: fg }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
