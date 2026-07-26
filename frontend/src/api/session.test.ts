import { beforeEach, describe, expect, it } from "vitest";
import { ApiError, authStorage } from "./modules/api";
import type { User } from "./modules/types";

/** Monta um JWT `header.payload.sig` válido o bastante para `decodeJwtPayload`. */
function fakeJwt(payload: Record<string, unknown>): string {
  const base64url = (value: string) =>
    btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
}

const fakeUser = { id: "u1", email: "user@example.com" } as unknown as User;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("authStorage.getTokenExpirationAt", () => {
  it("decodifica exp de um token válido em milissegundos", () => {
    const token = fakeJwt({ exp: 1_800_000_000 });
    expect(authStorage.getTokenExpirationAt(token)).toBe(1_800_000_000 * 1000);
  });

  it("sem token informado nem armazenado, devolve null", () => {
    expect(authStorage.getTokenExpirationAt(null)).toBeNull();
    expect(authStorage.getTokenExpirationAt(undefined)).toBeNull();
  });

  it("token sem exp no payload devolve null", () => {
    const token = fakeJwt({ sub: "u1" });
    expect(authStorage.getTokenExpirationAt(token)).toBeNull();
  });

  it("token malformado (poucos segmentos) devolve null, sem lançar", () => {
    expect(authStorage.getTokenExpirationAt("naotoken")).toBeNull();
  });

  it("payload que não é JSON válido devolve null, sem lançar", () => {
    const token = `${btoa("header")}.${btoa("}nao-e-json{")}.sig`;
    expect(authStorage.getTokenExpirationAt(token)).toBeNull();
  });

  it("sem argumento, cai para o token salvo em localStorage", () => {
    const token = fakeJwt({ exp: 42 });
    authStorage.setSession(token, fakeUser);
    expect(authStorage.getTokenExpirationAt()).toBe(42 * 1000);
  });
});

describe("authStorage: sessão", () => {
  it("setSession/getToken/getUser fazem round-trip", () => {
    const token = fakeJwt({ exp: 1 });
    authStorage.setSession(token, fakeUser);
    expect(authStorage.getToken()).toBe(token);
    expect(authStorage.getUser()).toEqual(fakeUser);
  });

  it("getUser sem sessão salva devolve null", () => {
    expect(authStorage.getUser()).toBeNull();
  });

  // Regressão documentada em api.ts: `localStorage.clear()` levava junto
  // preferências (tema, modo privacidade, obra ativa) que não têm nada a ver
  // com "quem está logado" — clear() tem que ser cirúrgico.
  it("clear() remove só authToken/authUser, preserva preferências", () => {
    authStorage.setSession(fakeJwt({ exp: 1 }), fakeUser);
    localStorage.setItem("theme-mode", "dark");
    localStorage.setItem("values-hidden", "true");
    localStorage.setItem("activeGroupId", "grupo-1");

    authStorage.clear();

    expect(authStorage.getToken()).toBeNull();
    expect(authStorage.getUser()).toBeNull();
    expect(localStorage.getItem("theme-mode")).toBe("dark");
    expect(localStorage.getItem("values-hidden")).toBe("true");
    expect(localStorage.getItem("activeGroupId")).toBe("grupo-1");
  });
});

describe("authStorage: aviso de sessão expirada", () => {
  it("consumeExpiredSessionNotice lê e apaga o aviso", () => {
    authStorage.setExpiredSessionNotice("Sua sessão expirou. Faça login novamente.");
    expect(authStorage.consumeExpiredSessionNotice()).toBe(
      "Sua sessão expirou. Faça login novamente.",
    );
    // Segunda leitura: já foi consumido.
    expect(authStorage.consumeExpiredSessionNotice()).toBeNull();
  });

  it("setExpiredSessionNotice sem mensagem usa o texto padrão", () => {
    authStorage.setExpiredSessionNotice();
    expect(authStorage.consumeExpiredSessionNotice()).toBe(
      "Sua sessão expirou. Faça login novamente.",
    );
  });

  it("sem aviso registrado, devolve null", () => {
    expect(authStorage.consumeExpiredSessionNotice()).toBeNull();
  });
});

describe("ApiError", () => {
  it("guarda status e requestId, além da mensagem", () => {
    const error = new ApiError("Erro interno", 500, "req-123");
    expect(error.message).toBe("Erro interno");
    expect(error.status).toBe(500);
    expect(error.requestId).toBe("req-123");
    expect(error.name).toBe("ApiError");
  });

  it("requestId é opcional", () => {
    const error = new ApiError("Sem permissão", 403);
    expect(error.requestId).toBeUndefined();
  });
});
