import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// Initialize axios interceptors for user authentication
import './lib/axios';
import { initializeGA4 } from './lib/gtag';

initializeGA4();

// Recover from stale chunk references after a deploy: if a lazy-loaded
// chunk 404s because the user's tab predates the current build, reload
// once to fetch fresh index.html. Guarded by sessionStorage to avoid loops.
const handleStaleChunk = (err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (!/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk \d+ failed|ChunkLoadError|Failed to load module script|Unable to preload CSS for/i.test(msg)) {
    return;
  }
  if (sessionStorage.getItem('chunk-reload') === '1') return;
  sessionStorage.setItem('chunk-reload', '1');
  window.location.reload();
};

window.addEventListener('vite:preloadError', (e) => handleStaleChunk(e.payload ?? e));
window.addEventListener('error', (e) => handleStaleChunk(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => handleStaleChunk(e.reason));
if (sessionStorage.getItem('chunk-reload') === '1') {
  window.addEventListener('load', () => sessionStorage.removeItem('chunk-reload'));
}

// Password-reset entry fix. GoTrue redirects recovery links to the SITE_URL root
// (the admin generate_link flow ignores redirect_to), so the recovery token lands
// as `#...&type=recovery` on the homepage. If we let React render there, the
// now-signed-in recovery session gets bounced by the force-password-change guard
// to /change-password — which demands the CURRENT password the user doesn't know.
// Move to /reset-password synchronously, BEFORE React renders, so no guard ever
// sees the recovery session on a non-exempt route. Runs before Supabase's async
// detectSessionInUrl consumes the hash, and preserves the hash (the token) so the
// reset page establishes the recovery session normally.
if (
  typeof window !== 'undefined' &&
  window.location.hash.includes('type=recovery') &&
  window.location.pathname !== '/reset-password'
) {
  window.history.replaceState(
    null,
    '',
    '/reset-password' + window.location.search + window.location.hash,
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
