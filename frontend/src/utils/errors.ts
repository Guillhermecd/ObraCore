/**
 * Extrai uma mensagem de erro amigável, usada em todo `catch` de chamada à
 * API: se `error` for um `Error` de verdade (ex.: lançado por `api()` com a
 * mensagem vinda do backend), usa `error.message`; caso contrário cai no
 * texto padrão informado.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
