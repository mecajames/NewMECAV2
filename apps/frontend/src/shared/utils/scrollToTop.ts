/**
 * Scroll the window back to the top. Used by paginated lists when the
 * user clicks Prev/Next so they land at the start of the new page's
 * content instead of staying pinned to the pagination control at the
 * bottom. Smooth-scroll respects `prefers-reduced-motion` automatically.
 *
 * The shared <Pagination /> component calls this for the user — only
 * import it directly when a page implements its own inline pagination
 * (e.g. TicketList, AdminAuditPage) instead of using the shared one.
 */
export function scrollToTop(behavior: ScrollBehavior = 'smooth'): void {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, behavior });
}
