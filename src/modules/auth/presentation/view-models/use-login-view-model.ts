import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { isValidEmail, type AuthError, type CredentialsError } from '../../domain';
import { useSessionStore } from '../stores/session-store';
import { useDependencies } from '@/core/di';
import { STRINGS } from '@/shared/lib';

const { errors: ERRORS } = STRINGS.login;

const loginFormSchema = z.object({
  email: z.string().trim().min(1, ERRORS.emailRequired).refine(isValidEmail, ERRORS.emailInvalid),
  password: z.string().min(1, ERRORS.passwordRequired),
});

export type LoginForm = z.infer<typeof loginFormSchema>;

type LoginFailure = CredentialsError | AuthError;

export function useLoginViewModel() {
  const { auth, config, logger } = useDependencies();
  const setSession = useSessionStore((state) => state.setSession);
  const notice = useSessionStore((state) => state.notice);
  const dismissNotice = useSessionStore((state) => state.dismissNotice);

  const [bannerError, setBannerError] = useState<string | null>(null);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const showFailure = (error: LoginFailure) => {
    switch (error.type) {
      case 'invalid-credentials':
        setBannerError(ERRORS.banner);
        form.setError('password', { message: ERRORS.invalidCredentials });
        return;
      case 'password-change-required':
        setPasswordChangeRequired(true);
        return;
      case 'network':
        setBannerError(STRINGS.common.noConnection);
        return;
      case 'invalid-email':
        form.setError('email', { message: ERRORS.emailInvalid });
        return;
      case 'empty-password':
        form.setError('password', { message: ERRORS.passwordRequired });
        return;
      default:
        logger.error('Fallo inesperado al iniciar sesión', { error: error.type });
        setBannerError(STRINGS.common.unexpectedError);
    }
  };

  const onValid = async ({ email, password }: LoginForm) => {
    setBannerError(null);
    setPasswordChangeRequired(false);
    dismissNotice();

    const result = await auth.login(email, password);
    if (result.ok) {
      setSession(result.value);
      return;
    }
    showFailure(result.error);
  };

  return {
    control: form.control,
    submit: () => void form.handleSubmit(onValid)(),
    isSubmitting: form.formState.isSubmitting,
    bannerError: bannerError ?? (notice === 'session-expired' ? STRINGS.session.expired : null),
    dismissBanner: () => {
      setBannerError(null);
      dismissNotice();
    },
    passwordChangeRequired,
    dismissPasswordChange: () => setPasswordChangeRequired(false),
    passwordVisible,
    togglePasswordVisible: () => setPasswordVisible((visible) => !visible),
    isDemoAuth: config.isDemoAuth,
  };
}
