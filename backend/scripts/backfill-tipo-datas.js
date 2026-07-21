/**
 * backfill-tipo-datas.js
 *
 * Backfill ADITIVO e ONE-TIME para o caixa consolidado:
 *   - Expense: tipo='SAIDA', dataRealizada=<date>, dataPrevista=<date>
 *   - ExpenseCategory / ExpenseSource: tipo='SAIDA'
 *
 * Escopo: GLOBAL (todos os tenants/grupos), de propósito — é um backfill
 * histórico único, não uma leitura de request, então NÃO deve ser filtrado
 * por groupId (isso esconderia registros de outros grupos do backfill).
 *
 * NOTA: `sails.load()` já sobe com `migrate: 'alter'` (config/models.js, fora
 * de produção), e o Waterline/sails-mongo aplica os `defaultsTo`/`allowNull`
 * do schema a TODOS os documentos existentes já no load do app — inclusive
 * neste script. Ou seja, ao simplesmente carregar o app, `tipo` já vira
 * 'SAIDA' (default) e `dataPrevista`/`dataRealizada` já viram `null` em cada
 * documento antigo, ANTES de qualquer escrita deste script. Verificado: isso
 * só preenche defaults, não remove nem sobrescreve nenhum campo existente
 * (`date` e os demais permanecem intactos).
 *
 * Por isso o alvo real deste backfill é `dataRealizada: null` (o gap que
 * sobra depois do alter-migration) em vez de `tipo` ausente. Idempotente:
 * expenses reais "previstas" (ainda não realizadas) também têm
 * `dataRealizada: null` por definição — mas como este script roda UMA VEZ,
 * logo após o deploy do schema e antes de existir qualquer ENTRADA/previsto
 * real no sistema, qualquer `dataRealizada: null` neste momento é,
 * por construção, despesa histórica já paga. Rodar de novo depois que
 * lançamentos previstos legítimos existirem NÃO deve ser feito (script é
 * one-time, não re-executar após o primeiro --commit bem-sucedido).
 *
 * Nada é removido, nenhum campo antigo (`date`) é tocado.
 *
 * Uso:
 *   node scripts/backfill-tipo-datas.js            -> DRY RUN (só mostra o que faria)
 *   node scripts/backfill-tipo-datas.js --commit    -> aplica de verdade
 */

process.chdir(__dirname + '/..');
require('dotenv').config();

const sails = require('sails');

const DRY_RUN = !process.argv.includes('--commit');

async function main() {
  await new Promise((resolve, reject) => {
    sails.load({ hooks: { grunt: false }, log: { level: 'warn' } }, (err) => {
      if (err) return reject(err);
      return resolve();
    });
  });

  try {
    const expenseColl = Expense.getDatastore().manager.collection('expenses');
    const categoryColl = ExpenseCategory.getDatastore().manager.collection('expense_categories');
    const sourceColl = ExpenseSource.getDatastore().manager.collection('expense_sources');

    const now = new Date().toISOString();

    // --- Expenses: dataPrevista/dataRealizada a partir de `date` ---
    // (tipo já é 'SAIDA' em todos por default do schema, aplicado no load do
    // app; o gap real que sobra é dataRealizada ainda nula)
    const expensesToBackfill = await expenseColl.find({ dataRealizada: null }).toArray();
    console.log(`[expenses] ${expensesToBackfill.length} documento(s) com dataRealizada nula encontrados.`);

    if (expensesToBackfill.length > 0) {
      console.log('[expenses] amostra (até 3):');
      expensesToBackfill.slice(0, 3).forEach((doc) => {
        console.log(`  _id=${doc._id} date=${doc.date} amount=${doc.amount} tipo=${doc.tipo} -> dataPrevista=${doc.date}, dataRealizada=${doc.date}`);
      });
    }

    if (!DRY_RUN && expensesToBackfill.length > 0) {
      const bulkOps = expensesToBackfill.map((doc) => ({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              dataPrevista: doc.date,
              dataRealizada: doc.date,
              updatedAt: now,
            },
          },
        },
      }));
      const result = await expenseColl.bulkWrite(bulkOps);
      console.log(`[expenses] atualizados: ${result.modifiedCount}`);
    }

    // --- ExpenseCategory: tipo = SAIDA ---
    const categoriesToBackfill = await categoryColl.find({ tipo: { $exists: false } }).toArray();
    console.log(`[expense_categories] ${categoriesToBackfill.length} documento(s) sem "tipo" encontrados.`);
    if (!DRY_RUN && categoriesToBackfill.length > 0) {
      const result = await categoryColl.updateMany(
        { tipo: { $exists: false } },
        { $set: { tipo: 'SAIDA', updatedAt: now } },
      );
      console.log(`[expense_categories] atualizados: ${result.modifiedCount}`);
    }

    // --- ExpenseSource: tipo = SAIDA ---
    const sourcesToBackfill = await sourceColl.find({ tipo: { $exists: false } }).toArray();
    console.log(`[expense_sources] ${sourcesToBackfill.length} documento(s) sem "tipo" encontrados.`);
    if (!DRY_RUN && sourcesToBackfill.length > 0) {
      const result = await sourceColl.updateMany(
        { tipo: { $exists: false } },
        { $set: { tipo: 'SAIDA', updatedAt: now } },
      );
      console.log(`[expense_sources] atualizados: ${result.modifiedCount}`);
    }

    if (DRY_RUN) {
      console.log('\nDRY RUN — nada foi escrito. Rode com --commit para aplicar.');
    } else {
      console.log('\nBackfill aplicado.');
    }
  } finally {
    await new Promise((resolve) => sails.lower(resolve));
  }
}

main().catch((err) => {
  console.error('Backfill falhou:', err);
  process.exitCode = 1;
});
