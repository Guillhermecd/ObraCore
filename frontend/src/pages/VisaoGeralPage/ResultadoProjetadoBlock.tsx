import { RiseOutlined } from "@ant-design/icons";
import { theme } from "antd";
import { DetailCard } from "../../components/DetailCard";
import type { DashboardResultadoProjetado } from "../../api/modules/types";
import { plural } from "../../utils/format";
import { usePrivacyFormat } from "../../privacyContext";
import { saldoColor } from "../../utils/thresholds";

type ResultadoProjetadoBlockProps = {
  resultadoProjetado: DashboardResultadoProjetado | null;
  loading: boolean;
};

/**
 * Lucro PROJETADO — obras EM_ANDAMENTO (exclui PLANEJADO, que ainda nem
 * começou, e CONCLUIDO, que já tem seu próprio bloco de realizado), dos
 * DOIS tipos. Responde "se tudo sair como planejado, quanto sobra",
 * considerando custo já realizado E já previsto. Snapshot — não responde ao
 * seletor de período do Consolidado.
 */
export function ResultadoProjetadoBlock({
  resultadoProjetado,
  loading,
}: ResultadoProjetadoBlockProps) {
  const { token } = theme.useToken();
  const { formatCurrency, formatPercent } = usePrivacyFormat();

  const obrasEmAndamento = resultadoProjetado?.obrasEmAndamento ?? 0;
  const valorEsperadoTotal = resultadoProjetado?.valorEsperadoTotal ?? 0;
  const custoProjetadoTotal = resultadoProjetado?.custoProjetadoTotal ?? 0;
  const lucroProjetadoTotal = resultadoProjetado?.lucroProjetadoTotal ?? 0;
  const margemPct = resultadoProjetado?.margemPct ?? null;

  return (
    <DetailCard
      icon={<RiseOutlined />}
      title="Lucro projetado"
      sublabel="Obras em andamento"
      loading={loading}
      emptyMessage={
        !loading && obrasEmAndamento === 0
          ? "Nenhuma obra em andamento com contrato ou venda esperada informados."
          : undefined
      }
      stats={[
        {
          label: "Obras",
          value: plural(obrasEmAndamento, "obra", "obras"),
          hint: "Obras em andamento, de cliente e próprias — exclui obras ainda planejadas e obras já concluídas.",
        },
        {
          label: "Valor esperado",
          value: formatCurrency(valorEsperadoTotal),
          hint: "Soma do valor do contrato (obra de cliente) ou da venda esperada (obra própria) das obras em andamento.",
        },
        {
          label: "Custo projetado",
          value: formatCurrency(custoProjetadoTotal),
          hint: "Custo já realizado somado ao custo que ainda falta para concluir as obras em andamento.",
        },
        {
          label: "Lucro",
          value: formatCurrency(lucroProjetadoTotal),
          color: saldoColor(lucroProjetadoTotal, token),
          detail: margemPct === null ? null : `margem ${formatPercent(margemPct)}`,
          hint: "Valor esperado menos custo projetado das obras em andamento.",
        },
      ]}
    />
  );
}
