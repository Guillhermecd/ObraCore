import {
  Card,
  DatePicker,
  Empty,
  Table,
  Tag,
  message,
  theme,
  type TableColumnsType,
  type TablePaginationConfig,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardService } from "../../api/modules/DashboardService";
import type {
  ExpenseTipo,
  Movimentacao,
  MovimentacaoStatus,
  ProjectPerformance,
} from "../../api/modules/types";
import { SectionBlock } from "../../components/SectionBlock";
import { useActiveGroup } from "../../layouts/groupContext";
import { usePrivateMobileHeader } from "../../layouts/privateMobileHeader";
import { usePrivacyFormat } from "../../privacyContext";
import { ProjectPerformanceCards } from "./ProjectPerformanceCards";

const { RangePicker } = DatePicker;

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
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: 16,
  marginBottom: 24,
};

/**
 * Situação das obras + histórico geral — separado do Consolidado (que ficou
 * com a visão executiva de lucro/caixa). Aqui é o detalhamento por obra e o
 * extrato de lançamentos.
 */
export function StatusPage() {
  const { token } = theme.useToken();
  const { formatCurrency } = usePrivacyFormat();
  usePrivateMobileHeader("Status");
  const navigate = useNavigate();
  const { setActiveGroupId } = useActiveGroup();
  const [messageApi, contextHolder] = message.useMessage();

  const [projects, setProjects] = useState<ProjectPerformance[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);

  // `movLoading` é derivado da chave da requisição em curso — trocar de
  // página ou de período já entra em carregamento no mesmo render, sem um
  // setState a mais dentro do efeito.
  const from = range?.[0]?.format("YYYY-MM-DD");
  const to = range?.[1]?.format("YYYY-MM-DD");
  const movKey = `${page}|${from ?? ""}|${to ?? ""}`;
  const [loadedMovKey, setLoadedMovKey] = useState<string | null>(null);
  const movLoading = loadedMovKey !== movKey;

  useEffect(() => {
    DashboardService.projectsPerformance()
      .then((response) => setProjects(response))
      .catch((error: unknown) => {
        messageApi.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar desempenho das obras.",
        );
      })
      .finally(() => setProjectsLoading(false));
  }, [messageApi]);

  useEffect(() => {
    DashboardService.movimentacoes(page, PAGE_SIZE, from, to)
      .then((response) => {
        setMovimentacoes(response.items);
        setTotal(response.total);
      })
      .catch((error: unknown) => {
        messageApi.error(
          error instanceof Error
            ? error.message
            : "Erro ao carregar movimentações.",
        );
      })
      .finally(() => setLoadedMovKey(movKey));
  }, [messageApi, page, from, to, movKey]);

  function openProjectDashboard(groupId: string) {
    setActiveGroupId(groupId);
    navigate("/obra");
  }

  function handleTableChange(pagination: TablePaginationConfig) {
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
      title: "Obra",
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
        <div>
          <h1
            style={{ margin: 0, color: token.colorTextHeading, fontSize: 26 }}
          >
            Status das obras
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              color: token.colorTextSecondary,
              fontSize: 13,
            }}
          >
            Situação de cada obra e o histórico completo de lançamentos. O
            filtro de período abaixo governa apenas o histórico.
          </p>
        </div>
        <RangePicker
          value={range}
          onChange={(values) => {
            setPage(1);
            setRange(
              values && values[0] && values[1] ? [values[0], values[1]] : null,
            );
          }}
          format="DD/MM/YYYY"
          placeholder={["Início", "Fim"]}
          allowClear
        />
      </div>

      <ProjectPerformanceCards
        projects={projects}
        loading={projectsLoading}
        onOpenProject={openProjectDashboard}
      />

      <SectionBlock
        title="Histórico geral"
        scope="periodo"
        extra={
          range === null ? (
            <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
              Todo o período
            </span>
          ) : null
        }
      >
        <Card>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={movimentacoes}
            loading={movLoading}
            onChange={handleTableChange}
            scroll={{ x: "max-content" }}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total,
              showSizeChanger: false,
            }}
            locale={{
              emptyText: (
                <Empty description="Nenhuma movimentação no período selecionado." />
              ),
            }}
          />
        </Card>
      </SectionBlock>
    </section>
  );
}
