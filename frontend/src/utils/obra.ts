import type { SituacaoObra, TipoObra } from "../api/modules/types";

/**
 * Rótulo da entrada de dinheiro, que varia com o tipo de obra: em obra de
 * cliente o dinheiro que entra é recebimento do contrato; em obra própria é
 * aporte de capital do dono. Nunca usar rótulo fixo — chamar este helper em
 * todo ponto que exibe entrada.
 */
export function entradaLabel(tipoObra: TipoObra): string {
  return tipoObra === "CLIENTE" ? "Recebido" : "Aportado";
}

/**
 * Verbo correspondente, para textos onde "Recebido"/"Aportado" não encaixa
 * (ex.: "Aporte a fazer" vs. "A receber").
 */
export function entradaPendenteLabel(tipoObra: TipoObra): string {
  return tipoObra === "CLIENTE" ? "A receber" : "Aporte a fazer";
}

export const TIPO_OBRA_LABEL: Record<TipoObra, string> = {
  PROPRIA: "Obra própria",
  CLIENTE: "Obra de cliente",
};

/**
 * Rótulo do valor esperado da obra: contrato de cliente ou venda esperada de
 * obra própria. Os dois alimentam `lucroPrevisto`/`lucroProjetado`, mas só o
 * contrato de cliente gera receita reconhecida formal.
 */
export function valorEsperadoLabel(tipoObra: TipoObra): string {
  return tipoObra === "CLIENTE" ? "Valor do contrato" : "Valor de venda esperado";
}

export const SITUACAO_OBRA_LABEL: Record<SituacaoObra, string> = {
  PLANEJADO: "Planejado",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluída",
};

/**
 * Cor de tag (Ant Design) por situação. CONCLUIDO em verde: não é alerta,
 * é o desfecho esperado da obra.
 */
export const SITUACAO_OBRA_COLOR: Record<SituacaoObra, string> = {
  PLANEJADO: "default",
  EM_ANDAMENTO: "processing",
  CONCLUIDO: "success",
};
