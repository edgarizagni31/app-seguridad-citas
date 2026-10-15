import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Site } from '../../domain';
import { useShiftGate, type ShiftGatePhase } from '../view-models/use-shift-gate';
import { useNeedsShift } from '@/modules/auth';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  ASSETS,
  AuthSheet,
  Banner,
  Button,
  colors,
  HeroImage,
  Icon,
  Logo,
  radius,
  shadows,
  sizes,
  spacing,
} from '@/shared/ui';

const { sites: TEXT } = STRINGS;

type ShiftGateProps = { children: ReactNode };

export function ShiftGate({ children }: ShiftGateProps) {
  // Solo soporte no opera la garita: entra sin sede ni paquete del día
  if (!useNeedsShift()) return children;
  return <ShiftGateContent>{children}</ShiftGateContent>;
}

function ShiftGateContent({ children }: ShiftGateProps) {
  const vm = useShiftGate();
  if (vm.phase.type === 'ready') return children;

  return (
    <View style={styles.flex}>
      <HeroImage source={ASSETS.heroGate} overlay="soft" style={styles.hero} />
      <AuthSheet>
        <View style={styles.header}>
          <Logo width={180} />
        </View>
        <PhaseContent
          phase={vm.phase}
          onSelect={vm.selectSite}
          onRetry={vm.retry}
          onChange={vm.changeSite}
        />
      </AuthSheet>
    </View>
  );
}

type PhaseContentProps = {
  phase: Exclude<ShiftGatePhase, { type: 'ready' }>;
  onSelect: (site: Site) => void;
  onRetry: () => void;
  onChange: () => void;
};

function PhaseContent({ phase, onSelect, onRetry, onChange }: PhaseContentProps) {
  switch (phase.type) {
    case 'checking':
      return <Loading message={TEXT.loading} />;
    case 'downloading':
      return (
        <View style={styles.block}>
          <AppText variant="title" align="center" role="heading">
            {TEXT.preparingTitle}
          </AppText>
          <AppText color={colors.textMuted} align="center">
            {TEXT.preparingMessage(phase.site.name)}
          </AppText>
          <ActivityIndicator color={colors.primary} size="large" style={styles.spinner} />
        </View>
      );
    case 'choosing':
      return (
        <ScrollView contentContainerStyle={styles.block}>
          <AppText variant="title" role="heading">
            {TEXT.chooseTitle}
          </AppText>
          <AppText color={colors.textMuted}>{TEXT.chooseSubtitle}</AppText>
          {phase.sites.map((site) => (
            <SiteRow key={site.id} site={site} onPress={() => onSelect(site)} />
          ))}
        </ScrollView>
      );
    case 'offline':
      return (
        <View style={styles.block}>
          <Banner tone="warning" title={TEXT.offlineTitle} message={TEXT.offlineMessage} />
          <Button label={STRINGS.common.retry} icon="refresh" onPress={onRetry} />
          <Button label={TEXT.changeSite} variant="text" onPress={onChange} />
        </View>
      );
    case 'no-sites':
      return <Banner tone="error" message={TEXT.noSites} />;
    case 'error':
      return (
        <View style={styles.block}>
          <Banner tone="error" title={TEXT.errorTitle} message={STRINGS.common.unexpectedError} />
          <Button label={STRINGS.common.retry} icon="refresh" onPress={onRetry} />
        </View>
      );
  }
}

function Loading({ message }: { message: string }) {
  return (
    <View style={[styles.block, styles.center]}>
      <ActivityIndicator color={colors.primary} size="large" />
      <AppText color={colors.textMuted}>{message}</AppText>
    </View>
  );
}

function SiteRow({ site, onPress }: { site: Site; onPress: () => void }) {
  return (
    <Pressable
      role="button"
      aria-label={site.name}
      onPress={onPress}
      style={({ pressed }) => [styles.siteRow, pressed && styles.pressed]}
    >
      <View style={styles.siteIcon}>
        <Icon name="warehouse" color={colors.primaryText} />
      </View>
      <AppText variant="bodyStrong" style={styles.flex}>
        {site.name}
      </AppText>
      <Icon name="chevron-right" color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { height: 240 },
  header: { alignItems: 'center', marginBottom: spacing.xs },
  block: { gap: spacing.md },
  center: { alignItems: 'center', paddingVertical: spacing.xl },
  spinner: { marginTop: spacing.lg },
  siteRow: {
    minHeight: sizes.cta,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  siteIcon: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
  },
  pressed: { opacity: 0.7 },
});
