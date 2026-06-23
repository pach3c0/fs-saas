// Validação de slug do tenant (vira o subdomínio <slug>.cliquezoom.com.br).
//
// Trava de segurança: o slug é usado como rótulo DNS. Um rótulo inválido
// (ex.: começando com hífen) gera um hostname que NENHUM certificado cobre,
// e o navegador mostra "Esta Conexão Não É Privada" — foi o que aconteceu com
// o slug "-daviconecta". Por isso aqui bloqueamos pontuação, espaços, acentos,
// emojis/ícones, hífen no começo/fim, hífen duplo e nomes reservados.

// Começa e termina em letra/número; no meio aceita letra, número e hífen.
// O tamanho (3–63) é checado à parte para dar mensagens claras.
const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

const MIN_LEN = 3;
const MAX_LEN = 63;

// Subdomínios da plataforma e nomes sensíveis — não podem virar slug de tenant.
const RESERVED_SLUGS = new Set([
  'www', 'admin', 'superadmin', 'api', 'app', 'mail', 'email', 'smtp', 'imap',
  'ftp', 'ssh', 'ns1', 'ns2', 'dns', 'cdn', 'static', 'assets', 'img', 'images',
  'beta', 'staging', 'dev', 'test', 'hub', 'erp', 'crm', 'license', 'saas',
  'painel', 'dashboard', 'suporte', 'support', 'ajuda', 'help', 'status',
  'cliente', 'clientes', 'site', 'blog', 'loja', 'pay', 'pagamento', 'checkout',
  'root', 'sistema', 'system', 'null', 'undefined', 'cliquezoom',
]);

// Normaliza para comparação/armazenamento: minúsculas, sem espaços nas pontas.
function normalizeSlug(raw) {
  return String(raw == null ? '' : raw).trim().toLowerCase();
}

// Valida o slug. Retorna { ok: true, slug } (normalizado) ou { ok: false, error }.
function validateSlug(raw) {
  const slug = normalizeSlug(raw);
  if (!slug) {
    return { ok: false, error: 'Informe o endereço do seu site.' };
  }
  if (slug.length < MIN_LEN) {
    return { ok: false, error: `O endereço deve ter ao menos ${MIN_LEN} caracteres.` };
  }
  if (slug.length > MAX_LEN) {
    return { ok: false, error: `O endereço deve ter no máximo ${MAX_LEN} caracteres.` };
  }
  if (!SLUG_REGEX.test(slug)) {
    return {
      ok: false,
      error: 'Use apenas letras minúsculas, números e hifens. Não pode começar ou terminar com hífen, nem conter espaços, pontuação, acentos ou emojis.',
    };
  }
  if (slug.includes('--')) {
    return { ok: false, error: 'O endereço não pode ter dois hifens seguidos.' };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, error: 'Esse endereço é reservado pelo sistema. Escolha outro.' };
  }
  return { ok: true, slug };
}

module.exports = { validateSlug, normalizeSlug, RESERVED_SLUGS, SLUG_REGEX, MIN_LEN, MAX_LEN };
