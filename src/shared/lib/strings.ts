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
  sync: {
    offlineTitle: 'Sin conexión',
    offlineMessage: 'Puedes seguir trabajando. Los cambios se enviarán al reconectar.',
    offlinePending: (count: number) =>
      `${count} ${count === 1 ? 'registro pendiente' : 'registros pendientes'} de sincronizar.`,
    syncing: (count: number) =>
      `Sincronizando ${count} ${count === 1 ? 'registro pendiente' : 'registros pendientes'}…`,
    syncNow: 'Sincronizar ahora',
  },
  sites: {
    chooseTitle: 'Elige tu sede',
    chooseSubtitle: 'Selecciona el almacén donde trabajarás este turno.',
    loading: 'Cargando sedes…',
    preparingTitle: 'Preparando tu turno',
    preparingMessage: (site: string) =>
      `Descargando los datos del día de ${site} para que puedas trabajar sin conexión.`,
    offlineTitle: 'Necesitas conexión para iniciar el turno',
    offlineMessage:
      'Conéctate a internet para descargar los datos del día. Después podrás trabajar sin conexión.',
    errorTitle: 'No pudimos preparar tu turno',
    noSites: 'Tu usuario no tiene sedes asignadas. Solicítalas a tu administrador.',
    changeSite: 'Cambiar sede',
    updateData: 'Actualizar datos',
    updatedAgo: (minutes: number) =>
      minutes < 1 ? 'Actualizado hace un momento' : `Actualizado hace ${minutes} min`,
  },
  tabs: {
    gate: 'Garita',
    inspections: 'Inspecciones',
    history: 'Historial',
    profile: 'Mi perfil',
  },
  history: {
    title: 'Historial',
    subtitle: 'Registros de este turno',
    emptyTitle: 'Aún no hay registros en este turno',
    emptyMessage: 'Los ingresos e inspecciones que registres aparecerán aquí.',
    attentionTitle: 'Requiere atención',
    attentionCount: (count: number) =>
      `${count} ${count === 1 ? 'registro rechazado' : 'registros rechazados'} por el servidor`,
    dismiss: 'Descartar',
    status: { pending: 'Pendiente', synced: 'Sincronizado', rejected: 'Rechazado' },
    kinds: { entry: 'Ingreso', inspection: 'Inspección' },
  },
  profile: {
    title: 'Mi perfil',
    site: 'Sede',
    role: 'Rol',
    sync: 'Sincronización',
    allSynced: 'Todo sincronizado',
    pending: (count: number) =>
      `${count} ${count === 1 ? 'registro pendiente' : 'registros pendientes'}`,
    updateFailed: 'No se pudieron actualizar los datos. Verifica tu conexión.',
    logoutWarningTitle: 'Tienes registros sin sincronizar',
    logoutWarningMessage: (count: number) =>
      `Hay ${count} ${count === 1 ? 'registro pendiente' : 'registros pendientes'}. Se enviarán cuando vuelvas a iniciar sesión con conexión.`,
    logoutAnyway: 'Cerrar sesión igualmente',
    cancel: 'Cancelar',
  },
  entry: {
    attentionTitle: (plate: string) => `Ingreso ${plate}`,
    historySubtitle: (entering: number, notArriving: number) =>
      notArriving > 0
        ? `${entering} ingresaron · ${notArriving} no llegaron`
        : `${entering} ${entering === 1 ? 'visitante ingresó' : 'visitantes ingresaron'}`,
  },
  inspections: {
    title: 'Inspecciones vehiculares',
    comingSoon: 'Las inspecciones del día aparecerán aquí.',
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
    hseRole: 'HSE',
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
    document: 'Documento',
    passCode: 'Código de pase',
    rawContent: 'Contenido leído',
    types: {
      transportUnit: 'Unidad de transporte',
      voucher: 'Voucher',
      visitorPass: 'Pase de visitante',
      vehicleToken: 'QR del vehículo',
      unknown: 'No reconocido',
    },
    notes: {
      transportUnit: 'Lectura correcta. La validación de ingreso se realiza en el siguiente paso.',
      voucher:
        'Este QR corresponde al voucher, no a una unidad. Escanea el QR de la unidad que incluye la placa.',
      visitorPass: 'Pase de visitante leído. Su registro se realiza en el paso de visitantes.',
      vehicleToken: 'QR firmado del vehículo. Se valida en el flujo de ingreso.',
      unknown: 'El contenido no corresponde a ningún formato de QR del portal.',
    },
  },
} as const;
