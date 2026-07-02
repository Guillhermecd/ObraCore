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

export async function api<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false) {
    const token = authStorage.getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  return parseResponse<T>(response);
}
