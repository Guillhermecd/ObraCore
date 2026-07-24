import { QuestionCircleOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Empty,
  Grid,
  Progress,
  Skeleton,
  Tag,
  Tooltip,
  theme,
} from "antd";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { SectionBlock } from "../../components/SectionBlock";
import type {
  ProjectPerformance,
  ProjectPerformanceStatus,
} from "../../api/modules/types";
import { plural } from "../../utils/format";
import { usePrivacyFormat } from "../../privacyContext";
import { permissionsFor } from "../../utils/roles";
import {
  SITUACAO_OBRA_COLOR,
  SITUACAO_OBRA_LABEL,
  entradaLabel,
} from "../../utils/obra";
import { consumoColor, saldoColor } from "../../utils/thresholds";

type ProjectPerformanceCardsProps = {
  projects: ProjectPerformance[];
  loading: boolean;
  onOpenProject: (groupId: string) => void;
};

const STATUS_LABEL: Record<ProjectPerformanceStatus, string> = {
  no_prazo: "No prazo",
  risco: "Risco",
  sem_orcamento: "Sem orçamento",
  sem_movimento: "Sem movimentação",
};

// Obra sem movimentação recebe distintivo neutro, nunca verde: nada aconteceu
// ainda para dizer que está tudo bem.
const STATUS_TAG_COLOR: Record<ProjectPerformanceStatus, string> = {
  no_prazo: "success",
  risco: "error",
  sem_orcamento: "default",
  sem_movimento: "default",
};

const fieldRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 13,
  padding: "3px 0",
};

const blockLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  marginBottom: 6,
};

function Field({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: ReactNode;
  color?: string;
  hint?: string;
}) {
  const { token } = theme.useToken();
  return (
    <div style={fieldRowStyle}>
      <span
        style={{
          color: token.colorTextSecondary,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {label}
        {hint && (
          <Tooltip title={hint}>
            <QuestionCircleOutlined style={{ cursor: "help", fontSize: 11 }} />
          </Tooltip>
        )}
      </span>
      <span style={{ fontWeight: 600, color: color ?? token.colorText }}>
        {value}
      </span>
    </div>
  );
}

/**
 * Base comum: os MESMOS campos, na MESMA ordem, em toda obra — de cliente ou
 * própria. Obra de cliente ganha um bloco adicional ao lado, nunca uma
 * reorganização desta base.
 */
function BaseBlock({ project }: { project: ProjectPerformance }) {
  const { token } = theme.useToken();
  const { formatCurrency } = usePrivacyFormat();

  // Obra sem nenhum lançamento ainda: "Faltam R$X" passaria a sensação de
  // dívida numa obra que acabou de ser criada — o caixa não deve nada porque
  // nada aconteceu ainda, não porque está coberto.
  const semMovimento = project.status === "sem_movimento";

  const situacao = semMovimento
    ? "Sem movimentação ainda"
    : project.coberturaPct === null
      ? "Sem orçamento a executar"
      : project.aporteAFazer > 0
        ? `Faltam ${formatCurrency(project.aporteAFazer)}`
        : "Coberto";

  const situacaoColor = semMovimento
    ? token.colorTextSecondary
    : project.coberturaPct === null
      ? token.colorTextSecondary
      : project.aporteAFazer > 0
        ? token.colorWarning
        : token.colorSuccess;

  return (
    <div>
      <div style={{ ...blockLabelStyle, color: token.colorTextSecondary }}>
        Obra
      </div>
      <Field
        label="Custo orçado"
        value={
          project.gastoPlanejado === null
            ? "—"
            : formatCurrency(project.gastoPlanejado)
        }
        hint="Gasto planejado (orçamento) cadastrado para esta obra."
      />
      <Field
        label="Custo gasto"
        value={formatCurrency(project.custoReal)}
        hint="Soma das saídas já realizadas nesta obra."
      />
      <Field
        label="Caixa da obra"
        value={formatCurrency(project.saldoAtual)}
        color={saldoColor(project.saldoAtual, token)}
        hint="Entradas realizadas menos saídas realizadas nesta obra."
      />
      <Field
        label="Situação de caixa"
        value={situacao}
        color={situacaoColor}
        hint="Coberto quando o caixa da obra já cobre o orçamento restante; caso contrário, mostra quanto falta entrar."
      />
    </div>
  );
}

/** Só obra de cliente. Sem contrato informado, vira chamado à ação. */
function ContratoBlock({
  project,
  onOpenProject,
}: {
  project: ProjectPerformance;
  onOpenProject: (groupId: string) => void;
}) {
  const { token } = theme.useToken();
  const { formatCurrency, formatPercent } = usePrivacyFormat();

  // Para o fiscal o contrato vem sempre null, mas por falta de permissão e não
  // por falta de cadastro — dizer "ainda não informado" aqui seria mentira, e
  // o convite para informá-lo levaria a um 403.
  if (!permissionsFor(project.myRole).canViewFinanceiro) {
    return (
      <div>
        <div style={{ ...blockLabelStyle, color: token.colorTextSecondary }}>
          Contrato
        </div>
        <div style={{ fontSize: 13, color: token.colorTextSecondary }}>
          Contrato, receita e lucro são visíveis apenas para o dono e os
          administradores desta obra.
        </div>
      </div>
    );
  }

  if (project.valorContrato === null) {
    return (
      <div>
        <div style={{ ...blockLabelStyle, color: token.colorTextSecondary }}>
          Contrato
        </div>
        <div
          style={{
            fontSize: 13,
            color: token.colorTextSecondary,
            marginBottom: 8,
          }}
        >
          Contrato ainda não informado. Sem ele não há receita nem lucro a
          reconhecer nesta obra.
        </div>
        <Button
          size="small"
          onClick={(event: MouseEvent<HTMLElement>) => {
            event.stopPropagation();
            onOpenProject(project.id);
          }}
        >
          Informar contrato
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ ...blockLabelStyle, color: token.colorTextSecondary }}>
        Contrato
      </div>
      <Field
        label="Valor do contrato"
        value={formatCurrency(project.valorContrato)}
        hint="Valor total do contrato cadastrado para esta obra."
      />
      <Field
        label={entradaLabel(project.tipoObra)}
        value={formatCurrency(project.totalAportado)}
        hint="Total de entradas já realizadas nesta obra."
      />
      <Field
        label="Lucro previsto"
        value={
          project.lucroPrevisto === null
            ? "—"
            : formatCurrency(project.lucroPrevisto)
        }
        color={
          project.lucroPrevisto === null
            ? undefined
            : saldoColor(project.lucroPrevisto, token)
        }
        hint="Valor do contrato menos o orçamento. Fixo — a referência do dia em que o negócio foi fechado."
      />
      <Field
        label="Lucro projetado"
        value={
          project.lucroProjetado === null
            ? "—"
            : formatCurrency(project.lucroProjetado)
        }
        color={
          project.lucroProjetado === null
            ? undefined
            : saldoColor(project.lucroProjetado, token)
        }
        hint={
          "Se tudo sair como planejado: valor do contrato menos custo já gasto e já previsto. Atualiza conforme lançamentos entram." +
          (project.lucroReconhecido === null
            ? ""
            : ` Detalhe contábil: pelo método de percentual de conclusão (receita reconhecida × avanço), o lucro já reconhecido até agora é ${formatCurrency(project.lucroReconhecido)}${project.margemPct === null ? "" : `, margem de ${formatPercent(project.margemPct)}`}.`)
        }
      />
    </div>
  );
}

/**
 * Só obra PROPRIA em andamento (sem `valorVendaEsperada`, vira chamado à
 * ação). Equivalente ao `ContratoBlock` de obra de cliente, mas sem "Lucro
 * reconhecido"/margem — obra própria não reconhece receita formalmente,
 * `valorVendaEsperada` é só uma estimativa de planejamento.
 */
function VendaEsperadaBlock({
  project,
  onOpenProject,
}: {
  project: ProjectPerformance;
  onOpenProject: (groupId: string) => void;
}) {
  const { token } = theme.useToken();
  const { formatCurrency } = usePrivacyFormat();

  if (!permissionsFor(project.myRole).canViewFinanceiro) {
    return (
      <div>
        <div style={{ ...blockLabelStyle, color: token.colorTextSecondary }}>
          Venda esperada
        </div>
        <div style={{ fontSize: 13, color: token.colorTextSecondary }}>
          Valor de venda esperado e lucro previsto são visíveis apenas para o
          dono e os administradores desta obra.
        </div>
      </div>
    );
  }

  if (project.valorVendaEsperada === null) {
    return (
      <div>
        <div style={{ ...blockLabelStyle, color: token.colorTextSecondary }}>
          Venda esperada
        </div>
        <div
          style={{
            fontSize: 13,
            color: token.colorTextSecondary,
            marginBottom: 8,
          }}
        >
          Valor de venda esperado ainda não informado. Sem ele não há previsão
          de lucro a calcular nesta obra.
        </div>
        <Button
          size="small"
          onClick={(event: MouseEvent<HTMLElement>) => {
            event.stopPropagation();
            onOpenProject(project.id);
          }}
        >
          Informar venda esperada
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ ...blockLabelStyle, color: token.colorTextSecondary }}>
        Venda esperada
      </div>
      <Field
        label="Valor de venda esperado"
        value={formatCurrency(project.valorVendaEsperada)}
        hint="Estimativa de venda informada no planejamento desta obra."
      />
      <Field
        label={entradaLabel(project.tipoObra)}
        value={formatCurrency(project.totalAportado)}
        hint="Total de entradas já realizadas nesta obra."
      />
      <Field
        label="Lucro previsto"
        value={
          project.lucroPrevisto === null
            ? "—"
            : formatCurrency(project.lucroPrevisto)
        }
        color={
          project.lucroPrevisto === null
            ? undefined
            : saldoColor(project.lucroPrevisto, token)
        }
        hint="Venda esperada menos o orçamento. Fixo — a referência do dia em que o valor foi informado."
      />
      <Field
        label="Lucro projetado"
        value={
          project.lucroProjetado === null
            ? "—"
            : formatCurrency(project.lucroProjetado)
        }
        color={
          project.lucroProjetado === null
            ? undefined
            : saldoColor(project.lucroProjetado, token)
        }
        hint="Se tudo sair como planejado: venda esperada menos custo já gasto e já previsto. Atualiza conforme lançamentos entram."
      />
    </div>
  );
}

/**
 * Só obra CONCLUIDO, dos dois tipos. Substitui `ContratoBlock` quando a obra
 * termina: o que importa deixa de ser avanço/contrato e passa a ser o
 * resultado definitivo — valor de fechamento menos custo gasto.
 */
function FechamentoBlock({ project }: { project: ProjectPerformance }) {
  const { token } = theme.useToken();
  const { formatCurrency } = usePrivacyFormat();

  if (!permissionsFor(project.myRole).canViewFinanceiro) {
    return (
      <div>
        <div style={{ ...blockLabelStyle, color: token.colorTextSecondary }}>
          Fechamento
        </div>
        <div style={{ fontSize: 13, color: token.colorTextSecondary }}>
          Valor de fechamento e lucro são visíveis apenas para o dono e os
          administradores desta obra.
        </div>
      </div>
    );
  }

  if (project.valorFechamento === null) {
    return (
      <div>
        <div style={{ ...blockLabelStyle, color: token.colorTextSecondary }}>
          Fechamento
        </div>
        <div style={{ fontSize: 13, color: token.colorTextSecondary }}>
          Valor de fechamento ainda não informado. Sem ele não há lucro a
          calcular nesta obra.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ ...blockLabelStyle, color: token.colorTextSecondary }}>
        Fechamento
      </div>
      <Field
        label="Valor de fechamento"
        value={formatCurrency(project.valorFechamento)}
        hint="Valor pelo qual a obra foi entregue ou vendida."
      />
      <Field
        label="Custo gasto"
        value={formatCurrency(project.custoReal)}
        hint="Soma das saídas já realizadas nesta obra."
      />
      <Field
        label="Lucro realizado"
        value={
          project.lucroRealizado === null
            ? "—"
            : formatCurrency(project.lucroRealizado)
        }
        color={
          project.lucroRealizado === null
            ? undefined
            : saldoColor(project.lucroRealizado, token)
        }
        hint="Valor de fechamento menos o custo gasto. Definitivo — a obra terminou, o custo não muda mais."
      />
    </div>
  );
}

function ProjectCard({
  project,
  onOpenProject,
}: {
  project: ProjectPerformance;
  onOpenProject: (groupId: string) => void;
}) {
  const { token } = theme.useToken();
  const { formatCurrency, formatPercent } = usePrivacyFormat();
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.md);
  const isCliente = project.tipoObra === "CLIENTE";
  const isConcluida = project.situacao === "CONCLUIDO";

  // Divisória entre base e o bloco lateral: vertical quando lado a lado,
  // horizontal quando empilham.
  const sideDividerStyle: CSSProperties = isDesktop
    ? { borderLeft: `1px solid ${token.colorBorderSecondary}`, paddingLeft: 16 }
    : { borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: 12 };

  return (
    <Card
      hoverable
      onClick={() => onOpenProject(project.id)}
      style={{ cursor: "pointer" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span style={{ fontWeight: 600, color: token.colorTextHeading }}>
          {project.nome}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {project.situacao !== "EM_ANDAMENTO" && (
            <Tag color={SITUACAO_OBRA_COLOR[project.situacao]} style={{ margin: 0 }}>
              {SITUACAO_OBRA_LABEL[project.situacao]}
            </Tag>
          )}
          {/* Desempenho (no prazo/risco/...) deixa de fazer sentido quando a
              obra já terminou. */}
          {!isConcluida && (
            <Tag color={STATUS_TAG_COLOR[project.status]} style={{ margin: 0 }}>
              {STATUS_LABEL[project.status]}
            </Tag>
          )}
        </div>
      </div>

      {isConcluida ? (
        <div
          style={{
            fontSize: 12,
            color: token.colorTextSecondary,
            marginBottom: 10,
          }}
        >
          Obra concluída — não recebe mais lançamentos.
        </div>
      ) : project.avanco === null ? (
        <div
          style={{
            fontSize: 12,
            color: token.colorTextSecondary,
            marginBottom: 10,
          }}
        >
          Sem orçamento definido — não há avanço a medir.
        </div>
      ) : (
        <Tooltip title="Avanço = custo gasto ÷ orçamento (custo sobre custo), travado em 100%.">
          <Progress
            percent={project.avanco}
            strokeColor={consumoColor(project.consumidoPct, token)}
            format={() => `${formatPercent(project.avanco ?? 0)} de avanço`}
            style={{ marginBottom: 6, cursor: "help" }}
          />
        </Tooltip>
      )}

      <div
        style={{
          display: "grid",
          gap: 16,
          // Base à esquerda, bloco lateral à direita; empilha com a base
          // primeiro em largura reduzida. Toda obra tem bloco lateral agora:
          // fechamento (concluída), contrato (cliente em andamento) ou venda
          // esperada (própria em andamento).
          gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr",
        }}
      >
        <BaseBlock project={project} />
        <div style={sideDividerStyle}>
          {isConcluida ? (
            <FechamentoBlock project={project} />
          ) : isCliente ? (
            <ContratoBlock project={project} onOpenProject={onOpenProject} />
          ) : (
            <VendaEsperadaBlock project={project} onOpenProject={onOpenProject} />
          )}
        </div>
      </div>

      {!isConcluida && project.pendencias > 0 && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: token.colorPrimary,
          }}
        >
          {plural(project.pendencias, "pendência", "pendências")} —{" "}
          {formatCurrency(project.saidasPendentes)} fora do realizado
        </div>
      )}
    </Card>
  );
}

function LoadingCards() {
  return (
    <>
      {[0, 1].map((key) => (
        <Card key={key}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </Card>
      ))}
    </>
  );
}

export function ProjectPerformanceCards({
  projects,
  loading,
  onOpenProject,
}: ProjectPerformanceCardsProps) {
  const { token } = theme.useToken();

  const obrasCliente = projects.filter(
    (project) => project.tipoObra === "CLIENTE",
  );
  const obrasProprias = projects.filter(
    (project) => project.tipoObra === "PROPRIA",
  );

  if (!loading && projects.length === 0) {
    return (
      <SectionBlock title="Obras" scope="acumulado">
        <Card>
          <Empty description="Nenhuma obra cadastrada ainda." />
        </Card>
      </SectionBlock>
    );
  }

  return (
    <>
      <SectionBlock
        title="Obras de cliente"
        scope="acumulado"
        footnote="Ordenadas por urgência de aporte: quem precisa de mais dinheiro aparece primeiro."
      >
        <div style={{ display: "grid", gap: 16 }}>
          {loading ? (
            <LoadingCards />
          ) : obrasCliente.length === 0 ? (
            <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>
              Nenhuma obra de cliente.
            </div>
          ) : (
            obrasCliente.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpenProject={onOpenProject}
              />
            ))
          )}
        </div>
      </SectionBlock>

      <SectionBlock title="Obras próprias" scope="acumulado">
        {/* Coluna única, como "Obras de cliente": toda obra própria agora
            também pode ter bloco lateral (venda esperada), então o card
            precisa da mesma largura pra caber os dois lados confortavelmente. */}
        <div style={{ display: "grid", gap: 16 }}>
          {loading ? (
            <LoadingCards />
          ) : obrasProprias.length === 0 ? (
            <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>
              Nenhuma obra própria.
            </div>
          ) : (
            obrasProprias.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpenProject={onOpenProject}
              />
            ))
          )}
        </div>
      </SectionBlock>
    </>
  );
}
