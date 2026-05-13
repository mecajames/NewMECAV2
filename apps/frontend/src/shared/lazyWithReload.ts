import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const RELOAD_FLAG = 'chunk-reload-once';

const isChunkLoadError = (err: unknown): boolean => {
  const msg = (err as { message?: string } | null)?.message ?? '';
  return /dynamically imported module|Importing a module script failed|Failed to fetch|error loading dynamically imported/i.test(
    msg,
  );
};

export function lazyWithReload<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (isChunkLoadError(err) && !sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1');
        window.location.reload();
        return new Promise<never>(() => {});
      }
      throw err;
    }
  });
}
