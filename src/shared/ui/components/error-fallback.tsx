import { StyleSheet, View } from 'react-native';

import { STRINGS } from '@/shared/lib';

import { spacing } from '../theme';
import { Button } from './button';
import { EmptyState } from './empty-state';
import { Screen } from './screen';

type ErrorFallbackProps = { onRetry: () => void };

export function ErrorFallback({ onRetry }: ErrorFallbackProps) {
  return (
    <Screen>
      <View style={styles.center}>
        <EmptyState icon="alert-circle" title={STRINGS.common.unexpectedError} message="">
          <View style={styles.action}>
            <Button label={STRINGS.common.retry} icon="refresh" onPress={onRetry} />
          </View>
        </EmptyState>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  action: { alignSelf: 'stretch', marginTop: spacing.lg },
});
