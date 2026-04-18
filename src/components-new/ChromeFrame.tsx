import type { ReactNode } from 'react';

interface ChromeFrameProps {
  children: ReactNode;
}

/**
 * Outermost wrapper for the rebuilt UI. Applies the classification bar,
 * observatory grid backdrop, subtle noise overlay, and the ambient
 * scan-line — the ambient chrome that frames every screen.
 *
 * Mounts under .nhi-root so the new design tokens take effect without
 * touching legacy CSS.
 */
export function ChromeFrame({ children }: ChromeFrameProps) {
  return (
    <div
      className="nhi-root"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--nhi-ink)',
      }}
    >
      <div className="nhi-classbar" />
      <div className="nhi-grid-bg" />
      <div className="nhi-noise" />
      <div className="nhi-scanline" />
      {children}
    </div>
  );
}
