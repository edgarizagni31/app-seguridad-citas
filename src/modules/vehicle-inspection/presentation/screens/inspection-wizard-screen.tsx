import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import type { Answer, StepDefinition } from '../../domain';
import { InspectionTopBar } from '../components/inspection-top-bar';
import { ReferenceImage } from '../components/reference-image';
import { StepHeader } from '../components/step-header';
import { StepPrompt } from '../components/step-prompt';
import { YesNoOptions } from '../components/yes-no-options';
import { REVIEW, useInspectionWizard } from '../view-models/use-inspection-wizard';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Banner,
  Button,
  colors,
  Icon,
  radius,
  Screen,
  spacing,
  typography,
} from '@/shared/ui';

const { inspection: TEXT } = STRINGS;

type Wizard = ReturnType<typeof useInspectionWizard>;

export function InspectionWizardScreen() {
  const vm = useInspectionWizard();
  if (vm.inspection && vm.inspection.state !== 'draft') {
    return (
      <Redirect
        href={{
          pathname: '/inspection/result/[inspectionId]',
          params: { inspectionId: vm.inspection.id },
        }}
      />
    );
  }

  return (
    <Screen>
      <View style={styles.top}>
        <InspectionTopBar title={TEXT.header} onBack={vm.back} onClose={vm.exit} />
        {vm.inspection && vm.progress && (
          <StepHeader
            position={vm.progress.position}
            total={vm.progress.total}
            plate={vm.inspection.plate}
            voucherCode={vm.inspection.voucherCode}
          />
        )}
      </View>
      {vm.loading || !vm.inspection ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : vm.stepId === REVIEW ? (
        <ReviewView vm={vm} />
      ) : vm.step ? (
        <StepView vm={vm} step={vm.step} />
      ) : null}
    </Screen>
  );
}

function StepView({ vm, step }: { vm: Wizard; step: StepDefinition }) {
  const photo = vm.answer?.kind === 'photo' ? vm.answer.photo : null;
  const choice = vm.advancing?.value ?? (vm.answer?.kind === 'yes_no' ? vm.answer.value : null);

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        {step.kind === 'plate' && vm.inspection && (
          <>
            <StepPrompt title={step.title} prompt={step.prompt} />
            <View style={styles.plateRow}>
              <Icon name="check-circle" size={48} color={colors.primary} />
              <View style={styles.plate}>
                <AppText variant="plate">{vm.inspection.plate}</AppText>
              </View>
            </View>
            <Banner tone="info" message={TEXT.plateHint} />
          </>
        )}
        {step.kind === 'yes_no' && (
          <>
            <StepPrompt title={step.title} prompt={step.prompt} />
            <ReferenceImage stepId={step.id} tagged={false} />
            <YesNoOptions
              label={step.title}
              value={choice}
              disabled={vm.busy || vm.advancing !== null}
              onChoose={vm.choose}
            />
            {vm.advancing?.omitted && (
              <Banner tone="warning" message={TEXT.omitted(vm.advancing.omitted)} />
            )}
          </>
        )}
        {step.kind === 'photo' && (
          <>
            <StepPrompt prompt={step.prompt} conditional={Boolean(step.showIf)} />
            <ReferenceImage stepId={step.id} photoUri={photo?.uri} />
          </>
        )}
        {vm.error && <Banner tone="error" message={vm.error} />}
      </ScrollView>
      <View style={styles.footer}>
        {step.kind === 'plate' && (
          <>
            <Button
              label={TEXT.continue}
              icon="chevron-right"
              size="lg"
              loading={vm.busy}
              onPress={vm.confirmPlate}
            />
            <Button
              label={TEXT.plateMismatch}
              variant="text"
              disabled={vm.busy}
              onPress={vm.reportMismatch}
            />
          </>
        )}
        {step.kind === 'photo' &&
          (photo ? (
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button
                  label={TEXT.retakePhoto}
                  icon="camera-retake-outline"
                  variant="outline"
                  onPress={vm.retake}
                />
              </View>
              <View style={styles.flex}>
                <Button label={TEXT.continue} icon="chevron-right" onPress={vm.continueFromPhoto} />
              </View>
            </View>
          ) : (
            <Button label={TEXT.takePhoto} icon="camera-outline" size="lg" onPress={vm.takePhoto} />
          ))}
      </View>
    </>
  );
}

function answerLabel(answer: Answer | undefined) {
  if (!answer) return '—';
  if (answer.kind === 'plate') return TEXT.review.plateConfirmed;
  if (answer.kind === 'yes_no') return answer.value ? TEXT.yes : TEXT.no;
  return TEXT.review.photo;
}

function ReviewView({ vm }: { vm: Wizard }) {
  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.titles}>
          <AppText variant="heading" role="heading">
            {TEXT.review.title}
          </AppText>
          <AppText color={colors.textMuted}>{TEXT.review.subtitle}</AppText>
        </View>
        {vm.reviewSteps.map((step) => {
          const answer = vm.answers[step.id];
          return (
            <Pressable
              key={step.id}
              role="button"
              aria-label={TEXT.review.edit(step.title)}
              onPress={() => vm.editStep(step.id)}
              style={({ pressed }) => [styles.reviewRow, pressed && styles.pressed]}
            >
              {answer?.kind === 'photo' ? (
                <Image
                  source={{ uri: answer.photo.uri }}
                  style={styles.thumb}
                  contentFit="cover"
                  aria-hidden
                />
              ) : (
                <View style={[styles.thumb, styles.thumbIcon]}>
                  <Icon
                    name={answer?.kind === 'plate' ? 'card-text-outline' : 'help-circle-outline'}
                    color={colors.textMuted}
                  />
                </View>
              )}
              <View style={styles.flex}>
                <AppText variant="caption" color={colors.textMuted} numberOfLines={2}>
                  {step.title}
                </AppText>
                <AppText variant="bodyStrong">{answerLabel(answer)}</AppText>
              </View>
              <Icon name="pencil-outline" color={colors.primaryText} />
            </Pressable>
          );
        })}
        <View style={styles.observation}>
          <AppText variant="label">{TEXT.review.observation}</AppText>
          <TextInput
            value={vm.observation}
            onChangeText={vm.setObservation}
            placeholder={TEXT.review.observationPlaceholder}
            placeholderTextColor={colors.textMuted}
            aria-label={TEXT.review.observation}
            multiline
            maxLength={vm.observationMax}
            style={styles.observationInput}
          />
          <AppText variant="caption" color={colors.textMuted} align="right">
            {TEXT.review.observationCount(vm.observation.length, vm.observationMax)}
          </AppText>
        </View>
        {vm.error && <Banner tone="error" message={vm.error} />}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label={TEXT.review.submit}
          icon="send"
          size="lg"
          loading={vm.busy}
          onPress={vm.submit}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  loading: { marginTop: spacing.xl },
  content: { padding: spacing.md, gap: spacing.md },
  titles: { gap: spacing.xxs },
  row: { flexDirection: 'row', gap: spacing.sm },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  plate: {
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.plateBorder,
    backgroundColor: colors.surface,
  },
  footer: { padding: spacing.md, gap: spacing.xs },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  thumb: { width: 56, height: 42, borderRadius: radius.sm },
  thumbIcon: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  observation: { gap: spacing.xs },
  observationInput: {
    minHeight: 96,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    textAlignVertical: 'top',
    ...typography.body,
    color: colors.text,
  },
  pressed: { opacity: 0.75 },
});
