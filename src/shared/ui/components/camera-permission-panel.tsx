import { StyleSheet, View } from 'react-native';

import { STRINGS } from '@/shared/lib';

import type { CameraPermissionState } from '../hooks/use-camera-access';
import { spacing } from '../theme';
import { Button } from './button';
import { EmptyState } from './empty-state';

const { permission: TEXT } = STRINGS.scanner;

type CameraPermissionPanelProps = {
  state: Exclude<CameraPermissionState, 'granted' | 'checking'>;
  onRequest: () => void;
  onOpenSettings: () => void;
};

export function CameraPermissionPanel({
  state,
  onRequest,
  onOpenSettings,
}: CameraPermissionPanelProps) {
  const blocked = state === 'blocked';
  return (
    <View style={styles.container}>
      <EmptyState icon="camera-off-outline" title={TEXT.title} message={TEXT.message}>
        <View style={styles.actions}>
          <Button
            label={blocked ? TEXT.openSettings : TEXT.request}
            onPress={blocked ? onOpenSettings : onRequest}
          />
        </View>
      </EmptyState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingVertical: spacing.lg },
  actions: { alignSelf: 'stretch', marginTop: spacing.md },
});
