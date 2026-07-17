import { Empty } from '@jisr-hr/ds-web';
import { History } from 'lucide-react';

export const RetroactivesPanel = () => (
  <div className="flex justify-center py-12">
    <Empty
      media={<History className="size-8" />}
      title="Retroactives"
      description="Out of scope for this review — retroactive transactions land here in a later release."
    />
  </div>
);
