module.exports = {
  /**
   * Timestamp ISO 8601 do momento atual — usado pelos hooks `beforeCreate`/
   * `beforeUpdate` de todos os models para `createdAt`/`updatedAt`. Fonte
   * única (antes copiada em cada model) para evitar divergência de formato.
   */
  nowIso() {
    return new Date().toISOString();
  },

  /**
   * Seta `createdAt`/`updatedAt` com o mesmo timestamp — chamado pelo
   * `beforeCreate` de todos os models. Extraído porque o par de campos, e não
   * só o valor de `nowIso()`, era o que se repetia idêntico em cada hook.
   */
  applyCreateTimestamps(valuesToSet) {
    const timestamp = this.nowIso();
    valuesToSet.createdAt = timestamp;
    valuesToSet.updatedAt = timestamp;
  },

  /** Seta só `updatedAt` — chamado pelo `beforeUpdate` de todos os models. */
  applyUpdateTimestamp(valuesToSet) {
    valuesToSet.updatedAt = this.nowIso();
  },
};
