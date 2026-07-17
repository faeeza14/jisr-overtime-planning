import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader, SmartBreadcrumb, Badge } from '@jisr-hr/ds-web';
import { useOTStore } from '../../store';
import { plansByStatus } from '../../store/selectors';

export const ShiftsLayout = () => {
  const { plans, features } = useOTStore();

  const pendingCount = plansByStatus(plans, 'pending').length;

  const tabs = [
    { to: '/shifts/scheduler', label: 'Scheduler', show: true },
    { to: '/shifts/plan-overtime', label: 'Plan Overtime', show: features.overtimePlanner },
    { to: '/shifts/approvals', label: 'Approvals', show: features.overtimePlanner, badge: pendingCount },
    { to: '/shifts/settings', label: 'Shift Settings', show: true },
  ].filter((t) => t.show);

  return (
    <div>
      <PageHeader
        breadcrumb={
          <SmartBreadcrumb
            items={[
              { label: 'Attendance & Leave', to: '/shifts/scheduler' },
              { label: 'Shifts & scheduling' },
            ]}
          />
        }
        title="Shifts & scheduling"
        description="Plan the week and pre-plan overtime against budget."
        border={false}
      />
      <div className="px-5 sm:px-6 border-b border-app-line dark:border-app-line-dark">
        <div className="flex gap-5 overflow-x-auto">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `pb-2.5 -mb-px text-13 font-medium border-b-2 transition whitespace-nowrap inline-flex items-center gap-1.5 focus-ring rounded-t ${
                  isActive
                    ? 'border-app-ink dark:border-app-ink-dark text-app-ink dark:text-app-ink-dark'
                    : 'border-transparent text-app-mute dark:text-app-mute-dark hover:text-app-ink'
                }`
              }
            >
              {t.label}
              {t.badge ? (
                <Badge appearance={t.label === 'Approvals' ? 'warning' : 'neutral'} size="small">
                  {t.badge}
                </Badge>
              ) : null}
            </NavLink>
          ))}
        </div>
      </div>
      <Outlet />
    </div>
  );
};
