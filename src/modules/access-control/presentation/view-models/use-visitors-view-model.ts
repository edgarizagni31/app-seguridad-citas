import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { blockVisitor, entrySummary, markVisitor, type ArrivalStatus } from '../../domain';
import { useEntryFlowStore } from '../stores/entry-flow-store';
import { useDependencies } from '@/core/di';
import { STRINGS } from '@/shared/lib';

const { entry: TEXT } = STRINGS;

export function useVisitorsViewModel() {
  const router = useRouter();
  const { accessControl, logger } = useDependencies();
  const draft = useEntryFlowStore((state) => state.draft);
  const checkedBy = useEntryFlowStore((state) => state.checkedBy);
  const setDraft = useEntryFlowStore((state) => state.setDraft);
  const finish = useEntryFlowStore((state) => state.finish);

  const [checking, setChecking] = useState<string | null>(null);
  // Cada visitante se consulta en la lista negra una sola vez por flujo
  const [cleared, setCleared] = useState<ReadonlySet<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const vibrate = () =>
    Haptics.selectionAsync().catch((error: unknown) => logger.warn('No se pudo vibrar', { error }));

  const apply = (next: ReturnType<typeof markVisitor>) => {
    const current = useEntryFlowStore.getState().draft;
    if (next.ok && current) setDraft(next.value);
  };

  const mark = async (visitorId: string, status: ArrivalStatus) => {
    const current = useEntryFlowStore.getState().draft;
    const visitor = current?.visitors.find((candidate) => candidate.id === visitorId);
    if (!current || !visitor || checking) return;
    void vibrate();
    if (status !== 'arrived' || visitor.added || cleared.has(visitorId)) {
      return apply(markVisitor(current, visitorId, status));
    }

    setChecking(visitorId);
    const result = await accessControl.validateVisitor({
      voucherId: current.voucherId,
      documentType: visitor.documentType,
      documentNumber: visitor.documentNumber,
    });
    setChecking(null);
    const latest = useEntryFlowStore.getState().draft ?? current;
    if (!result.ok && result.error.type === 'blacklisted') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      return apply(
        blockVisitor(
          latest,
          visitorId,
          result.error.message ?? TEXT.blacklistedMessage(visitor.name),
        ),
      );
    }
    // El documento del QR viene firmado: un formato inesperado no impide marcarlo
    setCleared((previous) => new Set(previous).add(visitorId));
    apply(markVisitor(latest, visitorId, status));
  };

  const confirm = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setSaveError(null);
    const result = await accessControl.confirmEntry(draft);
    setSaving(false);
    if (!result.ok) {
      setSaveError(TEXT.saveFailed);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setConfirmOpen(false);
    finish(result.value);
    router.replace('/entry/confirmed');
  };

  return {
    draft,
    checkedBy,
    summary: draft ? entrySummary(draft) : null,
    checking,
    mark: (visitorId: string, status: ArrivalStatus) => void mark(visitorId, status),
    addVisitor: () => router.push('/entry/add-visitor'),
    confirmOpen,
    openConfirm: () => setConfirmOpen(true),
    closeConfirm: () => setConfirmOpen(false),
    confirm: () => void confirm(),
    saving,
    saveError,
  };
}
