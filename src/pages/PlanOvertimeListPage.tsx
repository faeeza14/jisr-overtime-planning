import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '@jisr-hr/ds-web';
import { Plus, Search } from 'lucide-react';
import { useOTStore } from '../store';
import { planStats } from '../store/selectors';
import { StatStrip } from '../components/plan/StatStrip';
import { PlanTable } from '../components/plan/PlanTable';
import { REASON_LABEL } from '../lib/format';
import type { PlanStatus } from '../types';

type Filter = 'all' | PlanStatus;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
];

export const PlanOvertimeListPage = () => {
  const { plans, records, employees, policy, ui } = useOTStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const budget = policy.budgets.reduce((s, b) => s + b.amount, 0);
  const committed = policy.budgets.reduce((s, b) => s + b.committed, 0);
  const stats = useMemo(
    () => planStats(plans, records, budget, committed, ui.currentDate),
    [plans, records, budget, committed, ui.currentDate],
  );

  const rows = useMemo(() => {
    const list = Object.values(plans).sort((a, b) => a.name.localeCompare(b.name));
    return list.filter((p) => {
      if (filter !== 'all' && p.status !== filter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !REASON_LABEL[p.reason].toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [plans, filter, query]);

  return (
    <div className="p-5 sm:p-6 space-y-5">
      <StatStrip stats={stats} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            size="sm"
            placeholder="Search plans"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            startAddon={<Search className="size-3.5" />}
            className="w-56"
          />
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={[
                  'px-2.5 py-1 rounded-full text-11 font-medium border transition focus-ring',
                  filter === f.key
                    ? 'bg-app-ink text-white border-app-ink dark:bg-app-ink-dark dark:text-app-bg'
                    : 'bg-white dark:bg-app-card-dark text-app-mute border-app-line dark:border-app-line-dark hover:text-app-ink hover:border-app-faint',
                ].join(' ')}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => navigate('/shifts/plan-overtime/new')}>
          <Plus className="size-4" /> New overtime plan
        </Button>
      </div>

      <PlanTable plans={rows} records={records} employees={employees} policy={policy} />
    </div>
  );
};
