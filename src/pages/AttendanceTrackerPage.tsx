import { Empty } from '@jisr-hr/ds-web';
import { CalendarClock } from 'lucide-react';

export const AttendanceTrackerPage = () => (
  <div className="p-5 sm:p-6">
    <div className="flex justify-center py-16">
      <Empty
        media={<CalendarClock className="size-8" />}
        title="Attendance Tracker"
        description="Daily attendance tracking lives here — out of scope for this overtime review."
      />
    </div>
  </div>
);
