module.exports.models = {
  schema: true,
  // 'alter' derruba e recria cada coleção com schema divergente a cada lift
  // (drop -> reinsert a partir dos docs lidos antes de derrubar). Com
  // nodemon reiniciando em cascata (ex.: troca de git branch tocando muitos
  // arquivos de uma vez), um restart pode matar o processo bem no meio dessa
  // janela — a coleção fica derrubada sem o reinsert completo, perdendo
  // documentos inteiros (não só campos). Mongo é schemaless: 'safe' não
  // aplica nenhuma migração automática, então atributos novos do model
  // (ex.: `dataRealizada`) simplesmente não existem nos docs antigos até
  // serem escritos — sem risco de perda. Mudanças de schema em dev passam a
  // exigir um script explícito (ver backend/scripts/backfill-tipo-datas.js).
  migrate: 'safe',
  attributes: {
    id: { type: 'string', columnName: '_id' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
  dataEncryptionKeys: {
    default: process.env.DATA_ENCRYPTION_KEY || 'p/o8X2uJ0mvlWsrV6pp4wCLBEA/tGJLoQ+D3IML+Hy8=',
  },
  cascadeOnDestroy: true,
};
