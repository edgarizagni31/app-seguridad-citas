import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import {
  currentStep,
  invalidatedBy,
  nextStep,
  OBSERVATION_MAX_LENGTH,
  previousStep,
  progress,
  STANDARD_DEFINITION_V1,
  visibleSteps,
  type Answer,
  type Answers,
  type StepDefinition,
} from '../../domain';
import { useDependencies } from '@/core/di';
import { STRINGS } from '@/shared/lib';
import { useLiveData } from '@/shared/ui';

const { inspection: TEXT } = STRINGS;
const DEFINITION = STANDARD_DEFINITION_V1;
export const REVIEW = 'review';
const ADVANCE_MS = 400;
// Con el aviso "Se omitirá la fotografía…" se deja un poco más de tiempo para leerlo
const ADVANCE_WITH_NOTICE_MS = 1200;

const confirm = (title: string, message: string, action: string) =>
  new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: TEXT.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });

// Aviso de la trama ("Se omitirá la fotografía de…") del paso que deja de aplicar con esta respuesta
const skippedMessageFor = (answers: Answers, step: StepDefinition, answer: Answer) => {
  const before = new Set(visibleSteps(DEFINITION, answers).map((item) => item.id));
  const after = new Set(
    visibleSteps(DEFINITION, { ...answers, [step.id]: answer }).map((item) => item.id),
  );
  return (
    DEFINITION.steps.find(
      (item) => before.has(item.id) && !after.has(item.id) && item.skippedMessage,
    )?.skippedMessage ?? null
  );
};

export function useInspectionWizard() {
  const router = useRouter();
  const { inspectionId } = useLocalSearchParams<{ inspectionId: string }>();
  const { inspections, changes, logger } = useDependencies();
  const { data: inspection } = useLiveData(
    () => inspections.get(inspectionId),
    changes,
    inspections.tables,
  );
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  // Al corregir desde la revisión, después de responder se vuelve a la revisión
  const [fromReview, setFromReview] = useState(false);
  // Mientras avanza se muestra la opción elegida sin esperar a que se recargue la inspección
  const [advancing, setAdvancing] = useState<{ value: boolean; omitted: string | null } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [observation, setObservation] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const answers: Answers = inspection?.answers ?? {};
  // Sin paso elegido se retoma en el primero sin responder (RF-G9)
  const stepId =
    selectedStep ?? (inspection ? (currentStep(DEFINITION, answers)?.id ?? REVIEW) : null);
  const step = DEFINITION.steps.find((candidate) => candidate.id === stepId) ?? null;

  const goAfter = (from: string, updated: Answers) => {
    const next = fromReview
      ? currentStep(DEFINITION, updated)
      : nextStep(DEFINITION, updated, from);
    if (!next) setFromReview(false);
    setSelectedStep(next?.id ?? REVIEW);
    setError(null);
  };

  const save = async (stepToAnswer: StepDefinition, answer: Exclude<Answer, { kind: 'photo' }>) => {
    setBusy(true);
    const result = await inspections.answer(inspectionId, stepToAnswer.id, answer);
    setBusy(false);
    if (!result.ok) {
      logger.warn('No se pudo guardar la respuesta', { error: result.error.type });
      setError(TEXT.saveFailed);
      return null;
    }
    return result.value.answers;
  };

  const choose = async (value: boolean) => {
    if (!step || step.kind !== 'yes_no' || busy || advancing) return;
    const answer: Answer = { kind: 'yes_no', value };
    const previous = answers[step.id];
    if (previous?.kind === 'yes_no' && previous.value === value) return goAfter(step.id, answers);

    const lost = invalidatedBy(DEFINITION, answers, step.id, answer);
    if (
      lost.length > 0 &&
      !(await confirm(TEXT.changeAnswerTitle, TEXT.changeAnswerMessage, TEXT.changeAnswerConfirm))
    ) {
      return;
    }
    const updated = await save(step, answer);
    if (!updated) return;
    void Haptics.selectionAsync().catch(() => undefined);
    // RF-G1c: avance automático, con el aviso de la foto omitida si respondió No
    const omitted = skippedMessageFor(answers, step, answer);
    setAdvancing({ value, omitted });
    timer.current = setTimeout(
      () => {
        setAdvancing(null);
        goAfter(step.id, updated);
      },
      omitted ? ADVANCE_WITH_NOTICE_MS : (step.autoAdvanceMs ?? ADVANCE_MS),
    );
  };

  const confirmPlate = async () => {
    if (!step || step.kind !== 'plate' || busy) return;
    const updated = await save(step, { kind: 'plate', confirmed: true });
    if (updated) goAfter(step.id, updated);
  };

  const reportMismatch = async () => {
    if (busy) return;
    if (
      !(await confirm(
        TEXT.plateMismatchTitle,
        TEXT.plateMismatchMessage,
        TEXT.plateMismatchConfirm,
      ))
    ) {
      return;
    }
    setBusy(true);
    const result = await inspections.reportMismatch(inspectionId);
    setBusy(false);
    if (!result.ok) return setError(TEXT.saveFailed);
    router.replace({ pathname: '/inspection/result/[inspectionId]', params: { inspectionId } });
  };

  const openCamera = () => {
    if (!step) return;
    router.push({ pathname: '/inspection/camera', params: { inspectionId, stepId: step.id } });
  };

  const retake = async () => {
    if (await confirm(TEXT.retakeTitle, TEXT.retakeMessage, TEXT.retakeConfirm)) openCamera();
  };

  const back = () => {
    if (timer.current) clearTimeout(timer.current);
    setAdvancing(null);
    if (stepId === REVIEW) {
      const visible = visibleSteps(DEFINITION, answers);
      return setSelectedStep(visible.at(-1)?.id ?? null);
    }
    const previous = step ? previousStep(DEFINITION, answers, step.id) : null;
    if (previous) return setSelectedStep(previous.id);
    router.back();
  };

  const exit = async () => {
    if (await confirm(TEXT.exitTitle, TEXT.exitMessage, TEXT.exitConfirm)) router.back();
  };

  const submit = async () => {
    if (busy || !inspection) return;
    setBusy(true);
    setError(null);
    if (observation !== null && observation !== inspection.observation) {
      await inspections.updateObservation(inspectionId, observation);
    }
    const result = await inspections.finish(inspectionId);
    setBusy(false);
    if (!result.ok) {
      setError(
        result.error.type === 'incomplete' ? TEXT.review.incomplete : TEXT.review.submitFailed,
      );
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    router.replace({ pathname: '/inspection/result/[inspectionId]', params: { inspectionId } });
  };

  return {
    inspection: inspection ?? null,
    loading: inspection === undefined,
    stepId,
    step,
    answer: step ? (answers[step.id] ?? null) : null,
    progress: step ? progress(DEFINITION, answers, step.id) : null,
    reviewSteps: visibleSteps(DEFINITION, answers),
    answers,
    advancing,
    busy,
    error,
    observation: observation ?? inspection?.observation ?? '',
    observationMax: OBSERVATION_MAX_LENGTH,
    setObservation: (text: string) => setObservation(text.slice(0, OBSERVATION_MAX_LENGTH)),
    choose: (value: boolean) => void choose(value),
    confirmPlate: () => void confirmPlate(),
    reportMismatch: () => void reportMismatch(),
    takePhoto: openCamera,
    retake: () => void retake(),
    continueFromPhoto: () => step && goAfter(step.id, answers),
    editStep: (id: string) => {
      setFromReview(true);
      setSelectedStep(id);
    },
    back,
    exit: () => void exit(),
    submit: () => void submit(),
  };
}
