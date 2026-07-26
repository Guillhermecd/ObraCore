/**
 * seed-demo-obras.js
 *
 * Recria o conjunto de obras de demonstração do usuário guiilhermecd@gmail.com
 * depois da perda de dados causada por um restart-storm do nodemon durante
 * troca de branch com `migrate: 'alter'` (ver backend/config/models.js).
 *
 * Cria 7 obras, com datas de início espalhadas de meados de 2025 até hoje,
 * 4 já CONCLUIDO e 3 EM_ANDAMENTO, cada uma com categorias/fontes próprias e
 * uma série de lançamentos (custo + receita/aporte) cobrindo sua vida útil.
 *
 * Escopo: só o grupo Pessoal do usuário é preservado — as 5 obras órfãs
 * antigas (ids que sumiram da base mas ainda constam em user.groupIds) são
 * removidas da lista antes de gravar os 7 novos ids.
 *
 * Uso:
 *   node scripts/seed-demo-obras.js            -> DRY RUN (só mostra o que faria)
 *   node scripts/seed-demo-obras.js --commit    -> aplica de verdade
 */

process.chdir(__dirname + '/..');
require('dotenv').config();

const sails = require('sails');

const DRY_RUN = !process.argv.includes('--commit');
const USER_EMAIL = 'guiilhermecd@gmail.com';
const TODAY = new Date('2026-07-26T12:00:00.000Z');

const PAYMENT_METHODS = ['PIX', 'Boleto', 'Transferência', 'Cartão de Crédito'];

function iso(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toISOString();
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function monthsBetween(start, end) {
  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth())
  );
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// --- Definição das 7 obras -------------------------------------------------
const OBRAS = [
  {
    name: 'Reforma Comercial - Loja Centro',
    tipoObra: 'CLIENTE',
    situacao: 'CONCLUIDO',
    start: iso(2025, 6, 10),
    end: iso(2025, 11, 30),
    plannedSpending: 150000,
    valorContrato: 180000,
    valorFechamento: 185000,
    custoRealPct: 0.94, // fração do plannedSpending efetivamente gasta
    entradaPct: 1.0, // fração do valorFechamento recebida (obra concluída = tudo recebido)
    risco: false,
  },
  {
    name: 'Residência Alto da Boa Vista',
    tipoObra: 'CLIENTE',
    situacao: 'CONCLUIDO',
    start: iso(2025, 7, 1),
    end: iso(2026, 1, 15),
    plannedSpending: 280000,
    valorContrato: 320000,
    valorFechamento: 315000,
    custoRealPct: 0.92,
    entradaPct: 1.0,
    risco: false,
  },
  {
    name: 'Galpão Industrial Zona Sul',
    tipoObra: 'CLIENTE',
    situacao: 'CONCLUIDO',
    start: iso(2025, 8, 15),
    end: iso(2026, 3, 20),
    plannedSpending: 480000,
    valorContrato: 540000,
    valorFechamento: 560000,
    custoRealPct: 0.96,
    entradaPct: 1.0,
    risco: false,
  },
  {
    name: 'Casa Própria - Vila Nova',
    tipoObra: 'PROPRIA',
    situacao: 'CONCLUIDO',
    start: iso(2025, 9, 1),
    end: iso(2026, 5, 10),
    plannedSpending: 200000,
    valorVendaEsperada: 260000,
    valorFechamento: 255000,
    custoRealPct: 0.9,
    entradaPct: 1.0,
    risco: false,
  },
  {
    name: 'Reforma Apartamento - Bairro Jardins',
    tipoObra: 'CLIENTE',
    situacao: 'EM_ANDAMENTO',
    start: iso(2025, 11, 1),
    end: null,
    plannedSpending: 90000,
    valorContrato: 95000,
    valorFechamento: null,
    custoRealPct: null, // obra em andamento: calculado pelo avanço no tempo
    duracaoEstimadaMeses: 12,
    entradaPct: null,
    risco: true, // caixa não cobre o orçamento restante (mesmo cenário de alerta de antes)
  },
  {
    name: 'Edifício Comercial Vista Norte',
    tipoObra: 'CLIENTE',
    situacao: 'EM_ANDAMENTO',
    start: iso(2026, 2, 1),
    end: null,
    plannedSpending: 520000,
    valorContrato: 610000,
    valorFechamento: null,
    custoRealPct: null,
    duracaoEstimadaMeses: 18,
    entradaPct: null,
    risco: false,
  },
  {
    name: 'Sobrado Jardim das Flores',
    tipoObra: 'PROPRIA',
    situacao: 'EM_ANDAMENTO',
    start: iso(2026, 4, 1),
    end: null,
    plannedSpending: 300000,
    valorVendaEsperada: 340000,
    valorFechamento: null,
    custoRealPct: null,
    duracaoEstimadaMeses: 10,
    entradaPct: null,
    risco: false,
  },
];

async function main() {
  await new Promise((resolve, reject) => {
    sails.load({ hooks: { grunt: false }, log: { level: 'warn' } }, (err) => {
      if (err) return reject(err);
      return resolve();
    });
  });

  try {
    const user = await User.findOne({ email: USER_EMAIL });
    if (!user) {
      throw new Error(`Usuário ${USER_EMAIL} não encontrado.`);
    }

    const existingGroups = await Group.find({ id: { in: user.groupIds } });
    const existingIds = new Set(existingGroups.map((g) => g.id));
    const orphanIds = user.groupIds.filter((id) => !existingIds.has(id));
    const personalGroup = existingGroups.find((g) => g.isPersonal);

    console.log(`[user] ${user.email} (${user.id})`);
    console.log(`[user] groupIds órfãos a remover: ${JSON.stringify(orphanIds)}`);
    console.log(`[user] grupo pessoal preservado: ${personalGroup ? personalGroup.id : 'NENHUM'}`);

    const plan = [];
    let totalCategories = 0;
    let totalSources = 0;
    let totalExpenses = 0;

    for (const obra of OBRAS) {
      const startDate = new Date(obra.start);
      const endDate = obra.end ? new Date(obra.end) : TODAY;
      // Meses já decorridos (start -> hoje/fim) — usado pra gerar as parcelas
      // já lançadas. Para obra em andamento isso é sempre igual a
      // `monthsBetween(startDate, TODAY)`, então NÃO pode dobrar como
      // denominador do avanço (colapsaria em elapsed/elapsed = 1 sempre —
      // foi exatamente o bug da primeira versão deste script).
      const totalMonths = Math.max(monthsBetween(startDate, endDate), 1);
      const mesesDecorridos = monthsBetween(startDate, TODAY);

      const custoRealPct =
        obra.custoRealPct !== null
          ? obra.custoRealPct
          : Math.min(Math.max(mesesDecorridos / obra.duracaoEstimadaMeses, 0.1), 0.95);

      const custoRealAlvo = round2(obra.plannedSpending * custoRealPct);

      const expenses = [];
      // --- Custos (SAIDA): uma parcela por mês, do início até o fim/hoje ---
      for (let m = 0; m < totalMonths; m += 1) {
        const parcela = round2(custoRealAlvo / totalMonths);
        const dueDate = addMonths(startDate, m);
        const isFuture = dueDate.getTime() > TODAY.getTime();
        expenses.push({
          tipo: 'SAIDA',
          amount: parcela,
          date: dueDate.toISOString(),
          dataPrevista: dueDate.toISOString(),
          dataRealizada: isFuture ? null : dueDate.toISOString(),
          categoryName: 'Material e mão de obra',
          paymentMethodIdx: m % PAYMENT_METHODS.length,
          notes: 'Etapa mensal de execução',
        });
      }

      // Uma ou duas saídas ainda pendentes pra obra em andamento (previsão
      // próxima, ainda não paga) — só faz sentido pra quem não tem `end`.
      if (!obra.end) {
        const proximaData = addMonths(TODAY, 1);
        expenses.push({
          tipo: 'SAIDA',
          amount: round2(obra.plannedSpending * 0.03),
          date: proximaData.toISOString(),
          dataPrevista: proximaData.toISOString(),
          dataRealizada: null,
          categoryName: 'Material e mão de obra',
          paymentMethodIdx: 0,
          notes: 'Próxima etapa prevista',
        });
      }

      // --- Receita/Aporte (ENTRADA) ---
      const valorBase = obra.tipoObra === 'CLIENTE' ? obra.valorContrato : obra.valorVendaEsperada;
      const entradaPct =
        obra.entradaPct !== null
          ? obra.entradaPct
          : obra.risco
            ? custoRealPct * 0.55 // obra de risco: recebe bem menos do que gasta
            : custoRealPct * 0.98; // demais em andamento: quase acompanha o custo

      const entradaAlvo = round2(valorBase * entradaPct);
      const entradaCategoryName = obra.tipoObra === 'CLIENTE' ? 'Recebimento do cliente' : 'Aporte do proprietário';

      // Parcelas de entrada acompanhando o mesmo calendário mensal do custo,
      // mas nunca antes do 2º mês (cliente/proprietário paga depois de ver
      // etapa executada).
      const entradaMonths = Math.max(totalMonths - 1, 1);
      for (let m = 1; m <= entradaMonths; m += 1) {
        const parcela = round2(entradaAlvo / entradaMonths);
        const dueDate = addMonths(startDate, m);
        const isFuture = dueDate.getTime() > TODAY.getTime();
        if (isFuture) continue; // recebimento futuro: não lança ainda
        expenses.push({
          tipo: 'ENTRADA',
          amount: parcela,
          date: dueDate.toISOString(),
          dataPrevista: dueDate.toISOString(),
          dataRealizada: dueDate.toISOString(),
          categoryName: entradaCategoryName,
          paymentMethodIdx: m % PAYMENT_METHODS.length,
          notes: obra.tipoObra === 'CLIENTE' ? 'Medição aprovada' : 'Aporte de capital',
        });
      }

      totalCategories += 2; // 1 categoria de custo + 1 de entrada
      totalSources += 1;
      totalExpenses += expenses.length;

      plan.push({ obra, expenses, entradaCategoryName });
    }

    console.log(
      `\n[plano] ${OBRAS.length} obras, ${totalCategories} categorias, ${totalSources} fontes, ${totalExpenses} lançamentos.`,
    );
    plan.forEach(({ obra, expenses }) => {
      const custoTotal = round2(
        expenses.filter((e) => e.tipo === 'SAIDA' && e.dataRealizada).reduce((s, e) => s + e.amount, 0),
      );
      const entradaTotal = round2(
        expenses.filter((e) => e.tipo === 'ENTRADA' && e.dataRealizada).reduce((s, e) => s + e.amount, 0),
      );
      console.log(
        `  - ${obra.name} [${obra.tipoObra}/${obra.situacao}] ${expenses.length} lançamentos — custo realizado ${custoTotal} / entrada realizada ${entradaTotal}`,
      );
    });

    if (DRY_RUN) {
      console.log('\nDRY RUN — nada foi escrito. Rode com --commit para aplicar.');
      return;
    }

    // --- Aplicar de verdade -------------------------------------------------
    const newGroupIds = [];

    for (const { obra, expenses, entradaCategoryName } of plan) {
      const groupValues = {
        name: obra.name,
        owner: user.id,
        isPersonal: false,
        tipoObra: obra.tipoObra,
        situacao: obra.situacao,
        plannedSpending: obra.plannedSpending,
        plannedSpendingHistory: [
          {
            value: obra.plannedSpending,
            previousValue: 0,
            changedBy: user.id,
            changedByName: user.name,
            changedAt: obra.start,
          },
        ],
      };
      if (obra.tipoObra === 'CLIENTE') {
        groupValues.valorContrato = obra.valorContrato;
      } else {
        groupValues.valorVendaEsperada = obra.valorVendaEsperada;
      }
      if (obra.valorFechamento) {
        groupValues.valorFechamento = obra.valorFechamento;
      }

      const group = await Group.create(groupValues).fetch();
      newGroupIds.push(group.id);

      const custoCategory = await ExpenseCategory.create({
        name: 'Material e mão de obra',
        owner: user.id,
        groupId: group.id,
        tipo: 'SAIDA',
      }).fetch();
      const entradaCategory = await ExpenseCategory.create({
        name: entradaCategoryName,
        owner: user.id,
        groupId: group.id,
        tipo: 'ENTRADA',
      }).fetch();
      const source = await ExpenseSource.create({
        name: 'Conta da obra',
        owner: user.id,
        groupId: group.id,
        tipo: 'AMBOS',
      }).fetch();

      const expenseRows = expenses.map((e) => ({
        date: e.date,
        categoryId: e.tipo === 'SAIDA' ? custoCategory.id : entradaCategory.id,
        sourceId: source.id,
        supplier: null,
        paymentMethod: PAYMENT_METHODS[e.paymentMethodIdx],
        amount: e.amount,
        notes: e.notes,
        comprovante: null,
        owner: user.id,
        groupId: group.id,
        tipo: e.tipo,
        dataPrevista: e.dataPrevista,
        dataRealizada: e.dataRealizada,
      }));
      for (const row of expenseRows) {
        await Expense.create(row);
      }

      console.log(`[criado] ${obra.name} -> ${group.id} (${expenseRows.length} lançamentos)`);
    }

    const finalGroupIds = personalGroup ? [personalGroup.id, ...newGroupIds] : newGroupIds;
    await User.updateOne({ id: user.id }).set({ groupIds: finalGroupIds });
    console.log(`\n[user] groupIds atualizado: ${JSON.stringify(finalGroupIds)}`);
    console.log('\nSeed aplicado com sucesso.');
  } finally {
    await new Promise((resolve) => sails.lower(resolve));
  }
}

main().catch((err) => {
  console.error('Seed falhou:', err);
  process.exitCode = 1;
});
