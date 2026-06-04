// Helpers compartilhados entre os motores de venda (salesAutomator e postDeliveryAutomator).

// Rótulos amigáveis por tipo de evento (para a variável {evento}).
const EVENT_LABELS = {
  casamento: 'casamento', aniversario: 'aniversário', formatura: 'formatura',
  corporativo: 'evento', show: 'show', ensaio: 'ensaio', gestante: 'ensaio gestante',
  newborn: 'ensaio newborn', debutante: 'aniversário de 15 anos', batizado: 'batizado', outro: 'ensaio'
};

function firstName(name) {
  return String(name || '').split(' ')[0] || '';
}

// Código de cupom estável por (sessão, sufixo de gatilho).
function gerarCouponCode(prefix, sessionId, suffix) {
  const id6 = String(sessionId).slice(-6).toUpperCase();
  const safePrefix = (prefix || 'CZ').replace(/[^A-Z0-9]/gi, '').toUpperCase() || 'CZ';
  return `${safePrefix}-${id6}-${suffix}`;
}

// Substitui as variáveis do template de mensagem de venda.
// Variáveis: {nome} {negocio} {evento} {fotos_restantes} {dias} {cupom} {desconto} {preco_extra} {link}
function applyScarcityVars(tpl, vars = {}) {
  const map = {
    nome: vars.nome ?? '',
    negocio: vars.negocio ?? '',
    evento: vars.evento ?? '',
    fotos_restantes: vars.fotos_restantes ?? '',
    dias: vars.dias ?? '',
    cupom: vars.cupom ?? '',
    desconto: vars.desconto ?? '',
    preco_extra: vars.preco_extra ?? '',
    link: vars.link ?? ''
  };
  return String(tpl || '').replace(/\{(\w+)\}/g, (m, key) =>
    Object.prototype.hasOwnProperty.call(map, key) ? String(map[key]) : m
  );
}

module.exports = { EVENT_LABELS, firstName, gerarCouponCode, applyScarcityVars };
