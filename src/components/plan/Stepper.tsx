// 4-step stepper with checkmarks on completed steps (brief §7.2).
import { Check } from 'lucide-react';

export const Stepper = ({
  steps,
  current,
  onStepClick,
}: {
  steps: string[];
  current: number; // 0-based
  onStepClick?: (index: number) => void;
}) => (
  <div className="flex items-center gap-1 sm:gap-2">
    {steps.map((label, i) => {
      const done = i < current;
      const active = i === current;
      const clickable = i <= current && onStepClick;
      return (
        <div key={label} className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onStepClick(i)}
            className={[
              'inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 transition',
              clickable ? 'cursor-pointer hover:bg-app-surface dark:hover:bg-app-subtle-dark' : 'cursor-default',
            ].join(' ')}
          >
            <span
              className={[
                'inline-flex items-center justify-center size-6 rounded-full text-11 font-semibold shrink-0',
                done
                  ? 'bg-ok-ink text-white'
                  : active
                    ? 'bg-app-ink text-white dark:bg-app-ink-dark dark:text-app-bg'
                    : 'bg-app-subtle text-app-faint dark:bg-app-subtle-dark',
              ].join(' ')}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={[
                'text-13 whitespace-nowrap hidden sm:inline',
                active
                  ? 'text-app-ink dark:text-app-ink-dark font-medium'
                  : 'text-app-mute dark:text-app-mute-dark',
              ].join(' ')}
            >
              {label}
            </span>
          </button>
          {i < steps.length - 1 && (
            <span className="w-4 sm:w-8 h-px bg-app-line dark:bg-app-line-dark" />
          )}
        </div>
      );
    })}
  </div>
);
