import {
  Card,
  Empty,
  Grid,
  Progress,
  Statistic,
  Table,
  Tag,
  message,
  theme,
  type TableColumnsType,
  type TablePaginationConfig,
} from "antd";
import dayjs from "dayjs";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardService } from "../../api/modules/DashboardService";
import type {
  DashboardProjeto,
  DashboardTotais,
  ExpenseTipo,
  Movimentacao,
  MovimentacaoStatus,
} from "../../api/modules/types";
import { useActiveGroup } from "../../layouts/groupContext";
import { usePrivateMobileHeader } from "../../layouts/privateMobileHeader";
import { formatCurrency } from "../../utils/format";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<MovimentacaoStatus, string> = {
  REALIZADO: "Realizado",
  PENDENTE: "Pendente",
  ATRASADO: "Atrasado",
};

const STATUS_COLOR: Record<MovimentacaoStatus, string> = {
  REALIZADO: "success",
  PENDENTE: "processing",
  ATRASADO: "error",
};

const pageHeaderRowStyle: CSSProperties = {
  marginBottom: 20,
};

const kpiGridStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  marginBottom: 24,
};

const projectsGridStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  marginBottom: 24,
};

export function VisaoGeralPage() {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.md);
  usePrivateMobileHeader("Visão Geral");
  const navigate = useNavigate();
  const { setActiveGroupId } = useActiveGroup();
  const [messageApi, contextHolder] = message.useMessage();

  const pageTitleStyle: CSSProperties = {
    margin: 0,
    color: token.colorTextHeading,
    fontSize: 26,
  };

  const pageDescriptionStyle: CSSProperties = {
    margin: "4px 0 0",
    color: token.colorTextSecondary,
  };

  const [totais, setTotais] = useState<DashboardTotais>({
    entradas: 0,
    saidas: 0,
    saldo: 0,
  });
  const [projetos, setProjetos] = useState<DashboardProjeto[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [movLoading, setMovLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    DashboardService.overview()
      .then((response) => {
        setTotais(response.totais);
        setProjetos(response.projetos);
      })
      .catch((error: unknown) => {
        messageApi.error(
          error instanceof Error ? error.message : "Erro ao carregar visão geral.",
        );
      })
      .finally(() => setOverviewLoading(false));
  }, [messageApi]);

  useEffect(() => {
    DashboardService.movimentacoes(page, PAGE_SIZE)
      .then((response) => {
        setMovimentacoes(response.items);
        setTotal(response.total);
      })
      .catch((error: unknown) => {
        messageApi.error(
          error instanceof Error ? error.message : "Erro ao carregar movimentações.",
        );
      })
      .finally(() => setMovLoading(false));
  }, [messageApi, page]);

  function openProjectDashboard(groupId: string) {
    setActiveGroupId(groupId);
    navigate("/dashboard");
  }

  function handleTableChange(pagination: TablePaginationConfig) {
    setMovLoading(true);
    setPage(pagination.current ?? 1);
  }

  const columns: TableColumnsType<Movimentacao> = [
    {
      title: "Data",
      dataIndex: "data",
      key: "data",
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "Projeto",
      dataIndex: "projeto",
      key: "projeto",
      render: (value: string | null) => value ?? "—",
    },
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "tipo",
      render: (value: ExpenseTipo) => (
        <Tag color={value === "ENTRADA" ? "success" : "default"}>
          {value === "ENTRADA" ? "Entrada" : "Saída"}
        </Tag>
      ),
    },
    {
      title: "Categoria",
      dataIndex: "categoria",
      key: "categoria",
      render: (value: string | null) => value ?? "—",
    },
    {
      title: "Valor",
      dataIndex: "valor",
      key: "valor",
      render: (value: number) => formatCurrency(value),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value: MovimentacaoStatus) => (
        <Tag color={STATUS_COLOR[value]}>{STATUS_LABEL[value]}</Tag>
      ),
    },
  ];

  return (
    <section>
      {contextHolder}
      <div style={pageHeaderRowStyle}>
        <h1 style={pageTitleStyle}>Visão Geral</h1>
        <p style={pageDescriptionStyle}>
          Caixa consolidado de todos os seus grupos, com resumo por projeto e
          histórico geral de movimentações.
        </p>
      </div>

      <div
        style={{
          ...kpiGridStyle,
          gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "1fr",
        }}
      >
        <Card loading={overviewLoading}>
          <Statistic
            title="Total entrou"
            value={totais.entradas}
            formatter={() => formatCurrency(totais.entradas)}
          />
        </Card>
        <Card loading={overviewLoading}>
          <Statistic
            title="Total saiu"
            value={totais.saidas}
            formatter={() => formatCurrency(totais.saidas)}
          />
        </Card>
        <Card loading={overviewLoading}>
          <Statistic
            title="Saldo geral"
            value={totais.saldo}
            formatter={() => formatCurrency(totais.saldo)}
            styles={{
              content: {
                color: totais.saldo < 0 ? token.colorError : token.colorSuccess,
              },
            }}
          />
        </Card>
      </div>

      <div
        style={{
          ...projectsGridStyle,
          gridTemplateColumns: isDesktop
            ? "repeat(auto-fill, minmax(260px, 1fr))"
            : "1fr",
        }}
      >
        {!overviewLoading && projetos.length === 0 && (
          <Empty description="Nenhum projeto encontrado." />
        )}
        {projetos.map((projeto) => (
          <Card
            key={projeto.id}
            title={projeto.nome}
            hoverable
            loading={overviewLoading}
            onClick={() => openProjectDashboard(projeto.id)}
            style={{ cursor: "pointer" }}
          >
            <Statistic
              title="Saldo atual"
              value={projeto.saldoAtual}
              formatter={() => formatCurrency(projeto.saldoAtual)}
              styles={{
                content: {
                  color:
                    projeto.saldoAtual < 0 ? token.colorError : token.colorSuccess,
                },
              }}
            />
            {projeto.gastoPlanejado ? (
              <Progress
                percent={Math.min(projeto.consumoPct ?? 0, 100)}
                strokeColor={projeto.estouro ? token.colorError : token.colorSuccess}
                format={() => `${projeto.consumoPct}%`}
                style={{ marginTop: 12 }}
              />
            ) : (
              <div
                style={{
                  color: token.colorTextSecondary,
                  fontSize: 13,
                  marginTop: 16,
                }}
              >
                Sem orçamento definido
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card title="Histórico geral" loading={movLoading && movimentacoes.length === 0}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={movimentacoes}
          loading={movLoading}
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
          }}
          locale={{
            emptyText: <Empty description="Nenhuma movimentação encontrada." />,
          }}
        />
      </Card>
    </section>
  );
}
