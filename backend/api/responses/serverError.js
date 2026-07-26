const { randomUUID } = require('crypto');

/**
 * 500 (Server Error) — substitui o default do Sails.
 *
 * O default, em produção, faz `res.sendStatus(500)`: corpo vazio. O frontend
 * cai no texto genérico ("Não foi possível concluir a operação.") e ninguém
 * consegue ligar o que o usuário viu ao que está no log.
 *
 * Aqui todo 500 sai com um `requestId` curto que também vai para o log. O
 * usuário lê o código na tela, e `grep` nesse código acha o stack. A mensagem
 * continua genérica de propósito — detalhe de erro interno não vira resposta
 * HTTP, em nenhum ambiente.
 *
 * Sails chama isto sozinho quando algo lança numa policy ou action, então vale
 * para os 46 controllers sem precisar de try/catch em nenhum.
 */
module.exports = function serverError(data) {
  const req = this.req;
  const res = this.res;
  const sails = req._sails;

  // 8 hex bastam para achar no log de um dia e cabem numa tela — o usuário
  // consegue ler o código por telefone.
  const requestId = randomUUID().replace(/-/g, '').slice(0, 8);

  sails.log.error(
    `[${requestId}] ${req.method} ${req.url} — 500:`,
    (data && data.stack) || data,
  );

  return res.status(500).json({
    message: 'Erro interno no servidor. Se o problema continuar, informe o código abaixo.',
    requestId,
  });
};
