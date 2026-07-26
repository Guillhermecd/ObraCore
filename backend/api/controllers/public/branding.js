/**
 * Endpoint público (sem autenticação) consultado pelo frontend antes do
 * login para resolver a identidade visual do tenant a partir do
 * subdomínio. Ausência de `tenant` ou doc não encontrado => branding null,
 * o que o frontend interpreta como "usar o default OAKSD da plataforma".
 */
module.exports = async function branding(req, res) {
  const tenantKey = typeof req.query.tenant === 'string' ? req.query.tenant.trim().toLowerCase() : '';

  res.set('Cache-Control', 'public, max-age=60');

  if (!tenantKey) {
    return res.json({ branding: null });
  }

  const brandingDoc = await Branding.findOne({ key: tenantKey });

  return res.json({ branding: brandingDoc || null });
};
