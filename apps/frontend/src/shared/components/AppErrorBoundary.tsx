import { Component, ReactNode } from 'react';

// Same patterns the global handler in main.tsx watches for — a lazy chunk
// that 404s after a deploy. React routes render errors from lazy imports to
// the nearest error boundary (so main.tsx's window listeners may never fire);
// the boundary must therefore do its own reload-once for stale-chunk cases.
const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk \d+ failed|ChunkLoadError|Failed to load module script|Unable to preload CSS for/i;

/**
 * Root error boundary. Without one, ANY uncaught render error unmounts the
 * entire React tree and the user gets a silent pure-white page (which is
 * exactly what happened on /tickets when a row carried an unmapped enum
 * value). With it, the user gets a branded "something went wrong" screen
 * with a reload button — and stale-deploy chunk failures auto-reload once.
 */
export default class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('AppErrorBoundary caught:', error);
    if (
      CHUNK_ERROR_RE.test(error?.message || '') &&
      sessionStorage.getItem('chunk-reload') !== '1'
    ) {
      sessionStorage.setItem('chunk-reload', '1');
      window.location.reload();
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
            <p className="text-gray-400 mb-6">
              An unexpected error occurred on this page. Reloading usually fixes
              it — if it keeps happening, please open a support ticket and tell
              us what page you were on.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
