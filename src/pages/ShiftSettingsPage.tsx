import { Card, Switch, Badge, Banner } from '@jisr-hr/ds-web';
import type { ReactNode } from 'react';
import { useOTStore } from '../store';
import { money } from '../lib/format';
import type { FeatureConfig } from '../types';

const Row = ({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: ReactNode;
}) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-app-line dark:border-app-line-dark last:border-b-0">
    <div className="min-w-0">
      <div className="text-13 font-medium text-app-ink dark:text-app-ink-dark">{title}</div>
      <div className="text-11 text-app-mute dark:text-app-mute-dark mt-0.5">{description}</div>
    </div>
    <div className="shrink-0">{control}</div>
  </div>
);

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <div className="text-11 uppercase tracking-wide text-app-faint mb-2">{children}</div>
);

export const ShiftSettingsPage = () => {
  const { features, setFeature, policy, costCentres } = useOTStore();

  const toggle = (key: keyof FeatureConfig) => (
    <Switch checked={features[key]} onCheckedChange={(v) => setFeature(key, v)} />
  );

  return (
    <div className="p-5 sm:p-6 space-y-5 max-w-3xl">
      {/* Feature toggles */}
      <section>
        <SectionTitle>Feature toggles</SectionTitle>
        <Card className="px-4">
          <Row
            title="Shift schedule approval"
            description="Route weekly rosters through an approval before they publish."
            control={toggle('shiftScheduleApproval')}
          />
          <Row
            title="Overtime planner"
            description="Centrally plan OT against budget. Off → the Plan Overtime, Approvals and Reconciliation tabs are hidden and shifts publish directly."
            control={toggle('overtimePlanner')}
          />
          <Row
            title="Attendance reconciliation"
            description="Compare approved OT to actual attendance before settling to payroll."
            control={toggle('attendanceReconciliation')}
          />
        </Card>
        {!features.overtimePlanner && (
          <Banner className="mt-2" appearance="warning" emphasis="mid">
            Overtime planner is off — the planning workflow is hidden and OT falls back to individual requests.
          </Banner>
        )}
      </section>

      {/* OT pricing & budget */}
      <section>
        <SectionTitle>OT pricing &amp; budget</SectionTitle>
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-13 font-medium">Overtime multipliers</div>
              <div className="text-11 text-app-mute">Read-only — sourced from the OT policy engine.</div>
            </div>
            <div className="flex gap-2">
              <Badge appearance="neutral">Normal {policy.normalMultiplier}×</Badge>
              <Badge appearance="info">Rest {policy.restMultiplier}×</Badge>
            </div>
          </div>
          <div className="border-t border-app-line dark:border-app-line-dark pt-3">
            <div className="text-13 font-medium mb-2">OT budget per cost centre</div>
            <div className="space-y-1.5">
              {policy.budgets.map((b) => {
                const cc = costCentres.find((c) => c.id === b.costCentreId);
                return (
                  <div key={b.costCentreId} className="flex items-center justify-between text-13">
                    <span className="text-app-mute">{cc?.name ?? b.costCentreId}</span>
                    <span className="tabular-nums">
                      <span className="text-app-ink dark:text-app-ink-dark font-medium">{money(b.amount)}</span>
                      <span className="text-app-faint"> · {money(b.committed)} committed</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="border-t border-app-line dark:border-app-line-dark pt-3 flex items-center justify-between text-13">
            <span className="text-app-mute">Weekly soft cap</span>
            <Badge appearance="warning">{policy.weeklyCapSoft}h · warning only</Badge>
          </div>
        </Card>
      </section>

      {/* Go-live & older dates */}
      <section>
        <SectionTitle>Go-live &amp; older dates</SectionTitle>
        <Card className="p-4 space-y-2 text-13">
          <div className="flex items-center justify-between">
            <span className="text-app-mute">Go-live date</span>
            <Badge appearance="neutral">{policy.goLiveDate}</Badge>
          </div>
          <ul className="text-11 text-app-mute list-disc pl-4 space-y-1 pt-1">
            <li>Dates before go-live stay on individual OT requests.</li>
            <li>A period is plannable until its timesheet is submitted.</li>
            <li>After a payroll run the period locks — extra hours need a separate request.</li>
          </ul>
        </Card>
      </section>

      {/* Approval cycles */}
      <section>
        <SectionTitle>Approval cycles</SectionTitle>
        <Card className="p-4 space-y-2 text-13">
          <Row
            title="Overtime plans"
            description="Sequential · edit-in-place · no send-back."
            control={<Badge appearance="info">Finance → Top management</Badge>}
          />
          <Row
            title="Shift schedules"
            description="Approving a schedule does not approve the OT riding on it."
            control={<Badge appearance="neutral">Operations manager</Badge>}
          />
        </Card>
      </section>
    </div>
  );
};
