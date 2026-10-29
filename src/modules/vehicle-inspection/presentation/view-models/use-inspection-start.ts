import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import {
  currentStep,
  definitionOf,
  progress,
  type InspectionTarget,
  type OpenInspectionError,
} from '../../domain';
import { useCurrentUser } from '@/modules/auth';
import { useDependencies } from '@/core/di';
import { STRINGS } from '@/shared/lib';
import { useLiveData } from '@/shared/ui';

const { start: TEXT } = STRINGS.inspections;

export type InspectionStartParams = {
  unitId: string;
  voucherId: string;
  plate: string;
  clientName: string;
  voucherCode: string;
};

const messageFor = (error: OpenInspectionError) => {
  switch (error.type) {
    case 'offline':
    case 'network':
      return TEXT.offline;
    case 'no-protocol':
      return TEXT.noProtocol;
    case 'invalid-protocol':
      return TEXT.invalidProtocol;
    case 'unauthorized':
      return STRINGS.gate.sessionExpired;
    default:
      return STRINGS.common.unexpectedError;
  }
};

export function useInspectionStart() {
  const router = useRouter();
  const { inspections, changes, logger } = useDependencies();
  const user = useCurrentUser();
  const params = useLocalSearchParams<InspectionStartParams>();
  const target: InspectionTarget = {
    voucherId: params.voucherId,
    unitId: params.unitId,
    voucherCode: params.voucherCode ?? '',
    clientName: params.clientName ?? '',
    plate: params.plate ?? '',
  };
  const { data } = useLiveData(() => inspections.list(), changes, inspections.tables);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existing =
    data?.find(
      (inspection) =>
        inspection.voucherId === target.voucherId && inspection.unitId === target.unitId,
    ) ?? null;
  const inspectorName = user ? `${user.firstName} ${user.lastName}` : '';
  const definition = existing ? definitionOf(existing) : null;
  const pending = existing && definition ? currentStep(definition, existing.answers) : null;

  const openWizard = (inspectionId: string) =>
    router.replace({ pathname: '/inspection/wizard/[inspectionId]', params: { inspectionId } });

  const start = async () => {
    if (!user || opening) return;
    setOpening(true);
    setError(null);
    const result = await inspections.open({
      target,
      inspector: { id: user.id, name: inspectorName },
    });
    setOpening(false);
    if (!result.ok) {
      logger.warn('No se pudo abrir la inspección', { error: result.error.type });
      setError(messageFor(result.error));
      return;
    }
    openWizard(result.value.id);
  };

  return {
    loading: data === undefined,
    target,
    inspectorName,
    status: !existing ? 'new' : existing.state === 'draft' ? 'in_progress' : 'finished',
    progress: definition && pending ? progress(definition, existing!.answers, pending.id) : null,
    opening,
    error,
    start: () => void start(),
    viewResult: () => {
      if (existing) {
        router.replace({
          pathname: '/inspection/result/[inspectionId]',
          params: { inspectionId: existing.id },
        });
      }
    },
    back: () => router.back(),
  };
}
