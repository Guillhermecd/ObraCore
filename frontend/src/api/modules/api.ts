import type { User } from "./types";

type ApiOptions = RequestInit & {
  auth?: boolean;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "http://localhost:1337/api" : "/api");

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
    localStorage.clear();
  },
};

export const activeGroupStorage = {
  getGroupId() {
    return localStorage.getItem("activeGroupId");
  },
  setGroupId(groupId: string) {
    localStorage.setItem("activeGroupId", groupId);
  },
  clear() {
    localStorage.removeItem("activeGroupId");
  },
};

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const message = payload?.message || "Não foi possível concluir a operação.";
    throw new Error(message);
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
  const headers = buildAuthHeaders(options.headers, options.auth !== false);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  return parseResponse<T>(response);
}

/**
 * Baixa um arquivo binário do backend (ex.: exportações) e dispara o
 * download no navegador, reaproveitando o padrão de blob + <a download>
 * já usado em ImportExpensesModal.tsx (downloadTemplate).
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
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
