function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDaysUTC(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Arredondamento para 2 casas decimais — convenção única para todo valor
 * monetário (evita o drift de ponto flutuante em somas, ex.: 50000 +
 * 9489.52 = 59489.520000000004) e para `consumidoPct`, garantindo que o
 * mesmo número (e o mesmo gatilho de risco `>= 80`) apareça em `/alerts`,
 * `/projects-performance` e `/obra`. Antes desta consolidação, `buildAlerts`
 * arredondava o percentual para inteiro enquanto os demais usavam 2 casas,
 * fazendo o alerta e o card de projeto discordarem perto de limiares como
 * 79,6%.
 */
function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Data "prevista" de um lançamento, com o mesmo fallback usado no histórico
 * geral (`dashboard/movimentacoes`): `dataPrevista`, senão a `date` legada.
 */
function forecastDate(expense) {
  return expense.dataPrevista || expense.date;
}

function isRealizada(expense) {
  return Boolean(expense.dataRealizada);
}

const RITMO_MESES = 3;

/**
 * Obra sem nenhum lançamento realizado ainda (nem custo, nem aporte) — nada
 * aconteceu de fato. Usado tanto pro status "sem_movimento" quanto para
 * silenciar alertas/KPIs de caixa que, comparados contra o orçamento inteiro,
 * disparariam sempre no instante em que a obra é criada.
 */
function isSemMovimento(metrics) {
  return metrics.custoReal === 0 && metrics.totalAportado === 0;
}

/**
 * Chave `YYYY-MM` de um mês civil deslocado de `offset` meses a partir de
 * `reference`.
 */
function monthKey(reference, offset) {
  const shifted = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + offset, 1),
  );
  return shifted.toISOString().slice(0, 7);
}

/**
 * Gasto médio mensal: soma das SAIDA realizadas nos `RITMO_MESES` meses civis
 * COMPLETOS anteriores, dividida por `RITMO_MESES`. O mês corrente fica de
 * fora de propósito — ele está parcial, e incluí-lo puxaria a média para baixo
 * no começo de cada mês, fazendo o "fôlego de caixa" saltar sem que nada
 * tenha mudado na obra.
 */
function computeGastoMedioMensal(groupExpenses, reference) {
  const janela = new Set();
  for (let offset = 1; offset <= RITMO_MESES; offset += 1) {
    janela.add(monthKey(reference, -offset));
  }

  const total = groupExpenses.reduce((sum, expense) => {
    if (expense.tipo !== 'SAIDA' || !isRealizada(expense)) {
      return sum;
    }
    return janela.has(String(expense.dataRealizada).slice(0, 7)) ? sum + expense.amount : sum;
  }, 0);

  return round2(total / RITMO_MESES);
}

/**
 * Métricas financeiras de UM grupo/obra, acumuladas (project-to-date) —
 * fonte única reaproveitada por `computeProjectPerformance`, `buildAlerts` e
 * pelo endpoint `dashboard/obra`. Qualquer "realizado" aqui segue a mesma
 * regra: só lançamentos com `dataRealizada` contam (dicionário de métricas).
 *
 *   custoReal      = Σ amount de SAIDA realizada
 *   totalAportado  = Σ amount de ENTRADA realizada
 *   saldoAtual     = totalAportado − custoReal (caixa do grupo)
 *   gastoPlanejado = group.plannedSpending (0 quando não definido)
 *   consumidoPct   = custoReal / gastoPlanejado, 2 casas — null sem orçamento
 *   pendencias     = nº de SAIDA ainda não realizadas (previstas)
 *
 * Camada de orçamento/caixa (Fase 1):
 *   saidasPendentes   = Σ amount de SAIDA não realizada — o VALOR ainda fora
 *                       do realizado (`pendencias` é só a contagem)
 *   orcamentoRestante = max(gastoPlanejado − custoReal, 0)
 *   aporteAFazer      = max(orcamentoRestante − saldoAtual, 0), que algebricamente
 *                       é max(gastoPlanejado − totalAportado, 0) — NÃO reintroduzir
 *                       o termo custoReal, ele se cancela
 *   coberturaPct      = saldoAtual / orcamentoRestante — null quando não resta
 *                       orçamento (nada a cobrir)
 *
 * Camada de ritmo (extrapolação linear, ignora cronograma físico):
 *   gastoMedioMensal, folegoMeses, dataProximoAporte, mesEsgotamentoOrcamento
 *
 * Camada de contrato (só obra CLIENTE com valorContrato informado; nos demais
 * casos tudo é null — nunca 0, que seria lido como "lucro zero"):
 *   avanco, receitaReconhecida, lucroReconhecido, margemPct, margemPrevistaPct
 *
 * Camada de previsão (CLIENTE com valorContrato OU PROPRIA com
 * valorVendaEsperada — ao contrário da camada de contrato acima, essa NÃO é
 * reconhecimento de receita formal, é só uma estimativa de planejamento):
 *   lucroPrevisto  = valorEsperado − gastoPlanejado. Fixo — não muda com
 *                    lançamento nenhum, é a referência do dia em que o
 *                    negócio foi fechado.
 *   custoProjetado = custoReal + max(orcamentoRestante, saidasPendentes).
 *                    O piso em orcamentoRestante é essencial: sem ele, antes
 *                    de qualquer saída ser lançada como pendente, o custo
 *                    projetado seria 0 e o lucro projetado inventaria 100%
 *                    de margem no dia da criação da obra.
 *   lucroProjetado = valorEsperado − custoProjetado. Só diverge do previsto
 *                    quando o comprometido (já gasto + já lançado como
 *                    pendente) ultrapassa o orçamento restante.
 *
 * `reference` (data-base do ritmo) é injetável para os testes; em produção é
 * sempre `startOfTodayUTC()`.
 */
function computeGroupMetrics(group, groupExpenses, reference = startOfTodayUTC()) {
  let custoReal = 0;
  let totalAportado = 0;
  let pendencias = 0;
  let saidasPendentes = 0;

  groupExpenses.forEach((expense) => {
    if (expense.tipo === 'SAIDA' && !isRealizada(expense)) {
      pendencias += 1;
      saidasPendentes += expense.amount;
    }

    if (!isRealizada(expense)) {
      return;
    }

    if (expense.tipo === 'ENTRADA') {
      totalAportado += expense.amount;
    } else {
      custoReal += expense.amount;
    }
  });

  custoReal = round2(custoReal);
  totalAportado = round2(totalAportado);
  const saldoAtual = round2(totalAportado - custoReal);

  const gastoPlanejado = group.plannedSpending || 0;
  const consumidoPct = gastoPlanejado > 0 ? round2((custoReal / gastoPlanejado) * 100) : null;

  const orcamentoRestante = round2(Math.max(gastoPlanejado - custoReal, 0));
  const aporteAFazer = round2(Math.max(gastoPlanejado - totalAportado, 0));
  const coberturaPct =
    orcamentoRestante > 0 ? round2((saldoAtual / orcamentoRestante) * 100) : null;

  const gastoMedioMensal = computeGastoMedioMensal(groupExpenses, reference);
  const folegoMeses =
    gastoMedioMensal > 0 && saldoAtual > 0 ? round2(saldoAtual / gastoMedioMensal) : null;
  const dataProximoAporte =
    folegoMeses === null
      ? null
      : new Date(reference.getTime() + folegoMeses * 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
  const mesEsgotamentoOrcamento =
    gastoMedioMensal > 0 && orcamentoRestante > 0
      ? monthKey(reference, Math.ceil(orcamentoRestante / gastoMedioMensal))
      : null;

  const tipoObra = group.tipoObra || 'PROPRIA';
  const valorContrato =
    tipoObra === 'CLIENTE' && group.valorContrato ? group.valorContrato : null;
  const valorVendaEsperada =
    tipoObra === 'PROPRIA' && group.valorVendaEsperada ? group.valorVendaEsperada : null;
  const valorEsperado = valorContrato !== null ? valorContrato : valorVendaEsperada;

  const lucroPrevisto =
    valorEsperado !== null && gastoPlanejado > 0 ? round2(valorEsperado - gastoPlanejado) : null;

  const custoProjetado = round2(custoReal + Math.max(orcamentoRestante, saidasPendentes));
  const lucroProjetado = valorEsperado !== null ? round2(valorEsperado - custoProjetado) : null;

  const situacao = group.situacao || 'EM_ANDAMENTO';
  const valorFechamento = group.valorFechamento != null ? group.valorFechamento : null;
  // Lucro de fechamento: diferente do lucro por avanço (`lucroReconhecido`),
  // não depende de orçamento nem de percentual — a obra acabou, o custo é
  // final, então o lucro é sempre `fechamento − custo`, mesmo que a obra tenha
  // fechado abaixo do orçamento (onde `lucroReconhecido` ficaria menor por
  // causa do avanço < 100%). Vale para os dois tipos de obra.
  const lucroRealizado =
    situacao === 'CONCLUIDO' && valorFechamento !== null
      ? round2(valorFechamento - custoReal)
      : null;

  // Avanço custo-sobre-custo, travado em 100%: estourar o orçamento não
  // significa ter entregue mais obra do que o contrato prevê, e sem o teto a
  // receita reconhecida passaria do valor do contrato.
  const avanco = gastoPlanejado > 0 ? Math.min(custoReal / gastoPlanejado, 1) : null;

  const receitaReconhecida =
    valorContrato !== null && avanco !== null ? round2(valorContrato * avanco) : null;
  const lucroReconhecido =
    receitaReconhecida === null ? null : round2(receitaReconhecida - custoReal);
  const margemPct =
    receitaReconhecida && receitaReconhecida > 0
      ? round2((lucroReconhecido / receitaReconhecida) * 100)
      : null;
  const margemPrevistaPct =
    valorContrato !== null && valorContrato > 0 && gastoPlanejado > 0
      ? round2(((valorContrato - gastoPlanejado) / valorContrato) * 100)
      : null;

  return {
    custoReal,
    totalAportado,
    saldoAtual,
    gastoPlanejado,
    consumidoPct,
    pendencias,

    saidasPendentes: round2(saidasPendentes),
    orcamentoRestante,
    aporteAFazer,
    coberturaPct,

    gastoMedioMensal,
    folegoMeses,
    dataProximoAporte,
    mesEsgotamentoOrcamento,

    tipoObra,
    valorContrato,
    avanco: avanco === null ? null : round2(avanco * 100),
    receitaReconhecida,
    lucroReconhecido,
    margemPct,
    margemPrevistaPct,

    valorVendaEsperada,
    lucroPrevisto,
    custoProjetado,
    lucroProjetado,

    situacao,
    valorFechamento,
    lucroRealizado,
  };
}

/**
 * Ordenação das obras por urgência de aporte, não por nome nem ordem de
 * cadastro: quem precisa de mais dinheiro aparece primeiro; empatado no
 * aporte, quem tem menos fôlego de caixa vem antes. Obra sem fôlego calculável
 * (`null`, sem ritmo de gasto) fica por último dentro do empate.
 *
 * Obra CONCLUIDO sempre vai para o fim da lista, antes de qualquer outro
 * critério: não precisa mais de aporte, então não compete por prioridade com
 * quem ainda está em andamento — mas continua visível.
 */
function compareUrgenciaAporte(a, b) {
  const aConcluida = a.situacao === 'CONCLUIDO';
  const bConcluida = b.situacao === 'CONCLUIDO';
  if (aConcluida !== bConcluida) {
    return aConcluida ? 1 : -1;
  }

  if (b.aporteAFazer !== a.aporteAFazer) {
    return b.aporteAFazer - a.aporteAFazer;
  }
  const folegoA = a.folegoMeses === null || a.folegoMeses === undefined ? Infinity : a.folegoMeses;
  const folegoB = b.folegoMeses === null || b.folegoMeses === undefined ? Infinity : b.folegoMeses;
  return folegoA - folegoB;
}

/**
 * Agrupa `expenses` (já filtradas pelo chamador) por `keyOf(expense)`,
 * somando `amount`, e devolve `[{ nome, valor }]` ordenado do maior para o
 * menor. Usado para as abas de composição do gasto (categoria/fonte/forma de
 * pagamento) da tela Obra.
 */
function buildBreakdown(expenses, keyOf) {
  const totals = new Map();
  expenses.forEach((expense) => {
    const key = keyOf(expense) || 'Não informado';
    totals.set(key, (totals.get(key) || 0) + expense.amount);
  });

  return Array.from(totals.entries())
    .map(([nome, valor]) => ({ nome, valor: round2(valor) }))
    .sort((a, b) => b.valor - a.valor);
}

/**
 * Evolução mensal do gasto: soma `amount` por competência `YYYY-MM`,
 * ordenado cronologicamente.
 */
function buildMonthlyEvolution(expenses) {
  const totals = new Map();
  expenses.forEach((expense) => {
    const dateValue = expense.dataRealizada || expense.date;
    if (!dateValue) {
      return;
    }
    const mes = String(dateValue).slice(0, 7); // YYYY-MM
    totals.set(mes, (totals.get(mes) || 0) + expense.amount);
  });

  return Array.from(totals.entries())
    .map(([mes, valor]) => ({ mes, valor: round2(valor) }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

/**
 * Top fornecedores por total gasto (desc), limitado a `limit`.
 */
function buildTopSuppliers(expenses, limit) {
  const totals = new Map();
  expenses.forEach((expense) => {
    const nome = expense.supplier || 'Não informado';
    const current = totals.get(nome) || { nome, total: 0, count: 0 };
    current.total += expense.amount;
    current.count += 1;
    totals.set(nome, current);
  });

  return Array.from(totals.values())
    .map((entry) => ({ ...entry, total: round2(entry.total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/**
 * Filtra lançamentos realizados cuja `dataRealizada` cai dentro de
 * [from, to] (datas `YYYY-MM-DD`, inclusive nos dois extremos). Sem `from`/
 * `to`, devolve todos os REALIZADOS (nunca os pendentes — só o limite de
 * datas é opcional, o filtro de `isRealizada` não é). Usado só pelos "flows"
 * da tela Obra (composição, evolução) — os blocos de KPI (orçamento/caixa)
 * são acumulados e não passam por aqui.
 */
function filterByPeriod(expenses, from, to) {
  const fromTime = from ? new Date(from).getTime() : -Infinity;
  const toTime = to ? addDaysUTC(new Date(to), 1).getTime() : Infinity; // fim inclusivo

  return expenses.filter((expense) => {
    if (!isRealizada(expense)) {
      return false;
    }
    const realizedAt = new Date(expense.dataRealizada).getTime();
    return realizedAt >= fromTime && realizedAt < toTime;
  });
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function formatRangeLabel(fromKey, toKey) {
  const from = new Date(`${fromKey}T00:00:00Z`);
  const to = new Date(`${toKey}T00:00:00Z`);
  const fromLabel = `${String(from.getUTCDate()).padStart(2, '0')} ${MESES_ABREV[from.getUTCMonth()]}`;
  const toLabel = `${String(to.getUTCDate()).padStart(2, '0')} ${MESES_ABREV[to.getUTCMonth()]} ${to.getUTCFullYear()}`;
  return `${fromLabel} → ${toLabel}`;
}

/**
 * Janela do seletor Mês/Trimestre/Ano/Tudo do Consolidado, sempre terminando
 * em `reference` (hoje, em produção):
 *   mes: 1º dia do mês corrente → hoje.
 *   tri: hoje − 3 meses civis → hoje (janela rolante, mesmo comprimento do
 *        ritmo de gasto — `RITMO_MESES`).
 *   ano: 1º de janeiro do ano corrente → hoje.
 *   tudo: sem início — todo o histórico até hoje. `from: null` é o sentinel
 *         que `filterByPeriod` já trata como -Infinity, então não precisa de
 *         nenhuma outra mudança pra "sem recorte" funcionar.
 */
function resolvePeriodRange(period, reference = startOfTodayUTC()) {
  if (period === 'tudo') {
    return { from: null, to: toDateKey(reference), label: 'Todo o período' };
  }

  let fromDate;
  if (period === 'mes') {
    fromDate = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  } else if (period === 'tri') {
    fromDate = new Date(
      Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - RITMO_MESES, reference.getUTCDate()),
    );
  } else {
    fromDate = new Date(Date.UTC(reference.getUTCFullYear(), 0, 1));
  }

  const from = toDateKey(fromDate);
  const to = toDateKey(reference);
  return { from, to, label: formatRangeLabel(from, to) };
}

/**
 * Janela de mesma duração, imediatamente anterior à de `resolvePeriodRange` —
 * usada só pro delta comparativo do herói ("+18% vs. ano anterior"):
 *   mes: mês civil anterior inteiro.
 *   tri: os 3 meses civis imediatamente antes da janela atual.
 *   ano: ano civil anterior inteiro.
 *
 * Não tem ramo `tudo`: sem início definido não existe "janela anterior de
 * mesma duração" pra comparar. O chamador (`dashboard/summary.js`) não invoca
 * esta função quando `periodo === 'tudo'` — o delta fica `null` direto.
 */
function resolvePreviousPeriodRange(period, reference = startOfTodayUTC()) {
  if (period === 'mes') {
    const prevMonthEnd = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 0));
    const prevMonthStart = new Date(Date.UTC(prevMonthEnd.getUTCFullYear(), prevMonthEnd.getUTCMonth(), 1));
    const from = toDateKey(prevMonthStart);
    const to = toDateKey(prevMonthEnd);
    return { from, to, label: formatRangeLabel(from, to) };
  }

  if (period === 'tri') {
    const { from: currentFromKey } = resolvePeriodRange('tri', reference);
    const currentFrom = new Date(`${currentFromKey}T00:00:00Z`);
    const prevTo = addDaysUTC(currentFrom, -1);
    const prevFrom = new Date(
      Date.UTC(currentFrom.getUTCFullYear(), currentFrom.getUTCMonth() - RITMO_MESES, currentFrom.getUTCDate()),
    );
    const from = toDateKey(prevFrom);
    const to = toDateKey(prevTo);
    return { from, to, label: formatRangeLabel(from, to) };
  }

  const prevYear = reference.getUTCFullYear() - 1;
  const from = toDateKey(new Date(Date.UTC(prevYear, 0, 1)));
  const to = toDateKey(new Date(Date.UTC(prevYear, 11, 31)));
  return { from, to, label: formatRangeLabel(from, to) };
}

module.exports = {
  /**
   * Status é sempre derivado das datas do lançamento, nunca armazenado.
   */
  deriveStatus(expense) {
    if (expense.dataRealizada) {
      return 'REALIZADO';
    }

    const previstaRaw = expense.dataPrevista || expense.date;
    if (previstaRaw && new Date(previstaRaw) < startOfTodayUTC()) {
      return 'ATRASADO';
    }

    return 'PENDENTE';
  },

  startOfTodayUTC,

  isRealizada,
  forecastDate,
  computeGroupMetrics,
  buildBreakdown,
  buildMonthlyEvolution,
  buildTopSuppliers,
  filterByPeriod,
  resolvePeriodRange,
  resolvePreviousPeriodRange,
  round2,

  /**
   * Série mensal (12 meses por padrão, mês corrente cortado em `reference`)
   * de lucro reconhecido acumulado e caixa livre — alimenta o gráfico de
   * tendência do Consolidado. Para cada mês, roda o mesmo pipeline de sempre
   * (`computeProjectPerformance` → `computeResultadoConsolidado`/
   * `computeCaixaConsolidado`) só que sobre as expenses realizadas até o fim
   * daquele mês (`filterByPeriod` sem `from` — cai pra "desde sempre").
   * Independe do seletor Mês/Trimestre/Ano da tela: é sempre os últimos
   * `monthsBack` meses.
   */
  computeTrend(groups, expenses, monthsBack = 12, reference = startOfTodayUTC()) {
    const obras = groups.filter((group) => !group.isPersonal);
    const points = [];

    for (let offset = monthsBack - 1; offset >= 0; offset -= 1) {
      const monthEndCandidate = new Date(
        Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - offset + 1, 0),
      );
      const cutoff = monthEndCandidate.getTime() > reference.getTime() ? reference : monthEndCandidate;
      const expensesUntil = filterByPeriod(expenses, undefined, toDateKey(cutoff));
      const projetos = this.computeProjectPerformance(obras, expensesUntil);
      const resultado = this.computeResultadoConsolidado(projetos);
      const caixa = this.computeCaixaConsolidado(projetos);

      points.push({
        mes: monthKey(reference, -offset),
        lucroReconhecidoAcumulado: resultado.lucroReconhecido,
        caixaLivre: caixa.caixaLivre,
      });
    }

    return points;
  },

  /**
   * Bloco de caixa do Consolidado. Substitui o antigo "score de saúde
   * financeira", que misturava margem e aderência a orçamento num único
   * percentual sem fórmula explicável. Aqui cada número é auditável:
   *
   *   saldoTotal        = Σ saldoAtual das obras
   *   caixaComprometido = Σ max(0, min(orcamentoRestante, saldoAtual))
   *                       O piso em 0 por obra é essencial: sem ele uma obra
   *                       com caixa negativo REDUZIRIA o comprometido e
   *                       inflaria o caixa livre — justamente o número que a
   *                       tela apresenta como o mais honesto.
   *   caixaLivre        = saldoTotal − caixaComprometido
   *   aporteTotalAFazer = Σ aporteAFazer, só de obra com movimento
   *   coberturaCaixaPct = saldoTotal / Σ orcamentoRestante (mesmo recorte) —
   *                       null quando não resta orçamento em obra nenhuma
   *
   * Obra sem nenhum lançamento ainda (nem custo, nem aporte) não entra em
   * `aporteTotalAFazer`/`orcamentoRestanteTotal`: o orçamento dela é só
   * planejamento, ainda não uma necessidade de caixa real — contá-lo faria o
   * consolidado nascer "devendo" no instante em que a obra é criada, antes de
   * qualquer dinheiro ter de fato entrado ou saído. `saldoTotal`/
   * `caixaComprometido` continuam somando todas — são 0 pra essas obras de
   * qualquer forma.
   */
  computeCaixaConsolidado(projetos) {
    let saldoTotal = 0;
    let caixaComprometido = 0;
    let aporteTotalAFazer = 0;
    let orcamentoRestanteTotal = 0;

    projetos.forEach((projeto) => {
      saldoTotal += projeto.saldoAtual;
      caixaComprometido += Math.max(0, Math.min(projeto.orcamentoRestante, projeto.saldoAtual));

      if (projeto.custoReal === 0 && projeto.totalAportado === 0) {
        return;
      }

      aporteTotalAFazer += projeto.aporteAFazer;
      orcamentoRestanteTotal += projeto.orcamentoRestante;
    });

    saldoTotal = round2(saldoTotal);
    caixaComprometido = round2(caixaComprometido);

    return {
      saldoTotal,
      caixaComprometido,
      caixaLivre: round2(saldoTotal - caixaComprometido),
      aporteTotalAFazer: round2(aporteTotalAFazer),
      coberturaCaixaPct:
        orcamentoRestanteTotal > 0 ? round2((saldoTotal / orcamentoRestanteTotal) * 100) : null,
    };
  },

  /**
   * Bloco de resultado do Consolidado, alimentado EXCLUSIVAMENTE por obras de
   * cliente EM_ANDAMENTO com contrato informado — obra própria não gera
   * receita (o dinheiro que entra nela é aporte do próprio dono, e somá-la
   * aqui inventaria lucro) e obra CONCLUIDO não entra mais aqui: o resultado
   * dela já é definitivo e mora só em `computeResultadoRealizado`. Sem esse
   * corte, uma obra concluída apareceria em dois lugares com dois números
   * diferentes (reconhecido por avanço aqui, fechamento ali) — os dois blocos
   * precisam ser mutuamente exclusivos: ativa entra só em "Resultado",
   * concluída entra só em "Lucro realizado".
   *
   * `margemPrevistaPct` é a margem consolidada na conclusão: usa o contrato e
   * o orçamento inteiros, não a parcela já reconhecida.
   */
  computeResultadoConsolidado(projetos) {
    const obrasCliente = projetos.filter(
      (projeto) =>
        projeto.tipoObra === 'CLIENTE' &&
        projeto.situacao === 'EM_ANDAMENTO' &&
        projeto.receitaReconhecida !== null,
    );

    let receitaReconhecida = 0;
    let custoRealizado = 0;
    let valorContratoTotal = 0;
    let orcamentoTotal = 0;

    obrasCliente.forEach((projeto) => {
      receitaReconhecida += projeto.receitaReconhecida;
      custoRealizado += projeto.custoReal;
      valorContratoTotal += projeto.valorContrato;
      orcamentoTotal += projeto.gastoPlanejado || 0;
    });

    receitaReconhecida = round2(receitaReconhecida);
    custoRealizado = round2(custoRealizado);
    const lucroReconhecido = round2(receitaReconhecida - custoRealizado);

    return {
      contratosAtivos: obrasCliente.length,
      receitaReconhecida,
      custoRealizado,
      lucroReconhecido,
      margemPct:
        receitaReconhecida > 0 ? round2((lucroReconhecido / receitaReconhecida) * 100) : null,
      margemPrevistaPct:
        valorContratoTotal > 0 && orcamentoTotal > 0
          ? round2(((valorContratoTotal - orcamentoTotal) / valorContratoTotal) * 100)
          : null,
    };
  },

  /**
   * Bloco de resultado REALIZADO do Consolidado: só obras CONCLUIDO com
   * valor de fechamento informado, dos DOIS tipos (diferente de
   * `computeResultadoConsolidado`, que é só CLIENTE em andamento). O lucro
   * aqui é definitivo — a obra acabou, o custo não muda mais — então não usa
   * avanço nem orçamento, ao contrário do resultado por percentual de
   * conclusão.
   */
  computeResultadoRealizado(projetos) {
    const obrasConcluidas = projetos.filter(
      (projeto) => projeto.situacao === 'CONCLUIDO' && projeto.lucroRealizado !== null,
    );

    let valorFechamentoTotal = 0;
    let custoRealizadoTotal = 0;

    obrasConcluidas.forEach((projeto) => {
      valorFechamentoTotal += projeto.valorFechamento;
      custoRealizadoTotal += projeto.custoReal;
    });

    valorFechamentoTotal = round2(valorFechamentoTotal);
    custoRealizadoTotal = round2(custoRealizadoTotal);
    const lucroRealizadoTotal = round2(valorFechamentoTotal - custoRealizadoTotal);

    return {
      obrasConcluidas: obrasConcluidas.length,
      valorFechamentoTotal,
      custoRealizadoTotal,
      lucroRealizadoTotal,
      margemPct:
        valorFechamentoTotal > 0
          ? round2((lucroRealizadoTotal / valorFechamentoTotal) * 100)
          : null,
    };
  },

  /**
   * Bloco de resultado PROJETADO do Consolidado: obras EM_ANDAMENTO (exclui
   * PLANEJADO — ainda nem começou — e CONCLUIDO — já tem seu próprio bloco de
   * realizado) com valor esperado (contrato de cliente OU venda esperada de
   * obra própria). Diferente de `computeResultadoConsolidado` (percentual de
   * avanço, só CLIENTE): este soma os dois tipos de obra e responde "se tudo
   * sair como planejado, quanto sobra", considerando custo já realizado E já
   * previsto (ver `custoProjetado` em `computeGroupMetrics`).
   */
  computeResultadoProjetado(projetos) {
    const obrasEmAndamento = projetos.filter(
      (projeto) => projeto.situacao === 'EM_ANDAMENTO' && projeto.lucroProjetado !== null,
    );

    let valorEsperadoTotal = 0;
    let custoProjetadoTotal = 0;
    let lucroProjetadoTotal = 0;

    obrasEmAndamento.forEach((projeto) => {
      const valorEsperado =
        projeto.valorContrato !== null ? projeto.valorContrato : projeto.valorVendaEsperada;
      valorEsperadoTotal += valorEsperado;
      custoProjetadoTotal += projeto.custoProjetado;
      lucroProjetadoTotal += projeto.lucroProjetado;
    });

    valorEsperadoTotal = round2(valorEsperadoTotal);
    custoProjetadoTotal = round2(custoProjetadoTotal);
    lucroProjetadoTotal = round2(lucroProjetadoTotal);

    return {
      obrasEmAndamento: obrasEmAndamento.length,
      valorEsperadoTotal,
      custoProjetadoTotal,
      lucroProjetadoTotal,
      margemPct:
        valorEsperadoTotal > 0 ? round2((lucroProjetadoTotal / valorEsperadoTotal) * 100) : null,
    };
  },

  /**
   * Alertas automáticos por projeto (grupo). Alerta é EXCEÇÃO: só o que pede
   * ação sai daqui. O antigo nível `success` ("no prazo e dentro do
   * orçamento") foi removido do backend — esse é o estado esperado, não uma
   * notícia, e o front tinha de filtrá-lo. Regras, em ordem de prioridade:
   *
   *   1. Caixa não cobre o orçamento restante  -> warning (com `valor`)
   *   2. Orçamento em risco: consumiu >= 80% e ainda há saídas previstas
   *                                            -> warning
   *   3. Sem orçamento definido                -> info
   *   4. Caso contrário: nenhum alerta (a obra simplesmente não aparece)
   *
   * `valor` é o que falta em dinheiro naquela obra, para o alerta dizer
   * "faltam R$ X" em vez de só apontar o problema.
   *
   * `consumidoPct` vem de `computeGroupMetrics` — mesmo valor (2 casas) que
   * `computeProjectPerformance` expõe, para o gatilho `>= 80` nunca divergir
   * entre este endpoint e `/projects-performance`.
   */
  buildAlerts(groups, expenses) {
    const expensesByGroup = new Map();
    expenses.forEach((expense) => {
      const list = expensesByGroup.get(expense.groupId) || [];
      list.push(expense);
      expensesByGroup.set(expense.groupId, list);
    });

    // Grupo Pessoal é só registro/controle da própria conta, não um projeto
    // de fato — não faz sentido alertar sobre orçamento dele.
    return groups
      .filter((group) => !group.isPersonal)
      .map((group) => {
        const groupExpenses = expensesByGroup.get(group.id) || [];
        const metrics = computeGroupMetrics(group, groupExpenses);
        const { gastoPlanejado, consumidoPct, pendencias, aporteAFazer, coberturaPct } = metrics;

        // Obra CONCLUIDO está encerrada e congelada (sem novos lançamentos):
        // pendência antiga nunca mais vai ser resolvida nem vale mais como
        // risco, e caixa/orçamento não pedem mais ação. Nada aqui é acionável.
        if (metrics.situacao === 'CONCLUIDO') {
          return null;
        }

        if (gastoPlanejado === 0) {
          return {
            groupId: group.id,
            projeto: group.name,
            nivel: 'info',
            titulo: 'Defina um orçamento',
            mensagem: `${group.name} ainda não tem um orçamento (gasto planejado) definido.`,
            consumidoPct: null,
            valor: null,
          };
        }

        // Obra sem nenhum lançamento ainda não tem nada pra alertar: caixa
        // (R$0) comparado contra o orçamento inteiro dispararia sempre, no
        // instante em que a obra é criada.
        if (isSemMovimento(metrics)) {
          return null;
        }

        if (coberturaPct !== null && coberturaPct < 100 && aporteAFazer > 0) {
          return {
            groupId: group.id,
            projeto: group.name,
            nivel: 'warning',
            titulo: 'Caixa não cobre o orçamento restante',
            mensagem: `O caixa cobre ${Math.round(coberturaPct)}% do que resta do orçamento.`,
            consumidoPct,
            valor: aporteAFazer,
          };
        }

        if (consumidoPct >= 80 && pendencias > 0) {
          return {
            groupId: group.id,
            projeto: group.name,
            nivel: 'warning',
            titulo: 'Orçamento com risco',
            mensagem: `Consumiu ${Math.round(consumidoPct)}% do orçamento, com lançamentos ainda previstos.`,
            consumidoPct,
            valor: null,
          };
        }

        return null;
      })
      .filter(Boolean);
  },

  /**
   * Desempenho por projeto (grupo): saldo atual, custo real, % consumido do
   * orçamento, status contextual e contagem de pendências (saídas ainda não
   * realizadas). Mesmo critério de risco usado em `buildAlerts` — agora
   * sobre o mesmo `consumidoPct` (2 casas) de `computeGroupMetrics`, então os
   * dois endpoints nunca mais discordam perto do limiar de 80%.
   *
   * Status, em ordem de prioridade:
   *   1. sem_movimento: nenhum lançamento realizado (custoReal e
   *      totalAportado zerados) — nada aconteceu ainda, com ou sem
   *      orçamento definido. Evita badge verde "No prazo" para um grupo
   *      (ex.: "Pessoal") que simplesmente não teve nenhuma movimentação.
   *   2. sem_orcamento: teve movimento, mas sem orçamento definido.
   *   3. risco: consumiu >= 80% do orçamento e ainda há pendências.
   *   4. no_prazo: caso contrário.
   */
  computeProjectPerformance(groups, expenses) {
    const expensesByGroup = new Map();
    expenses.forEach((expense) => {
      const list = expensesByGroup.get(expense.groupId) || [];
      list.push(expense);
      expensesByGroup.set(expense.groupId, list);
    });

    return groups
      .map((group) => {
      const groupExpenses = expensesByGroup.get(group.id) || [];
      const metrics = computeGroupMetrics(group, groupExpenses);

      let status = 'no_prazo';
      if (isSemMovimento(metrics)) {
        status = 'sem_movimento';
      } else if (!metrics.gastoPlanejado) {
        status = 'sem_orcamento';
      } else if (metrics.consumidoPct !== null && metrics.consumidoPct >= 80 && metrics.pendencias > 0) {
        status = 'risco';
      }

      return {
        id: group.id,
        nome: group.name,
        saldoAtual: metrics.saldoAtual,
        gastoPlanejado: metrics.gastoPlanejado || null,
        custoReal: metrics.custoReal,
        consumidoPct: metrics.consumidoPct,
        status,
        pendencias: metrics.pendencias,

        tipoObra: metrics.tipoObra,
        valorContrato: metrics.valorContrato,
        totalAportado: metrics.totalAportado,
        saidasPendentes: metrics.saidasPendentes,
        orcamentoRestante: metrics.orcamentoRestante,
        aporteAFazer: metrics.aporteAFazer,
        coberturaPct: metrics.coberturaPct,
        folegoMeses: metrics.folegoMeses,
        avanco: metrics.avanco,
        receitaReconhecida: metrics.receitaReconhecida,
        lucroReconhecido: metrics.lucroReconhecido,
        margemPct: metrics.margemPct,
        margemPrevistaPct: metrics.margemPrevistaPct,

        valorVendaEsperada: metrics.valorVendaEsperada,
        lucroPrevisto: metrics.lucroPrevisto,
        custoProjetado: metrics.custoProjetado,
        lucroProjetado: metrics.lucroProjetado,

        situacao: metrics.situacao,
        valorFechamento: metrics.valorFechamento,
        lucroRealizado: metrics.lucroRealizado,
      };
    })
    .sort(compareUrgenciaAporte);
  },

  compareUrgenciaAporte,
};
