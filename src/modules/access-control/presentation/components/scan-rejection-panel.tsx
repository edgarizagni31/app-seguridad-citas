import { ScrollView, StyleSheet, View } from 'react-native';

import type { ScanResultView } from '../mappers/scan-result-view';
import { ScanResultCard } from './scan-result-card';
import { STRINGS } from '@/shared/lib';
import { AppText, Button, colors, Icon, spacing } from '@/shared/ui';

const { rejection: TEXT } = STRINGS.entry;

type ScanRejectionPanelProps = {
  message: string;
  detail: ScanResultView | null;
  onScanAgain: () => void;
};

export function ScanRejectionPanel({ message, detail, onScanAgain }: ScanRejectionPanelProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header} role="alert">
        <Icon name="alert-octagon" size={56} color={colors.danger} />
        <AppText variant="heading" align="center" role="heading">
          {TEXT.title}
        </AppText>
        <AppText align="center" color={colors.textMuted}>
          {message}
        </AppText>
      </View>
      {detail && <ScanResultCard view={detail} />}
      <Button label={TEXT.scanAgain} icon="qrcode-scan" onPress={onScanAgain} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', gap: spacing.lg, padding: spacing.lg },
  header: { alignItems: 'center', gap: spacing.sm },
});
