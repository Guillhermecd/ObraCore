/**
 * Mensagem de erro amigável a partir de um `catch` tipado como `unknown`.
 * Usa `error.message` quando é um `Error` de verdade (inclui `ApiError`, que
 * estende `Error` — ver `api/modules/api.ts`); senão cai no `fallback`.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
