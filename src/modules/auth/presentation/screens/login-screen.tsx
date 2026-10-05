import { StatusBar } from 'expo-status-bar';
import { Controller } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLoginViewModel } from '../view-models/use-login-view-model';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  ASSETS,
  AuthSheet,
  Banner,
  Button,
  colors,
  HeroImage,
  Logo,
  spacing,
  TextField,
} from '@/shared/ui';

const HERO_HEIGHT = 300;
const { login: TEXT } = STRINGS;

export function LoginScreen() {
  const vm = useLoginViewModel();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <HeroImage source={ASSETS.heroGate} overlay="soft" style={styles.hero} />
        <AuthSheet>
          <View style={styles.header}>
            <Logo />
            <AppText variant="title" align="center" role="heading">
              {TEXT.title}
            </AppText>
            <AppText color={colors.textMuted} align="center">
              {TEXT.subtitle}
            </AppText>
          </View>

          {vm.passwordChangeRequired && (
            <Banner
              tone="warning"
              title={TEXT.passwordChange.title}
              message={TEXT.passwordChange.message}
              onDismiss={vm.dismissPasswordChange}
            />
          )}
          {vm.isDemoAuth && <Banner tone="info" message={TEXT.demoMode} />}

          <Controller
            control={vm.control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                label={TEXT.emailLabel}
                icon="email-outline"
                placeholder={TEXT.emailPlaceholder}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                returnKeyType="next"
              />
            )}
          />
          <Controller
            control={vm.control}
            name="password"
            render={({ field, fieldState }) => (
              <TextField
                label={TEXT.passwordLabel}
                icon="key-outline"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                secureTextEntry={!vm.passwordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={vm.submit}
                trailingAction={{
                  icon: vm.passwordVisible ? 'eye-off-outline' : 'eye-outline',
                  label: vm.passwordVisible ? TEXT.hidePassword : TEXT.showPassword,
                  onPress: vm.togglePasswordVisible,
                }}
              />
            )}
          />

          <Button label={TEXT.submit} onPress={vm.submit} loading={vm.isSubmitting} />
          <AppText variant="caption" color={colors.textMuted} align="center">
            {TEXT.forgotPassword}
          </AppText>
        </AuthSheet>
      </ScrollView>

      {vm.bannerError && (
        <View style={[styles.floatingBanner, { top: insets.top + spacing.xs }]}>
          <Banner tone="error" message={vm.bannerError} onDismiss={vm.dismissBanner} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  content: { flexGrow: 1 },
  hero: { height: HERO_HEIGHT },
  header: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  floatingBanner: { position: 'absolute', left: spacing.md, right: spacing.md },
});
