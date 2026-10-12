import { Redirect } from 'expo-router';
import { Controller } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import {
  DOCUMENT_OPTIONS,
  useAddVisitorViewModel,
} from '../view-models/use-add-visitor-view-model';
import { useCurrentUser } from '@/modules/auth';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Avatar,
  Banner,
  Button,
  colors,
  IconButton,
  RoleChip,
  Screen,
  SegmentedControl,
  SelectField,
  spacing,
  TextField,
} from '@/shared/ui';

const { entry: ENTRY } = STRINGS;
const { form: TEXT } = ENTRY;

export function AddVisitorScreen() {
  const vm = useAddVisitorViewModel();
  const user = useCurrentUser();
  if (!vm.hasDraft) return <Redirect href="/" />;
  const { control, formState } = vm.form;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            {user && <Avatar name={`${user.firstName} ${user.lastName}`} />}
            <View style={styles.flex}>
              {user && (
                <AppText variant="bodyStrong">{STRINGS.session.greeting(user.firstName)}</AppText>
              )}
              <RoleChip label={STRINGS.session.securityRole} />
            </View>
            <IconButton icon="close" label={TEXT.close} onPress={vm.cancel} />
          </View>
          <View style={styles.titles}>
            <AppText variant="heading" role="heading">
              {TEXT.title}
            </AppText>
            <AppText color={colors.textMuted}>{TEXT.subtitle}</AppText>
          </View>
          {vm.bannerError && <Banner tone="error" message={vm.bannerError} />}

          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <TextField
                label={TEXT.fullName}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="words"
                autoComplete="off"
                error={formState.errors.name?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="documentType"
            render={({ field }) => (
              <SelectField
                label={TEXT.documentType}
                placeholder={TEXT.documentTypePlaceholder}
                closeLabel={TEXT.close}
                options={DOCUMENT_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                error={formState.errors.documentType?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="documentNumber"
            render={({ field }) => (
              <TextField
                label={TEXT.documentNumber}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect={false}
                error={formState.errors.documentNumber?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <View style={styles.field}>
                <AppText variant="label">{TEXT.role}</AppText>
                <SegmentedControl
                  label={TEXT.role}
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: 'HELPER', label: ENTRY.roles.HELPER },
                    { value: 'DRIVER', label: ENTRY.roles.DRIVER },
                  ]}
                />
              </View>
            )}
          />
        </ScrollView>
        <View style={styles.footer}>
          <Button
            label={ENTRY.addVisitor}
            size="lg"
            loading={formState.isSubmitting}
            onPress={() => void vm.submit()}
          />
          <Button label={ENTRY.cancel} variant="outline" onPress={vm.cancel} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titles: { gap: spacing.xxs },
  field: { gap: spacing.xs },
  footer: { padding: spacing.md, gap: spacing.sm },
});
