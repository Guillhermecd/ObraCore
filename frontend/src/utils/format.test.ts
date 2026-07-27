import { describe, expect, it } from "vitest";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatMeses,
  formatMonth,
  formatPercent,
  plural,
} from "./format";

// `Intl.NumberFormat("pt-BR", { style: "currency" })` intercala o valor com um
// espaco nao-quebravel (code point 160) em vez do espaco comum ASCII —
// normalizamos antes de comparar para nao depender do caractere exato da ICU
// instalada.
const NBSP = String.fromCharCode(160);

function normalizeSpaces(value: string): string {
  return value.split(NBSP).join(" ");
}

describe("formatCurrency", () => {
  it("formata em real brasileiro com 2 casas decimais", () => {
    expect(normalizeSpaces(formatCurrency(1234.5))).toBe("R$ 1.234,50");
  });

  it("formata zero e negativo", () => {
    expect(normalizeSpaces(formatCurrency(0))).toBe("R$ 0,00");
    expect(normalizeSpaces(formatCurrency(-50))).toBe("-R$ 50,00");
  });
});

describe("formatCompactCurrency", () => {
  it("usa notação compacta para milhar/milhão", () => {
    expect(normalizeSpaces(formatCompactCurrency(1500))).toBe("R$ 1,5 mil");
    expect(normalizeSpaces(formatCompactCurrency(2_000_000))).toBe("R$ 2 mi");
  });
});

describe("formatPercent", () => {
  it("arredonda para inteiro e adiciona o símbolo", () => {
    expect(formatPercent(79.6)).toBe("80%");
    expect(formatPercent(79.4)).toBe("79%");
    expect(formatPercent(0)).toBe("0%");
  });
});

describe("plural", () => {
  it("usa singular quando count é 1", () => {
    expect(plural(1, "pendência", "pendências")).toBe("1 pendência");
  });

  it("usa plural para 0 e para mais de 1", () => {
    expect(plural(0, "pendência", "pendências")).toBe("0 pendências");
    expect(plural(2, "pendência", "pendências")).toBe("2 pendências");
  });
});

describe("formatMonth", () => {
  it("converte YYYY-MM em mês abreviado sem ponto + ano", () => {
    expect(formatMonth("2026-11")).toBe("nov/2026");
    expect(formatMonth("2026-01")).toBe("jan/2026");
  });
});

describe("formatDate", () => {
  it("converte YYYY-MM-DD em dd/mm/aaaa", () => {
    expect(formatDate("2026-11-12")).toBe("12/11/2026");
  });

  it("aceita ISO datetime completo, ignorando horário/fuso", () => {
    expect(formatDate("2026-11-12T03:00:00.000Z")).toBe("12/11/2026");
  });
});

describe("formatMeses", () => {
  it("usa singular só quando o valor é exatamente 1", () => {
    expect(formatMeses(1)).toBe("1,0 mês");
  });

  it("usa plural para outros valores, com 1 casa decimal", () => {
    expect(formatMeses(0)).toBe("0,0 meses");
    expect(formatMeses(0.4)).toBe("0,4 meses");
    expect(formatMeses(4)).toBe("4,0 meses");
  });
});
