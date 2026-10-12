import { STRINGS } from '@/shared/lib';

import { Banner } from './banner';

type SyncBannerProps = {
  online: boolean | null;
  pending: number;
};

export function SyncBanner({ online, pending }: SyncBannerProps) {
  if (online === false) {
    return (
      <Banner
        tone="warning"
        title={STRINGS.sync.offlineTitle}
        message={pending > 0 ? STRINGS.sync.offlinePending(pending) : STRINGS.sync.offlineMessage}
      />
    );
  }
  if (online && pending > 0) return <Banner tone="info" message={STRINGS.sync.syncing(pending)} />;
  return null;
}
