// Orgs PROTEGIDAS: nunca podem ser suspensas/excluídas automaticamente e exigem
// confirmação reforçada em ações manuais (desativar/lixeira). São as contas que
// não podem cair sem querer (fotógrafa em produção, sócios, etc.).
//
// Fonte = variáveis de ambiente (regra do projeto: nunca hardcodar slugs):
//   • PROTECTED_ORG_SLUGS = lista separada por vírgula (ex.: "daviconecta,rhynoproject")
//   • OWNER_SLUG          = slug da org dona/principal (entra automaticamente)
function protectedSlugs() {
  const list = (process.env.PROTECTED_ORG_SLUGS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  const owner = (process.env.OWNER_SLUG || '').trim().toLowerCase();
  if (owner) list.push(owner);
  return [...new Set(list)];
}

function isProtectedSlug(slug) {
  if (!slug) return false;
  return protectedSlugs().includes(String(slug).toLowerCase());
}

module.exports = { protectedSlugs, isProtectedSlug };
