import { theme } from "antd";
import type { ReactNode } from "react";
import { DetailCard } from "../../components/DetailCard";
import { plural } from "../../utils/format";
import { usePrivacyFormat } from "../../privacyContext";
import { saldoColor } from "../../utils/thresholds";

/**
 * Os três blocos de resultado do Consolidado (`ResultBlock`,
 * `ResultadoProjetadoBlock`, `ResultadoRealizadoBlock`) têm o mesmo formato —
 * uma contagem, dois valores em moeda e um "Lucro" colorido com margem —
 * cada um só trocando de onde tira os números e os textos. Este componente
 * genérico concentra a formatação/cor/defaulting comuns; cada bloco
 * específico só descreve o mapeamento via `pick`.
 */
export type ResumoDetalhe = {
  count: number;
  primary: number;
  secondary: number;
  lucro: number;
  margemPct: number | null;
};

type ResultadoDetailBlockProps<T> = {
  icon: ReactNode;
  title: string;
  sublabel: string;
  loading: boolean;
  resumo: T | null;
  pick: (resumo: T) => ResumoDetalhe;
  emptyMessage: string;
  footnote?: ReactNode;

  countLabel: string;
  countNounSingular: string;
  countNounPlural: string;
  countHint: string;
  primaryLabel: string;
  primaryHint: string;
  secondaryLabel: string;
  secondaryHint: string;
  lucroHint: string;
};

export function ResultadoDetailBlock<T>({
  icon,
  title,
  sublabel,
  loading,
  resumo,
  pick,
  emptyMessage,
  footnote,
  countLabel,
  countNounSingular,
  countNounPlural,
  countHint,
  primaryLabel,
  primaryHint,
  secondaryLabel,
  secondaryHint,
  lucroHint,
}: ResultadoDetailBlockProps<T>) {
  const { token } = theme.useToken();
  const { formatCurrency, formatPercent } = usePrivacyFormat();

  const data: ResumoDetalhe = resumo
    ? pick(resumo)
    : { count: 0, primary: 0, secondary: 0, lucro: 0, margemPct: null };

  return (
    <DetailCard
      icon={icon}
      title={title}
      sublabel={sublabel}
      loading={loading}
      emptyMessage={!loading && data.count === 0 ? emptyMessage : undefined}
      footnote={footnote}
      stats={[
        {
          label: countLabel,
          value: plural(data.count, countNounSingular, countNounPlural),
          hint: countHint,
        },
        {
          label: primaryLabel,
          value: formatCurrency(data.primary),
          hint: primaryHint,
        },
        {
          label: secondaryLabel,
          value: formatCurrency(data.secondary),
          hint: secondaryHint,
        },
        {
          label: "Lucro",
          value: formatCurrency(data.lucro),
          color: saldoColor(data.lucro, token),
          detail: data.margemPct === null ? null : `margem ${formatPercent(data.margemPct)}`,
          hint: lucroHint,
        },
      ]}
    />
  );
}
