import type { StoredInspection } from '../../domain';
import { STRINGS } from '@/shared/lib';
import { StatusChip, type ChipTone, type IconName } from '@/shared/ui';

export type LocalInspectionStatus =
  'in_progress' | 'pending' | 'compliant' | 'non_compliant' | 'rejected';

// Estado de la inspección guardada en el teléfono: el veredicto lo da el servidor al recibirla
export function localStatusOf(
  inspection: Pick<StoredInspection, 'state' | 'syncStatus' | 'verdict'>,
): LocalInspectionStatus {
  if (inspection.state === 'draft') return 'in_progress';
  if (inspection.syncStatus === 'rejected') return 'rejected';
  if (inspection.verdict) return inspection.verdict.compliant ? 'compliant' : 'non_compliant';
  return 'pending';
}

const STYLE: Record<LocalInspectionStatus, { tone: ChipTone; icon: IconName }> = {
  in_progress: { tone: 'info', icon: 'progress-clock' },
  pending: { tone: 'warning', icon: 'cloud-clock-outline' },
  compliant: { tone: 'success', icon: 'check-circle-outline' },
  non_compliant: { tone: 'danger', icon: 'alert-circle-outline' },
  rejected: { tone: 'danger', icon: 'close-circle-outline' },
};

export function InspectionStatusChip({ status }: { status: LocalInspectionStatus }) {
  return <StatusChip label={STRINGS.inspections.status[status]} {...STYLE[status]} />;
}
