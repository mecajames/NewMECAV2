import { ReactNode } from 'react';
import { useIdleTimeout } from '../hooks/useIdleTimeout';

interface IdleTimeoutGuardProps {
  children: ReactNode;
}

/**
 * Thin guard component that activates idle timeout tracking.
 * Wrap authenticated content with this component.
 */
export function IdleTimeoutGuard({ children }: IdleTimeoutGuardProps) {
  useIdleTimeout();
  return <>{children}</>;
}
