export type LocalNotification = {
  readonly title: string;
  readonly body: string;
  // Pantalla a abrir al tocarla
  readonly target: 'attention';
};

export interface NotificationsService {
  // Pide permiso y prepara el canal; se llama con el turno ya iniciado
  prepare(): Promise<void>;
  notify(notification: LocalNotification): Promise<void>;
  onOpen(listener: (target: LocalNotification['target']) => void): () => void;
}
