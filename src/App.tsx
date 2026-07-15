import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ToastProvider } from '@jisr-hr/ds-web';
import { AppShell } from './components/shell/AppShell';
import { ShiftsLayout } from './components/shell/ShiftsLayout';
import { SchedulerPage } from './pages/SchedulerPage';
import { PlanOvertimeListPage } from './pages/PlanOvertimeListPage';
import { PlanCreatePage } from './pages/PlanCreatePage';
import { PlanSummaryPage } from './pages/PlanSummaryPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { ShiftSettingsPage } from './pages/ShiftSettingsPage';

// Strip the trailing slash that Vite's BASE_URL always carries so React Router accepts it.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

const App = () => (
  <ToastProvider>
    <Router basename={basename}>
      <Routes>
        <Route path="/" element={<Navigate to="/shifts/scheduler" replace />} />
        <Route element={<AppShell />}>
          {/* Full-page create / summary flows sit OUTSIDE the tab layout (brief §7.2) */}
          <Route path="/shifts/plan-overtime/new" element={<PlanCreatePage />} />
          <Route path="/shifts/plan-overtime/:id" element={<PlanSummaryPage />} />

          <Route path="/shifts" element={<ShiftsLayout />}>
            <Route index element={<Navigate to="scheduler" replace />} />
            <Route path="scheduler" element={<SchedulerPage />} />
            <Route path="plan-overtime" element={<PlanOvertimeListPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="reconciliation" element={<ReconciliationPage />} />
            <Route path="settings" element={<ShiftSettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  </ToastProvider>
);

export default App;
