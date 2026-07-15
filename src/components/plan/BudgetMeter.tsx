// Budget impact meter (brief §7.2 Step 4). Amber >85%, red >100% of budget.
import { Progress } from '@jisr-hr/ds-web';
import { money } from '../../lib/format';

export const BudgetMeter = ({
  budget,
  committed,
  thisPlan = 0,
  compact = false,
}: {
  budget: number;
  committed: number;
  /** Estimated cost of the plan being created — folded into the used figure. */
  thisPlan?: number;
  compact?: boolean;
}) => {
  const used = committed + thisPlan;
  const pct = budget > 0 ? (used / budget) * 100 : 0;
  const remaining = budget - used;
  const appearance = pct > 100 ? 'danger' : pct > 85 ? 'warning' : 'default';

  return (
    <div className="space-y-1.5">
      <Progress value={used} max={budget} appearance={appearance} />
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 text-11 text-app-mute dark:text-app-mute-dark">
        <span>
          Committed <span className="text-app-ink dark:text-app-ink-dark font-medium">{money(committed)}</span>
        </span>
        {thisPlan > 0 && (
          <span>
            This plan <span className="text-accent-ink dark:text-accent-ink-dark font-medium">{money(thisPlan)}</span>
          </span>
        )}
        {!compact && (
          <span>
            Budget <span className="text-app-ink dark:text-app-ink-dark font-medium">{money(budget)}</span>
          </span>
        )}
        <span>
          Remaining{' '}
          <span
            className={[
              'font-medium',
              remaining < 0 ? 'text-danger-ink' : 'text-app-ink dark:text-app-ink-dark',
            ].join(' ')}
          >
            {money(remaining)}
          </span>
        </span>
      </div>
    </div>
  );
};
