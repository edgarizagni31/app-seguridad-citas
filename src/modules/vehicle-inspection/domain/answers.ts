// Foto guardada en el dispositivo; nunca en base64 dentro del estado
export type PhotoRef = {
  readonly id: string;
  readonly uri: string;
  readonly takenAt: string;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  readonly hash: string;
  // Ya está en el servidor (inspección retomada): se reenvía su URL, no la foto
  readonly remoteUrl?: string;
};

// answeredAt lo pone el agregado al guardar la respuesta
export type Answer = (
  | { readonly kind: 'plate'; readonly confirmed: true }
  | { readonly kind: 'yes_no'; readonly value: boolean }
  | { readonly kind: 'photo'; readonly photo: PhotoRef }
) & { readonly answeredAt?: string };

export type Answers = Readonly<Record<string, Answer>>;
