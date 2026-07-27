/**
 * Troca o papel de um colaborador. MASTER não é atribuível: ele vem de
 * `group.owner` e mudar de dono é outra operação.
 */
module.exports = async function updateMemberRole(req, res) {
  const group = await Group.findOne({ id: req.params.id });

  if (!group || !sails.services.groupservice.isMember(req.userRecord, group.id)) {
    return res.status(404).json({ message: 'Grupo não encontrado.' });
  }

  const { userId } = req.params;
  const { role } = req.body;

  if (role !== 'ADMIN' && role !== 'FISCAL') {
    return res.badRequest({ message: 'Papel inválido.' });
  }

  const permission = sails.services.groupservice.assertCanActOnMember(group, req.user.id, userId);
  if (permission.error) {
    return res.status(403).json({ message: permission.error });
  }

  // Um ADMIN gerencia fiscais, mas promover alguém a ADMIN cria um par seu que
  // ele não poderia mais rebaixar — essa porta fica só com o dono.
  if (role === 'ADMIN' && sails.services.groupservice.roleOf(group, req.user.id) !== 'MASTER') {
    return res.status(403).json({
      message: 'Apenas o criador da obra pode promover um colaborador a administrador.',
    });
  }

  await sails.services.groupservice.setMemberRole(group, userId, role);

  return res.json({ message: 'Papel atualizado.', role });
};
