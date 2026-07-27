import type { GlobalToken } from "antd";
import { describe, expect, it } from "vitest";
import { coberturaColor, consumoColor, saldoColor } from "./thresholds";

// Só os 5 campos de cor usados pelas funções sob teste — o resto do
// GlobalToken real não importa aqui.
const token = {
  colorError: "error",
  colorWarning: "warning",
  colorSuccess: "success",
  colorText: "text",
  colorTextSecondary: "text-secondary",
} as unknown as GlobalToken;

describe("consumoColor", () => {
  it("null é neutro (sem orçamento definido)", () => {
    expect(consumoColor(null, token)).toBe(token.colorTextSecondary);
  });

  it("abaixo de 80% é neutro", () => {
    expect(consumoColor(0, token)).toBe(token.colorTextSecondary);
    expect(consumoColor(79.9, token)).toBe(token.colorTextSecondary);
  });

  it("entre 80% e 100% (inclusive) é warning", () => {
    expect(consumoColor(80, token)).toBe(token.colorWarning);
    expect(consumoColor(100, token)).toBe(token.colorWarning);
  });

  it("acima de 100% é error", () => {
    expect(consumoColor(100.01, token)).toBe(token.colorError);
    expect(consumoColor(150, token)).toBe(token.colorError);
  });
});

describe("coberturaColor", () => {
  it("null é neutro", () => {
    expect(coberturaColor(null, token)).toBe(token.colorTextSecondary);
  });

  it("abaixo de 80% é error — caixa não cobre nem 80% do que resta", () => {
    expect(coberturaColor(0, token)).toBe(token.colorError);
    expect(coberturaColor(79.9, token)).toBe(token.colorError);
  });

  it("entre 80% (inclusive) e 100% (exclusive) é warning", () => {
    expect(coberturaColor(80, token)).toBe(token.colorWarning);
    expect(coberturaColor(99.9, token)).toBe(token.colorWarning);
  });

  it("100% ou mais é success — cobertura completa", () => {
    expect(coberturaColor(100, token)).toBe(token.colorSuccess);
    expect(coberturaColor(150, token)).toBe(token.colorSuccess);
  });
});

describe("saldoColor", () => {
  it("negativo é error", () => {
    expect(saldoColor(-0.01, token)).toBe(token.colorError);
  });

  it("zero é neutro (cor de texto padrão, não verde)", () => {
    expect(saldoColor(0, token)).toBe(token.colorText);
  });

  it("positivo é success", () => {
    expect(saldoColor(0.01, token)).toBe(token.colorSuccess);
  });
});
