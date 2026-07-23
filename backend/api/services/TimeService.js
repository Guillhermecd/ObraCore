module.exports = {
  /**
   * Timestamp ISO 8601 do momento atual — usado pelos hooks `beforeCreate`/
   * `beforeUpdate` de todos os models para `createdAt`/`updatedAt`. Fonte
   * única (antes copiada em cada model) para evitar divergência de formato.
   */
  nowIso() {
    return new Date().toISOString();
  },
};
