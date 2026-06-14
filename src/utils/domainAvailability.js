// Verificação de disponibilidade de domínio via RDAP (substituto moderno do WHOIS).
// RDAP é HTTP/JSON e gratuito — não exige conta de reseller.
//   .br  → https://rdap.registro.br/domain/<dominio>
//   demais TLDs → https://rdap.org/domain/<dominio> (redirecionador IANA bootstrap)
// Interpretação: HTTP 200 = registrado (indisponível), 404 = disponível, resto/timeout = não verificado.
//
// Ressalva honesta: RDAP diz "registrado ou não", não garante a compra naquele preço
// (premium/pendentes). A UI deixa claro que é disponibilidade aproximada.

// Extensões oferecidas por padrão (configurável). Mais relevantes para fotógrafos no Brasil.
const DEFAULT_TLDS = ['com.br', 'com', 'fot.br', 'photography'];

// Estimativa de preço por extensão (display-only, R$/ano). Marcado como estimativa na UI.
const PRICE_ESTIMATES = {
  'com.br': 'R$ 40/ano',
  'fot.br': 'R$ 40/ano',
  'com': 'R$ 60/ano',
  'photography': 'R$ 180/ano'
};

const RDAP_TIMEOUT_MS = 4000;

// Monta a URL RDAP correta: registro.br para .br, rdap.org (bootstrap IANA) para o resto.
function rdapUrlFor(domain, tld) {
  if (tld.endsWith('br')) {
    return `https://rdap.registro.br/domain/${domain}`;
  }
  return `https://rdap.org/domain/${domain}`;
}

// Consulta um único domínio. Retorna 'available' | 'taken' | 'unknown'.
async function checkOne(baseName, tld) {
  const domain = `${baseName}.${tld}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RDAP_TIMEOUT_MS);
  try {
    const resp = await fetch(rdapUrlFor(domain, tld), {
      headers: { Accept: 'application/rdap+json' },
      signal: controller.signal,
      redirect: 'follow'
    });
    let status;
    if (resp.status === 200) status = 'taken';
    else if (resp.status === 404) status = 'available';
    else status = 'unknown';
    return { domain, tld, status };
  } catch (error) {
    // timeout (abort), DNS, rede → não verificado
    return { domain, tld, status: 'unknown' };
  } finally {
    clearTimeout(timer);
  }
}

// Roda todos os TLDs em paralelo. Nunca rejeita — cada falha vira 'unknown'.
async function checkAvailability(baseName, tlds = DEFAULT_TLDS) {
  const results = await Promise.allSettled(tlds.map(tld => checkOne(baseName, tld)));
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { domain: `${baseName}.${tlds[i]}`, tld: tlds[i], status: 'unknown' }
  );
}

module.exports = { checkAvailability, DEFAULT_TLDS, PRICE_ESTIMATES };
