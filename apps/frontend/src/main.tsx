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
  if (!/Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|ChunkLoadError/i.test(msg)) {
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
