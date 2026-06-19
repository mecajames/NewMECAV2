import DOMPurify from 'dompurify';

/**
 * Announcement bodies are admin-authored HTML (via the rich-text toolbar). We
 * sanitize on RENDER so a malformed or malicious payload can never execute in a
 * viewer's browser, regardless of what was stored. Only lightweight inline
 * formatting + links are permitted; DOMPurify also strips dangerous URI schemes
 * (javascript:, data:) from hrefs by default.
 */
const CONFIG = {
  // Includes block tags (div, h2-h4) that the staff reply editor (contentEditable
  // + execCommand) emits for line breaks. Without div here, DOMPurify strips the
  // wrapper but keeps the text, collapsing multi-line staff replies onto one line
  // in the thread (while the email — which allows div — kept the breaks). Kept in
  // sync with the backend storage allowlist in staff-signatures.service.ts.
  ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 's', 'a', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'h2', 'h3', 'h4'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
};

let hookInstalled = false;
function installHook(): void {
  if (hookInstalled) return;
  // Force every surviving link to open safely in a new tab.
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if ((node as Element).tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });
  hookInstalled = true;
}

export function sanitizeAnnouncementHtml(html: string): string {
  installHook();
  return DOMPurify.sanitize(html ?? '', CONFIG) as string;
}
