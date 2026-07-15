import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@jisr-hr/ds-web';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOTStore } from '../store';
import { recordsByCell } from '../store/selectors';
import { SchedulerGrid } from '../components/scheduler/SchedulerGrid';
import {
  addDays,
  fmtWeekRange,
  isoDay,
  parseIsoLocal,
  startOfSundayWeek,
} from '../lib/weekly';
import { TODAY_ISO } from '../data/seed';
import type { OvertimeRecord } from '../types';

const LEGEND: { label: string; cls: string }[] = [
  { label: 'Draft', cls: 'border border-dashed border-app-line' },
  { label: 'Pending', cls: 'bg-warn-bg' },
  { label: 'Approved / reconciling', cls: 'bg-accent-bg' },
  { label: 'Settled', cls: 'bg-ok-bg' },
];

export const SchedulerPage = () => {
  const { employees, shifts, records } = useOTStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [weekStart, setWeekStart] = useState<Date>(() => {
    const p = params.get('weekStart');
    return p ? parseIsoLocal(p) : startOfSundayWeek(parseIsoLocal(TODAY_ISO));
  });

  const goToWeek = (next: Date) => {
    setWeekStart(next);
    const q = new URLSearchParams(params);
    q.set('weekStart', isoDay(next));
    setParams(q, { replace: true });
  };
  const shiftWeek = (delta: number) => goToWeek(addDays(weekStart, delta * 7));

  const cellMap = useMemo(() => recordsByCell(records), [records]);

  const onChipClick = (r: OvertimeRecord) => navigate(`/shifts/plan-overtime/${r.planId}`);

  return (
    <div className="p-5 sm:p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => shiftWeek(-1)} aria-label="Previous week">
            <ChevronLeft className="size-4" />
          </Button>
          <div className="text-13 font-medium text-app-ink dark:text-app-ink-dark min-w-[210px] text-center">
            {fmtWeekRange(weekStart)}
          </div>
          <Button variant="secondary" size="sm" onClick={() => shiftWeek(1)} aria-label="Next week">
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="tertiary"
            size="sm"
            className="ml-1"
            onClick={() => goToWeek(startOfSundayWeek(parseIsoLocal(TODAY_ISO)))}
          >
            Today
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-11 text-app-mute">
          {LEGEND.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span className={['inline-block size-3 rounded', l.cls].join(' ')} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <SchedulerGrid
        weekStart={weekStart}
        employees={employees}
        shifts={shifts}
        recordsByCell={cellMap}
        onChipClick={onChipClick}
      />

      <p className="text-11 text-app-faint">
        OT chips reflect their plan's live status. Approving a plan turns its chips violet; settling a
        period locks them and shows planned→actual.
      </p>
    </div>
  );
};
