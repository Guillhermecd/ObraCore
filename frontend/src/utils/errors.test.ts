import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
  it("usa a mensagem do Error quando é um Error de verdade", () => {
    expect(getErrorMessage(new Error("Falhou"), "fallback")).toBe("Falhou");
  });

  it("cai no fallback para valores que não são Error", () => {
    expect(getErrorMessage("string qualquer", "fallback")).toBe("fallback");
    expect(getErrorMessage(null, "fallback")).toBe("fallback");
    expect(getErrorMessage(undefined, "fallback")).toBe("fallback");
    expect(getErrorMessage({ message: "não é Error" }, "fallback")).toBe("fallback");
  });
});
