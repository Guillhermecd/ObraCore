const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

const compactCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCompactCurrency(value: number): string {
  return compactCurrencyFormatter.format(value);
}

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

export function formatPercent(value: number): string {
  return `${percentFormatter.format(Math.round(value))}%`;
}

/**
 * Contador com plural resolvido — substitui os "pendência(s)" e "fatura(s)"
 * espalhados pela tela.
 */
export function plural(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** `YYYY-MM` -> "nov/2026", para os meses projetados do bloco de ritmo. */
export function formatMonth(value: string): string {
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(
    date,
  );
  return `${label.replace(".", "")}/${year}`;
}

/** `YYYY-MM-DD` -> "12/11/2026", sem arrastar dayjs para componentes simples. */
export function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Fôlego de caixa em texto: "4,0 meses". Meses fracionários importam quando o
 * número é pequeno — "0 meses" e "0,4 meses" dizem coisas diferentes.
 */
export function formatMeses(value: number): string {
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  return `${formatted} ${value === 1 ? "mês" : "meses"}`;
}
