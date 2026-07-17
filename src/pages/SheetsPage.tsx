import { useMemo, useState } from 'react';
import {
  PageHeader,
  SmartBreadcrumb,
  Banner,
  Badge,
  Button,
  useToast,
} from '@jisr-hr/ds-web';
import { Zap } from 'lucide-react';
import { useOTStore } from '../store';
import { compileSheet, employeesWithOT } from '../lib/sheet';
import { SheetTable } from '../components/sheet/SheetTable';
import { PendingRequestsTable } from '../components/sheet/PendingRequestsTable';
import { SummaryPanel } from '../components/sheet/SummaryPanel';
import { RetroactivesPanel } from '../components/sheet/RetroactivesPanel';

type Tab = 'summary' | 'sheet' | 'preq' | 'retro';

export const SheetsPage = () => {
  const { employees, records, requests, plans, sheetMock, approveRequest, rejectRequest, captureRequest } =
    useOTStore();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('sheet');
  const [flashEmployeeId, setFlashEmployeeId] = useState<string | null>(null);

  const recordList = useMemo(() => Object.values(records), [records]);
  const requestList = useMemo(() => Object.values(requests), [requests]);
  const rows = useMemo(
    () => compileSheet(employees, recordList, requestList, sheetMock),
    [employees, recordList, requestList, sheetMock],
  );
  const pending = requestList.filter((r) => r.status === 'pending');

  const flash = (employeeId: string) => {
    setFlashEmployeeId(employeeId);
    setTimeout(() => setFlashEmployeeId(null), 2200);
  };

  const onApprove = (id: string) => {
    const req = requests[id];
    approveRequest(id);
    const name = employees.find((e) => e.id === req?.employeeId)?.name ?? 'Employee';
    toast.success('Overtime approved', `${name} · written to the sheet automatically`);
    if (req) flash(req.employeeId);
    setTimeout(() => setTab('sheet'), 650);
  };
  const onReject = (id: string) => {
    rejectRequest(id);
    toast.warning('Request rejected', 'Nothing posted to the sheet.');
  };
  const onCapture = () => {
    captureRequest();
    toast.info('Captured from a punch', 'Pending request created — approve it to flow to the sheet.');
    setTab('preq');
  };

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'summary', label: 'Summary' },
    { key: 'sheet', label: 'Sheet' },
    { key: 'preq', label: 'Pending Requests', count: pending.length },
    { key: 'retro', label: 'Retroactives' },
  ];

  return (
    <div>
      <PageHeader
        breadcrumb={
          <SmartBreadcrumb
            items={[
              { label: 'Attendance & Leave', to: '/shifts/scheduler' },
              { label: 'Attendance Sheets' },
              { label: 'Monthly Sheet' },
            ]}
          />
        }
        title="Sheets & Settlements"
        description="Where approved overtime lands for payroll — planned plans and approved requests post here."
        border={false}
        actions={
          <Button variant="primary" size="sm" onClick={onCapture}>
            <Zap className="size-4" /> Capture unplanned OT from a punch
          </Button>
        }
      />

      <div className="px-5 sm:px-6 space-y-4 pb-6">
        {/* Period + status */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[19px] font-bold text-app-ink dark:text-app-ink-dark">23 Jun — 22 Jul, 2026</div>
          <Badge appearance="warning" size="small">Monthly Sheet</Badge>
          <Badge appearance="warning" size="small">Pending</Badge>
        </div>

        {/* Review banner */}
        {pending.length > 0 && (
          <Banner
            appearance="info"
            emphasis="mid"
            title="Review pending records"
            actions={
              <Button variant="secondary" size="sm" onClick={() => setTab('preq')}>
                Review {pending.length} request{pending.length === 1 ? '' : 's'}
              </Button>
            }
          >
            Unplanned overtime is waiting to be approved into this sheet.
          </Banner>
        )}

        {/* Tab strip */}
        <div className="border-b border-app-line dark:border-app-line-dark">
          <div className="flex gap-5">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={[
                  'pb-2.5 -mb-px text-13 font-medium border-b-2 transition inline-flex items-center gap-1.5 focus-ring rounded-t',
                  tab === t.key
                    ? 'border-app-ink dark:border-app-ink-dark text-app-ink dark:text-app-ink-dark'
                    : 'border-transparent text-app-mute dark:text-app-mute-dark hover:text-app-ink',
                ].join(' ')}
              >
                {t.label}
                {t.count ? (
                  <Badge appearance={tab === t.key ? 'neutral' : 'warning'} size="small">{t.count}</Badge>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {tab === 'summary' && (
          <SummaryPanel
            employeeCount={employees.length}
            gotApprovedOT={employeesWithOT(rows)}
            gotPending={pending.length}
          />
        )}
        {tab === 'sheet' && (
          <>
            <SheetTable rows={rows} employees={employees} plans={plans} requests={requests} flashEmployeeId={flashEmployeeId} />
            <p className="text-11 text-app-faint">
              <Zap className="inline size-3 text-accent-ink" /> The Approved-overtime columns fill live from
              approved plans and approved requests — hover a dot to see the source.
            </p>
          </>
        )}
        {tab === 'preq' && (
          <PendingRequestsTable requests={pending} employees={employees} onApprove={onApprove} onReject={onReject} />
        )}
        {tab === 'retro' && <RetroactivesPanel />}
      </div>
    </div>
  );
};
