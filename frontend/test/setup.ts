/**
 * Stub mínimo de Web Storage para rodar os testes de sessão em ambiente
 * `node` (sem jsdom — esta leva de testes cobre só lógica pura, não
 * componentes). `atob`/`btoa` já existem nativamente no Node, só
 * `localStorage`/`sessionStorage` precisam de polyfill aqui.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();
