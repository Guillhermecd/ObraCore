import { describe, expect, it } from "vitest";
import {
  SITUACAO_OBRA_COLOR,
  SITUACAO_OBRA_LABEL,
  TIPO_OBRA_LABEL,
  entradaLabel,
  entradaPendenteLabel,
  valorEsperadoLabel,
} from "./obra";

describe("entradaLabel", () => {
  it("obra de CLIENTE: dinheiro que entra é recebimento", () => {
    expect(entradaLabel("CLIENTE")).toBe("Recebido");
  });

  it("obra PROPRIA: dinheiro que entra é aporte do dono", () => {
    expect(entradaLabel("PROPRIA")).toBe("Aportado");
  });
});

describe("entradaPendenteLabel", () => {
  it("obra de CLIENTE: pendência é 'A receber'", () => {
    expect(entradaPendenteLabel("CLIENTE")).toBe("A receber");
  });

  it("obra PROPRIA: pendência é 'Aporte a fazer'", () => {
    expect(entradaPendenteLabel("PROPRIA")).toBe("Aporte a fazer");
  });
});

describe("valorEsperadoLabel", () => {
  it("obra de CLIENTE: valor do contrato", () => {
    expect(valorEsperadoLabel("CLIENTE")).toBe("Valor do contrato");
  });

  it("obra PROPRIA: valor de venda esperado", () => {
    expect(valorEsperadoLabel("PROPRIA")).toBe("Valor de venda esperado");
  });
});

describe("mapas de rótulo/cor", () => {
  it("TIPO_OBRA_LABEL cobre os dois tipos", () => {
    expect(TIPO_OBRA_LABEL).toEqual({
      PROPRIA: "Obra própria",
      CLIENTE: "Obra de cliente",
    });
  });

  it("SITUACAO_OBRA_LABEL cobre as três situações", () => {
    expect(SITUACAO_OBRA_LABEL).toEqual({
      PLANEJADO: "Planejado",
      EM_ANDAMENTO: "Em andamento",
      CONCLUIDO: "Concluída",
    });
  });

  it("CONCLUIDO é 'success' (desfecho esperado, não alerta)", () => {
    expect(SITUACAO_OBRA_COLOR.CONCLUIDO).toBe("success");
    expect(SITUACAO_OBRA_COLOR.EM_ANDAMENTO).toBe("processing");
    expect(SITUACAO_OBRA_COLOR.PLANEJADO).toBe("default");
  });
});
