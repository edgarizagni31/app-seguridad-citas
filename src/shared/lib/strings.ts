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
    scanTitle: 'Escanear QR del vehículo',
    scanSubtitle: 'Apunta al código QR del vehículo para ver la lista de visitantes.',
    scanHint: 'Apunta al código QR del vehículo',
    cancel: 'Cancelar',
    validating: 'Validando el QR del vehículo…',
    visitorsTitle: 'Visitantes del vehículo',
    voucher: 'Voucher',
    appointmentWindow: (start: string, end: string) => `Cita ${start} – ${end}`,
    expectedVisitors: (count: number) => `Visitantes esperados (${count})`,
    arrived: 'Llegó',
    notArrived: 'No llegó',
    pending: 'Pendiente',
    added: 'Agregado',
    entered: 'Ingresó',
    enteredAt: (time: string) => `Ingresó ${time}`,
    blacklisted: 'Lista negra',
    blacklistedMessage: (name: string) =>
      `${name} se encuentra en la lista negra de la sede y no puede ingresar.`,
    checkingVisitor: 'Validando visitante…',
    addVisitor: 'Agregar visitante',
    markHint: 'Marca si llegó o no cada visitante.',
    lateArrivalHint: 'La unidad ya ingresó. Marca a los visitantes que llegan ahora.',
    offlineValidated: 'Validado sin conexión con los datos del día. Se confirmará al reconectar.',
    confirm: 'Confirmar ingreso',
    confirmCount: (count: number) => `Confirmar ingreso (${count})`,
    confirmTitle: '¿Confirmar el ingreso?',
    confirmEntering: (count: number) =>
      count === 1 ? 'Ingresará 1 visitante.' : `Ingresarán ${count} visitantes.`,
    confirmNotArriving: (count: number) =>
      count === 1
        ? '1 visitante no llegó y no ingresará.'
        : `${count} visitantes no llegaron y no ingresarán.`,
    saveFailed: 'No se pudo guardar el ingreso. Inténtalo de nuevo.',
    confirmedTitle: 'Ingreso confirmado',
    confirmedMessage: 'Los visitantes registrados han sido procesados correctamente.',
    recordCompleted: 'Registro completado',
    pendingInspection: 'Pendiente de inspección',
    hseInfo: 'La inspección vehicular la realiza el equipo HSE.',
    pendingSync: 'Se enviará al servidor en cuanto haya conexión.',
    backHome: 'Volver al inicio',
    inspect: 'Realizar inspección',
    optional: '(opcional)',
    roles: { DRIVER: 'Conductor', HELPER: 'Ayudante' },
    documentTypes: {
      DUI: 'DUI',
      PASSPORT: 'Pasaporte',
      RESIDENT_CARD: 'Carné de residente',
      DRIVER_LICENSE: 'Licencia de conducir',
    },
    form: {
      title: 'Agregar visitante',
      subtitle: 'Completa los datos del visitante que no está en la lista del vehículo.',
      close: 'Cerrar',
      fullName: 'Nombre completo *',
      documentType: 'Tipo de documento *',
      documentTypePlaceholder: 'Selecciona un tipo',
      documentNumber: 'Número de documento *',
      role: 'Rol en el vehículo *',
      errors: {
        nameRequired: 'Ingresa el nombre completo',
        typeRequired: 'Selecciona el tipo de documento',
        numberRequired: 'Ingresa el número de documento',
        duiInvalid: 'El DUI tiene 8 dígitos, guion y 1 dígito (00000000-0)',
        documentInvalid: 'Usa de 4 a 20 letras o números',
        duplicate: 'Ese documento ya está en la lista del vehículo',
        offlineNoShift: 'No hay datos del turno para validar al visitante.',
      },
    },
    rejection: {
      title: 'Ingreso no permitido',
      scanAgain: 'Escanear otro',
      noShift: 'No hay datos del turno. Actualízalos desde Mi perfil.',
      notVehicleQr:
        'Este QR no es el del vehículo. Escanea el QR del vehículo para ver sus visitantes.',
      qr: {
        InvalidFormat: 'El código QR no tiene un formato válido.',
        InvalidSignature:
          'El QR no es auténtico: su firma no coincide. Solicita al transportista un QR válido.',
        Expired: 'El QR del vehículo venció. Solicita uno nuevo al transportista.',
        NotYetValid: 'El QR del vehículo todavía no está vigente.',
        OtherSite: 'El QR corresponde a otra sede.',
      },
      unit: {
        VoucherNotFound: (code: string) =>
          `El voucher ${code} no está entre las citas de hoy de esta sede. Actualiza los datos si se programó hace poco.`,
        VoucherInactive: (code: string) => `El voucher ${code} no está activo.`,
        PlateNotInVoucher: (plate: string, code: string) =>
          `La placa ${plate} no pertenece al voucher ${code}.`,
        AlreadyEntered: (plate: string, time: string) =>
          `La placa ${plate} ya registró su ingreso a las ${time}.`,
        OutsideEntryWindow: (code: string, from: string, to: string) =>
          `El voucher ${code} admite el ingreso entre las ${from} y las ${to}.`,
      },
    },
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
    message:
      'Tu usuario no tiene un rol de Seguridad ni de HSE asignado. Solicítalo a tu administrador.',
  },
  scanner: {
    torchOn: 'Encender linterna',
    torchOff: 'Apagar linterna',
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
