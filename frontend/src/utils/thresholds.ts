import type { GlobalToken } from "antd";

/**
 * Cor de uma barra de consumo/cobertura por faixa de valor. Antes toda barra
 * tinha a mesma cor independentemente do número, então uma obra a 30% e outra
 * a 130% do orçamento pareciam iguais.
 *
 * Neutra até 80%, âmbar entre 80 e 100, vermelha acima de 100.
 */
export function consumoColor(pct: number | null, token: GlobalToken): string {
  if (pct === null) {
    return token.colorTextSecondary;
  }
  if (pct > 100) {
    return token.colorError;
  }
  if (pct >= 80) {
    return token.colorWarning;
  }
  // Cinza, e não a cor primária da marca: em marca de primária laranja a
  // faixa "tudo certo" ficava idêntica ao âmbar de atenção, e o
  // escalonamento de cor não comunicava nada.
  return token.colorTextSecondary;
}

/**
 * Cobertura de caixa anda no sentido inverso do consumo: aqui percentual ALTO
 * é bom (o caixa cobre o que resta do orçamento) e baixo é o problema.
 */
export function coberturaColor(pct: number | null, token: GlobalToken): string {
  if (pct === null) {
    return token.colorTextSecondary;
  }
  if (pct < 80) {
    return token.colorError;
  }
  if (pct < 100) {
    return token.colorWarning;
  }
  // Cobertura completa é situação favorável — uma das poucas em que o verde
  // é permitido.
  return token.colorSuccess;
}

/**
 * Verde é reservado para saldo positivo e variação favorável; valor neutro
 * fica na cor de texto padrão, não em verde. Sem isso qualquer número vira
 * "boa notícia" na tela.
 */
export function saldoColor(value: number, token: GlobalToken): string {
  if (value < 0) {
    return token.colorError;
  }
  return value > 0 ? token.colorSuccess : token.colorText;
}
