import type { User } from "./types";

type ApiOptions = RequestInit & {
  auth?: boolean;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "http://localhost:1337/api" : "/api");

const EXPIRED_SESSION_NOTICE_KEY = "authSessionExpiredNotice";
const DEFAULT_EXPIRED_SESSION_MESSAGE = "Sua sessão expirou. Faça login novamente.";

function decodeJwtPayload(token: string): { exp?: number } | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

export const authStorage = {
  getToken() {
    return localStorage.getItem("authToken");
  },
  setSession(token: string, user: User) {
    localStorage.setItem("authToken", token);
    localStorage.setItem("authUser", JSON.stringify(user));
  },
  getUser(): User | null {
    const value = localStorage.getItem("authUser");
    return value ? (JSON.parse(value) as User) : null;
  },
  clear() {
    // Só as chaves da sessão. `localStorage.clear()` levava junto `theme-mode`,
    // `values-hidden` e `activeGroupId` — preferências que não têm nada a ver
    // com quem está logado, e que agora seriam perdidas a cada token expirado.
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
  },
  setExpiredSessionNotice(message: string = DEFAULT_EXPIRED_SESSION_MESSAGE) {
    sessionStorage.setItem(EXPIRED_SESSION_NOTICE_KEY, message);
  },
  consumeExpiredSessionNotice() {
    const notice = sessionStorage.getItem(EXPIRED_SESSION_NOTICE_KEY);
    if (notice) {
      sessionStorage.removeItem(EXPIRED_SESSION_NOTICE_KEY);
    }
    return notice;
  },
  getTokenExpirationAt(token?: string | null) {
    const currentToken = token ?? authStorage.getToken();

    if (!currentToken) {
      return null;
    }

    const payload = decodeJwtPayload(currentToken);
    if (!payload || typeof payload.exp !== "number") {
      return null;
    }

    return payload.exp * 1000;
  },
};

export const activeGroupStorage = {
  getGroupId() {
    return localStorage.getItem("activeGroupId");
  },
  setGroupId(groupId: string) {
    localStorage.setItem("activeGroupId", groupId);
  },
};

/**
 * Erro de API que preserva o status HTTP. O `Error` puro que existia antes
 * jogava o status fora, então nenhuma tela conseguia distinguir um 403 (sem
 * permissão) de um 500 (servidor quebrado) — só sobrava a string.
 *
 * `requestId` só vem em 500 (ver `api/responses/serverError.js` no backend) e é
 * o que liga o que o usuário viu ao stack no log.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly requestId?: string;

  constructor(message: string, status: number, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
  }
}

/** Sessão morta: limpa o storage, avisa o usuário e manda para o login. */
export function expireSession() {
  // Guarda para não disparar N redirects quando várias requisições da mesma
  // tela voltam 401 juntas.
  if (window.location.pathname === "/login") {
    return;
  }

  authStorage.setExpiredSessionNotice();
  authStorage.clear();
  window.location.replace("/login");
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const message = payload?.message || "Não foi possível concluir a operação.";
    throw new ApiError(
      payload?.requestId ? `${message} (código ${payload.requestId})` : message,
      response.status,
      payload?.requestId,
    );
  }

  return payload as T;
}

function buildAuthHeaders(existing?: HeadersInit, auth: boolean = true): Headers {
  const headers = new Headers(existing);

  if (auth) {
    const token = authStorage.getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const groupId = activeGroupStorage.getGroupId();
    if (groupId) {
      headers.set("X-Group-Id", groupId);
    }
  }

  return headers;
}

export async function api<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const authenticated = options.auth !== false;
  const headers = buildAuthHeaders(options.headers, authenticated);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // 401 numa rota autenticada = token expirado ou inválido. Antes disso, cada
  // tela mostrava "Token inválido ou expirado." num toast e o usuário ficava
  // preso numa página vazia: o guard do PrivateLayout só checa se o token
  // existe, não se ele vale. Só vale para chamadas autenticadas — em `/login`
  // um 401 é senha errada, e ali a mensagem tem que aparecer no formulário.
  if (response.status === 401 && authenticated) {
    expireSession();
  }

  return parseResponse<T>(response);
}

/**
 * Dispara o download de um blob no navegador via <a download> temporário.
 * Fonte única do padrão blob → object URL → clique → revoke, antes
 * duplicado entre esta função e ImportExpensesModal.tsx (downloadTemplate).
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Baixa um arquivo binário do backend (ex.: exportações) e dispara o
 * download no navegador.
 */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const headers = buildAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, { headers });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : null;
    throw new Error(payload?.message || "Não foi possível concluir o download.");
  }

  const blob = await response.blob();
  triggerBlobDownload(blob, filename);
}
