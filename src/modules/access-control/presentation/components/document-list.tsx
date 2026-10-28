import { StyleSheet, View } from 'react-native';

import { checkDocument, visibleDocuments, type GateDocument } from '../../domain';
import { DocumentCard } from './document-card';
import { useDependencies } from '@/core/di';
import { STRINGS } from '@/shared/lib';
import { AppText, colors, spacing } from '@/shared/ui';

type DocumentListProps = { title: string; documents: readonly GateDocument[] };

export function DocumentList({ title, documents }: DocumentListProps) {
  const { clock, config } = useDependencies();
  const visible = visibleDocuments(documents);

  return (
    <View style={styles.list}>
      <AppText variant="bodyStrong" role="heading">
        {title}
      </AppText>
      {visible.length === 0 ? (
        <AppText color={colors.textMuted}>{STRINGS.gate.noDocuments}</AppText>
      ) : (
        visible.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            check={checkDocument(document, clock.now())}
            timeZone={config.timeZone}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({ list: { gap: spacing.sm } });
