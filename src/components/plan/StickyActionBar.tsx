// Sticky bottom bar for the create flow (brief §7.2).
import type { ReactNode } from 'react';

export const StickyActionBar = ({
  left,
  right,
}: {
  left?: ReactNode;
  right: ReactNode;
}) => (
  <div className="sticky bottom-0 z-10 -mx-5 sm:-mx-6 px-5 sm:px-6 py-3 bg-app-card/95 dark:bg-app-card-dark/95 backdrop-blur border-t border-app-line dark:border-app-line-dark flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">{left}</div>
    <div className="flex items-center gap-2">{right}</div>
  </div>
);
