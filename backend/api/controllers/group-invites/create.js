module.exports = async function create(req, res) {
  const { groupId, email, role } = req.body;

  if (!groupId || !email || !email.trim()) {
    return res.badRequest({ message: 'Grupo e e-mail são obrigatórios.' });
  }

  const normalizedRole = role === undefined ? 'FISCAL' : role;
  if (normalizedRole !== 'ADMIN' && normalizedRole !== 'FISCAL') {
    return res.badRequest({ message: 'Papel inválido.' });
  }

  const group = await Group.findOne({ id: groupId });

  if (!group || !sails.services.groupservice.isMember(req.userRecord, group.id)) {
    return res.status(404).json({ message: 'Grupo não encontrado.' });
  }

  if (!sails.services.groupservice.can(group, req.user.id, 'invite')) {
    return res.status(403).json({ message: 'Você não tem permissão para convidar colaboradores.' });
  }

  // Mesma regra de `update-member-role`: quem não é dono não cria um par que
  // depois não poderia rebaixar.
  if (
    normalizedRole === 'ADMIN' &&
    sails.services.groupservice.roleOf(group, req.user.id) !== 'MASTER'
  ) {
    return res.status(403).json({
      message: 'Apenas o criador da obra pode convidar um administrador.',
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const invitee = await User.findOne({ email: normalizedEmail });

  if (!invitee) {
    return res.status(404).json({ message: 'Não existe usuário cadastrado com este e-mail.' });
  }

  if (invitee.id === req.user.id) {
    return res.badRequest({ message: 'Você já participa deste grupo.' });
  }

  const memberIds = Array.isArray(group.memberIds) ? group.memberIds : [];
  if (memberIds.includes(invitee.id)) {
    return res.status(409).json({ message: 'Este usuário já é membro do grupo.' });
  }

  const existingInvite = await GroupInvite.findOne({
    groupId: group.id,
    inviteeId: invitee.id,
    status: 'pending',
  });

  if (existingInvite) {
    return res.status(409).json({ message: 'Já existe um convite pendente para este usuário.' });
  }

  const invite = await GroupInvite.create({
    groupId: group.id,
    inviterId: req.user.id,
    inviteeId: invitee.id,
    inviteeEmail: normalizedEmail,
    role: normalizedRole,
  }).fetch();

  await sails.services.emailservice.sendMail({
    to: invitee.email,
    subject: `Convite para o grupo "${group.name}"`,
    text: `Olá${invitee.name ? `, ${invitee.name}` : ''}.\n\n${
      req.user.name || req.user.email
    } convidou você para participar do grupo "${group.name}". Acesse o sistema para aceitar ou recusar o convite.`,
  });

  return res.status(201).json({
    invite: {
      id: invite.id,
      groupId: invite.groupId,
      groupName: group.name,
      inviteeEmail: invite.inviteeEmail,
      role: invite.role,
      status: invite.status,
      createdAt: invite.createdAt,
    },
  });
};
