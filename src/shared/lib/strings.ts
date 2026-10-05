export const STRINGS = {
  app: {
    name: 'Portal Citas',
    subtitle: 'Control de Garita',
    loading: 'Cargando',
    version: (version: string) => `v${version}`,
  },
  common: {
    retry: 'Reintentar',
    back: 'Volver',
    close: 'Cerrar',
    copy: 'Copiar',
    copied: 'Copiado',
    understood: 'Entendido',
    unexpectedError: 'Ocurrió un error inesperado.',
    noConnection: 'Sin conexión con el servidor. Verifica tu red e inténtalo de nuevo.',
  },
  login: {
    title: 'Iniciar sesión',
    subtitle: 'Usa tu cuenta de Ransa 360',
    emailLabel: 'Correo',
    emailPlaceholder: 'nombre@empresa.com',
    passwordLabel: 'Contraseña',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
    submit: 'Ingresar',
    forgotPassword: '¿Olvidaste tu contraseña? Gestiónala en el portal web.',
    demoMode: 'Modo demo: autenticación simulada',
    errors: {
      banner: 'No pudimos iniciar sesión. Inténtalo de nuevo.',
      invalidCredentials: 'Correo o contraseña incorrectos',
      emailRequired: 'Ingresa tu correo',
      emailInvalid: 'Ingresa un correo válido',
      passwordRequired: 'Ingresa tu contraseña',
    },
    passwordChange: {
      title: 'Debes cambiar tu contraseña',
      message:
        'Por seguridad, actualiza tu contraseña en el portal web de Ransa 360 y vuelve a ingresar.',
    },
  },
  session: {
    expired: 'Tu sesión expiró. Vuelve a iniciar sesión.',
    logout: 'Cerrar sesión',
    greeting: (firstName: string) => `Hola, ${firstName}`,
    securityRole: 'Seguridad',
  },
  accessDenied: {
    title: 'Sin acceso al control de garita',
    message: 'Tu usuario no tiene un rol de seguridad asignado. Solicítalo a tu administrador.',
  },
  home: {
    emptyTitle: 'Aún no has escaneado ningún código',
    emptyMessage: 'Apunta la cámara al QR de la unidad, voucher o pase de visitante',
    scan: 'Escanear QR',
    scanAnother: 'Escanear otro',
  },
  scanner: {
    hint: 'Centra el código QR dentro del recuadro',
    torchOn: 'Encender linterna',
    torchOff: 'Apagar linterna',
    close: 'Cerrar escáner',
    permission: {
      title: 'Necesitamos acceso a la cámara',
      message:
        'Para escanear los códigos QR en garita, habilita el permiso de cámara en los ajustes del teléfono.',
      request: 'Permitir cámara',
      openSettings: 'Abrir ajustes',
    },
  },
  scanResult: {
    readToday: (time: string) => `Leído hoy ${time}`,
    readOn: (date: string, time: string) => `Leído ${date} ${time}`,
    code: 'Código',
    plate: 'Placa',
    suffix: 'Placa o documento',
    passCode: 'Código de pase',
    rawContent: 'Contenido leído',
    types: {
      transportUnit: 'Unidad de transporte',
      voucher: 'Voucher',
      visitorPass: 'Pase de visitante',
      unknown: 'No reconocido',
    },
    notes: {
      transportUnit: 'Lectura correcta. La validación de ingreso se realiza en el siguiente paso.',
      voucher:
        'Este QR corresponde al voucher, no a una unidad. Escanea el QR de la unidad que incluye la placa.',
      visitorPass: 'Pase de visitante leído. Su registro se realiza en el paso de visitantes.',
      unknown: 'El contenido no corresponde a ningún formato de QR del portal.',
    },
  },
} as const;
