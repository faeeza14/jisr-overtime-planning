// ⚡ Provenance dot — names which plan(s)/request(s) auto-filled a posted OT value.
// Makes "auto-updated" legible on a payroll-facing sheet (change set §B).

import { Tooltip } from '@jisr-hr/ds-web';

export const ProvenanceDot = ({ titles }: { titles: string[] }) => {
  if (titles.length === 0) return null;
  return (
    <Tooltip content={titles.join(' · ')}>
      <span
        className="ml-1 inline-flex size-3.5 items-center justify-center rounded-full bg-accent-bg text-accent-ink border border-accent-line text-[8px] cursor-help align-middle focus-ring"
        tabIndex={0}
        aria-label={`Source: ${titles.join('; ')}`}
      >
        ⚡
      </span>
    </Tooltip>
  );
};
