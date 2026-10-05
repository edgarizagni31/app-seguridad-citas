import { createContext, use, type ReactNode } from 'react';

import type { Dependencies } from './dependencies';

const DependenciesContext = createContext<Dependencies | null>(null);

type DependenciesProviderProps = {
  value: Dependencies;
  children: ReactNode;
};

export function DependenciesProvider({ value, children }: DependenciesProviderProps) {
  return <DependenciesContext value={value}>{children}</DependenciesContext>;
}

export function useDependencies(): Dependencies {
  const dependencies = use(DependenciesContext);
  if (!dependencies) throw new Error('useDependencies requiere DependenciesProvider');
  return dependencies;
}
