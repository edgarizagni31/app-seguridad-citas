export interface Connectivity {
  isOnline(): Promise<boolean>;
  subscribe(listener: (online: boolean) => void): () => void;
}
