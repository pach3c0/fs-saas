// Permissões por-módulo do membro (Slice 2). FONTE ÚNICA da lista de "funções" (módulos)
// e da resolução da permissão efetiva. Modelo inspirado no Controle de Acesso do Rhyno
// (Role.permissions como dict de flags), mas adaptado à escala do CliqueZoom:
//   • por-USUÁRIO (o dono personaliza por pessoa na aba Equipe) — não por cargo;
//   • por-MÓDULO/aba (1 flag por área) — não por ação (ver/criar/editar/excluir).
// Dono/superadmin = imune (tudo liberado), igual ao bypass `all`/slug do ERP1.
// A UI de checkboxes espelha MODULES em admin/js/tabs/equipe.js. O front é cosmético; a
// cerca dura é server-side (middleware requirePermission). Ver src/routes/team.js.

// Registro dos módulos (grupos p/ a UI). `default` = estado de um membro NOVO.
const MODULES = [
  // Operacional (padrão ON) — o dia a dia do operador.
  { key: 'sessoes',       label: 'Sessões',            group: 'Operacional',      default: true },
  { key: 'clientes',      label: 'Clientes',           group: 'Operacional',      default: true },
  { key: 'mensagens',     label: 'Mensagens',          group: 'Operacional',      default: true },
  { key: 'crm',           label: 'CRM / Gestão',       group: 'Operacional',      default: true },
  // Site & Marketing (padrão OFF) — presença digital do negócio.
  { key: 'meu_site',      label: 'Meu Site',           group: 'Site & Marketing', default: false },
  { key: 'marketing',     label: 'Marketing',          group: 'Site & Marketing', default: false },
  { key: 'integracoes',   label: 'Integrações',        group: 'Site & Marketing', default: false },
  { key: 'marca_dagua',   label: "Marca d'água",       group: 'Site & Marketing', default: false },
  // Conta & Negócio (padrão OFF — sensível: dinheiro, identidade, time).
  { key: 'plano',         label: 'Plano / Cobrança',   group: 'Conta & Negócio',  default: false },
  { key: 'dominio',       label: 'Domínio',            group: 'Conta & Negócio',  default: false },
  { key: 'equipe',        label: 'Equipe',             group: 'Conta & Negócio',  default: false },
  { key: 'configuracoes', label: 'Configurações',      group: 'Conta & Negócio',  default: false },
  { key: 'perfil',        label: 'Perfil do negócio',  group: 'Conta & Negócio',  default: false },
];

const MODULE_KEYS = MODULES.map((m) => m.key);
const DEFAULTS = Object.freeze(Object.fromEntries(MODULES.map((m) => [m.key, m.default])));

function isOwnerRole(user) {
  return !!user && (user.role === 'admin' || user.role === 'superadmin');
}

// Converte o `permissions` do User (Map do Mongoose num doc completo OU objeto num .lean())
// num objeto plano { chave: bool }.
function rawPerms(user) {
  const p = user && user.permissions;
  if (!p) return {};
  if (p instanceof Map) return Object.fromEntries(p);
  return { ...p };
}

// Permissão EFETIVA: dono = tudo true; senão baseline (DEFAULTS) + overrides do membro.
// Chave ausente/inválida cai no padrão do módulo (nunca trava por campo faltando → membro
// legado sem o campo herda o baseline "Operador" automaticamente, sem backfill).
function effectivePerms(user) {
  if (isOwnerRole(user)) {
    return Object.fromEntries(MODULE_KEYS.map((k) => [k, true]));
  }
  const raw = rawPerms(user);
  const out = {};
  for (const k of MODULE_KEYS) {
    out[k] = (raw[k] === true || raw[k] === false) ? raw[k] : DEFAULTS[k];
  }
  return out;
}

// Membro pode `key`? Dono sempre; senão a permissão efetiva precisa ser true.
function can(user, key) {
  if (isOwnerRole(user)) return true;
  return effectivePerms(user)[key] === true;
}

// Sanitiza um objeto de permissões vindo do cliente: só chaves conhecidas, só booleanos.
function sanitizePerms(input) {
  const out = {};
  if (input && typeof input === 'object') {
    for (const k of MODULE_KEYS) {
      if (typeof input[k] === 'boolean') out[k] = input[k];
    }
  }
  return out;
}

module.exports = { MODULES, MODULE_KEYS, DEFAULTS, effectivePerms, can, sanitizePerms, isOwnerRole };
