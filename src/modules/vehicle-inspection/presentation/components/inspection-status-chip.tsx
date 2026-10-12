import type { InspectionStatus } from '@/shared/domain';
import { STRINGS } from '@/shared/lib';
import { StatusChip, type ChipTone, type IconName } from '@/shared/ui';

const STYLE: Record<InspectionStatus, { tone: ChipTone; icon: IconName }> = {
  pending: { tone: 'warning', icon: 'clock-outline' },
  in_progress: { tone: 'info', icon: 'progress-clock' },
  inspected: { tone: 'success', icon: 'check-circle-outline' },
  observed: { tone: 'danger', icon: 'alert-circle-outline' },
};

export function InspectionStatusChip({ status }: { status: InspectionStatus }) {
  return <StatusChip label={STRINGS.inspections.status[status]} {...STYLE[status]} />;
}
