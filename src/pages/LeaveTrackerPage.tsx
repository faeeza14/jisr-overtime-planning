import { Empty } from '@jisr-hr/ds-web';
import { ClipboardList } from 'lucide-react';

export const LeaveTrackerPage = () => (
  <div className="p-5 sm:p-6">
    <div className="flex justify-center py-16">
      <Empty
        media={<ClipboardList className="size-8" />}
        title="Leave Tracker"
        description="Leave requests and balances live here — out of scope for this overtime review."
      />
    </div>
  </div>
);
