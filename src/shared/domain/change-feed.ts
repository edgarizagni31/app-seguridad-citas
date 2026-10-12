export type ChangeListener = () => void;

export interface ChangeFeed {
  subscribe(tables: readonly string[], listener: ChangeListener): () => void;
}
