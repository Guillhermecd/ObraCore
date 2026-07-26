import { RiseOutlined } from "@ant-design/icons";
import type { DashboardResultadoProjetado } from "../../api/modules/types";
import { ResultadoDetailBlock } from "./ResultadoDetailBlock";

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
  return (
    <ResultadoDetailBlock
      icon={<RiseOutlined />}
      title="Lucro projetado"
      sublabel="Obras em andamento"
      loading={loading}
      resumo={resultadoProjetado}
      pick={(r) => ({
        count: r.obrasEmAndamento,
        primary: r.valorEsperadoTotal,
        secondary: r.custoProjetadoTotal,
        lucro: r.lucroProjetadoTotal,
        margemPct: r.margemPct,
      })}
      emptyMessage="Nenhuma obra em andamento com contrato ou venda esperada informados."
      countLabel="Obras"
      countNounSingular="obra"
      countNounPlural="obras"
      countHint="Obras em andamento, de cliente e próprias — exclui obras ainda planejadas e obras já concluídas."
      primaryLabel="Valor esperado"
      primaryHint="Soma do valor do contrato (obra de cliente) ou da venda esperada (obra própria) das obras em andamento."
      secondaryLabel="Custo projetado"
      secondaryHint="Custo já realizado somado ao custo que ainda falta para concluir as obras em andamento."
      lucroHint="Valor esperado menos custo projetado das obras em andamento."
    />
  );
}
