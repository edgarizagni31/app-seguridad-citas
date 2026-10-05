export function assertNever(value: never): never {
  throw new Error(`Caso no contemplado: ${JSON.stringify(value)}`);
}
