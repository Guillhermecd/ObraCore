export type Branding = {
  id: string;
  key: string;
  companyName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  gradientFrom: string | null;
  gradientTo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProfileImage = {
  bucket: string;
  key: string;
  contentType: string;
  originalFilename?: string;
  url?: string;
};

export type User = {
  id: string;
  email: string;
  emailValidated: boolean;
  name: string | null;
  profileImage: ProfileImage | null;
  groupIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type MessageResponse = {
  message: string;
};

export type PlannedSpendingHistoryEntry = {
  value: number;
  previousValue: number | null;
  changedBy: string;
  changedByName: string | null;
  changedAt: string;
};

/**
 * Obra de CLIENTE tem contrato, receita e lucro reconhecidos; obra PROPRIA é
 * financiada por aporte de capital e não compõe o resultado do Consolidado.
 */
export type TipoObra = "PROPRIA" | "CLIENTE";

/**
 * Ciclo de vida da obra — diferente do `status` de desempenho (no_prazo /
 * risco / ...) que já existe em `ProjectPerformance`. CONCLUIDO significa que
 * não haverá mais lançamentos: a obra fica travada até ser reaberta.
 */
export type SituacaoObra = "PLANEJADO" | "EM_ANDAMENTO" | "CONCLUIDO";

/**
 * MASTER é o criador da obra (derivado de `owner`, nunca atribuído). ADMIN
 * lança, convida e gerencia colaboradores; FISCAL só acompanha, e não enxerga
 * contrato, receita nem lucro.
 */
export type GroupRole = "MASTER" | "ADMIN" | "FISCAL";

/** Papéis que podem ser atribuídos — MASTER não entra, vem do dono. */
export type AssignableGroupRole = Exclude<GroupRole, "MASTER">;

export type Group = {
  id: string;
  name: string;
  description: string | null;
  owner: string;
  isPersonal: boolean;
  isOwner: boolean;
  myRole: GroupRole;
  memberCount: number;
  plannedSpending: number;
  plannedSpendingHistory: PlannedSpendingHistoryEntry[];
  tipoObra: TipoObra;
  valorContrato: number | null;
  situacao: SituacaoObra;
  /** Só usado (e só faz sentido) quando `situacao` é CONCLUIDO. */
  valorFechamento: number | null;
  createdAt: string;
  updatedAt: string;
};

export type GroupMember = User & {
  isOwner: boolean;
  role: GroupRole;
};

export type SentGroupInvite = {
  id: string;
  groupId: string;
  groupName: string;
  inviteeEmail: string;
  role: AssignableGroupRole;
  status: string;
  createdAt: string;
};

export type ReceivedGroupInvite = {
  id: string;
  groupId: string;
  groupName: string;
  inviterName: string;
  role: AssignableGroupRole;
  status: string;
  createdAt: string;
};

export type ExpenseTipo = "ENTRADA" | "SAIDA";
export type ExpenseCategoryTipo = ExpenseTipo | "AMBOS";

export type ExpenseCategory = {
  id: string;
  name: string;
  color: string | null;
  owner: string;
  groupId: string;
  tipo: ExpenseCategoryTipo;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseSource = {
  id: string;
  name: string;
  owner: string;
  groupId: string;
  tipo: ExpenseCategoryTipo;
  createdAt: string;
  updatedAt: string;
};

export const PAYMENT_METHODS = [
  "Dinheiro",
  "PIX",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Boleto",
  "Transferência",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type Expense = {
  id: string;
  date: string;
  categoryId: string;
  sourceId: string;
  supplier: string | null;
  paymentMethod: PaymentMethod;
  amount: number;
  notes: string | null;
  comprovante: ProfileImage | null;
  owner: string;
  groupId: string;
  tipo: ExpenseTipo;
  dataPrevista: string | null;
  dataRealizada: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseImportRow = {
  rowNumber: number;
  date: string | null;
  categoryName: string;
  categoryIsNew: boolean;
  sourceName: string;
  sourceIsNew: boolean;
  supplier: string | null;
  paymentMethod: string | null;
  amount: number | null;
  notes: string | null;
  valid: boolean;
  errors: string[];
};

export type ExpenseImportSummary = {
  total: number;
  valid: number;
  invalid: number;
};

export type ExpenseImportPreviewResponse = {
  rows: ExpenseImportRow[];
  summary: ExpenseImportSummary;
};

export type ExpenseImportFailure = {
  rowNumber: number;
  message: string;
};

export type ExpenseImportCommitResponse = {
  imported: number;
  failed: ExpenseImportFailure[];
};

export type MovimentacaoStatus = "REALIZADO" | "PENDENTE" | "ATRASADO";

export type Movimentacao = {
  id: string;
  data: string;
  groupId: string;
  projeto: string | null;
  tipo: ExpenseTipo;
  categoria: string | null;
  valor: number;
  status: MovimentacaoStatus;
};

export type MovimentacoesResponse = {
  items: Movimentacao[];
  page: number;
  limit: number;
  total: number;
};

/**
 * Resultado consolidado — alimentado EXCLUSIVAMENTE por obras de cliente com
 * contrato informado. Obra própria não gera receita.
 */
export type DashboardResultado = {
  contratosAtivos: number;
  receitaReconhecida: number;
  custoRealizado: number;
  lucroReconhecido: number;
  margemPct: number | null;
  margemPrevistaPct: number | null;
};

/**
 * Resultado REALIZADO — só obras CONCLUIDO com valor de fechamento
 * informado, dos dois tipos (diferente de `DashboardResultado`, que é só
 * CLIENTE em andamento, por percentual de avanço).
 */
export type DashboardResultadoRealizado = {
  obrasConcluidas: number;
  valorFechamentoTotal: number;
  custoRealizadoTotal: number;
  lucroRealizadoTotal: number;
  margemPct: number | null;
};

/**
 * Bloco de caixa do Consolidado. Todos os campos são acumulados/ponto-no-tempo:
 * não existe janela de período nem comparativo "vs. período anterior" aqui.
 * `coberturaCaixaPct` substituiu o antigo score de "saúde financeira", que não
 * tinha fórmula explicável.
 */
export type DashboardSummaryResponse = {
  saldoTotal: number;
  caixaComprometido: number;
  caixaLivre: number;
  aporteTotalAFazer: number;
  coberturaCaixaPct: number | null;
  resultado: DashboardResultado;
  resultadoRealizado: DashboardResultadoRealizado;
};

export type CashflowPoint = {
  data: string;
  tipo: "Entrada" | "Saída";
  valor: number;
};

export type CashflowForecastResponse = {
  entradasPrevistas: number;
  saidasPrevistas: number;
  /** Entradas − saídas previstas na janela. Não é saldo: é resultado do período. */
  resultadoPrevisto: number;
  serie: CashflowPoint[];
};

/** Alerta é exceção: o backend não emite mais nível "success". */
export type AlertLevel = "warning" | "info";

export type DashboardAlert = {
  groupId: string;
  projeto: string;
  nivel: AlertLevel;
  titulo: string;
  mensagem: string;
  consumidoPct: number | null;
  /** Quanto falta em dinheiro nessa obra, quando aplicável. */
  valor: number | null;
};

export type ProjectPerformanceStatus =
  | "no_prazo"
  | "risco"
  | "sem_orcamento"
  | "sem_movimento";

/**
 * Base comum a TODA obra, mais a camada de contrato que só obra de cliente
 * preenche (`null` nas demais — nunca 0, que seria lido como "lucro zero").
 * Já vem ordenado por urgência de aporte pelo backend.
 */
export type ProjectPerformance = {
  id: string;
  nome: string;
  saldoAtual: number;
  gastoPlanejado: number | null;
  custoReal: number;
  consumidoPct: number | null;
  status: ProjectPerformanceStatus;
  pendencias: number;

  /** Papel do usuário nesta obra — o Consolidado mistura obras de papéis diferentes. */
  myRole: GroupRole;
  tipoObra: TipoObra;
  valorContrato: number | null;
  totalAportado: number;
  saidasPendentes: number;
  orcamentoRestante: number;
  aporteAFazer: number;
  coberturaPct: number | null;
  folegoMeses: number | null;
  avanco: number | null;
  receitaReconhecida: number | null;
  lucroReconhecido: number | null;
  margemPct: number | null;
  margemPrevistaPct: number | null;

  situacao: SituacaoObra;
  valorFechamento: number | null;
  /** Lucro definitivo de obra CONCLUIDO: valorFechamento − custoReal. */
  lucroRealizado: number | null;
};

export type BreakdownItem = {
  nome: string;
  valor: number;
};

export type MonthlyEvolutionPoint = {
  mes: string;
  valor: number;
};

export type TopSupplier = {
  nome: string;
  total: number;
  count: number;
};

/**
 * Financeiro de uma obra (grupo). `orcamentoPrevisto`..`saldoEmCaixa` são
 * acumulados do projeto (ignoram o filtro de período); os demais campos
 * respeitam `from`/`to` quando informados — ver dicionário de métricas.
 */
export type DashboardObraResponse = {
  nome: string;
  tipoObra: TipoObra;
  valorContrato: number | null;

  // Bloco de orçamento — acumulado.
  orcamentoPrevisto: number;
  custoRealizado: number;
  saldoOrcamento: number;
  consumidoPct: number | null;
  saidasPendentes: number;
  pendencias: number;

  // Bloco de caixa — acumulado.
  totalAportado: number;
  saldoEmCaixa: number;
  aporteAFazer: number;
  coberturaPct: number | null;

  // Bloco de ritmo — últimos 3 meses civis completos, extrapolação linear.
  gastoMedioMensal: number;
  folegoMeses: number | null;
  dataProximoAporte: string | null;
  mesEsgotamentoOrcamento: string | null;

  custoMedioLancamento: number;
  qtdLancamentos: number;
  composicao: {
    categoria: BreakdownItem[];
    fonte: BreakdownItem[];
    formaPagamento: BreakdownItem[];
  };
  evolucaoMensal: MonthlyEvolutionPoint[];
  topFornecedores: TopSupplier[];
};
