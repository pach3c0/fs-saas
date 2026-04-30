const Organization = require('../models/Organization');

// Cache simples: Map com TTL de 5 minutos
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos em ms

function clearExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

// Limpar cache a cada 1 minuto
setInterval(clearExpiredCache, 60 * 1000);

// Extrai slug do subdomínio e resolve Organization
async function resolveTenant(req, res, next) {
  try {
    const host = req.get('host') || '';
    const baseDomain = (process.env.BASE_DOMAIN || 'cliquezoom.com.br').trim();
    const ownerSlug = (process.env.OWNER_SLUG || 'fs').trim();

    const hostWithoutPort = host.split(':')[0];
    let query = null;
    const isPreview = req.query._preview === '1';

    if (isPreview || process.env.NODE_ENV === 'development' || host.includes('localhost')) {
      const slug = req.query._tenant || ownerSlug;
      query = { slug: slug.toLowerCase() };
    } else {
      // Produção: extrair do subdomínio ou domínio customizado
      if (hostWithoutPort === baseDomain || hostWithoutPort === `www.${baseDomain}`) {
        // Domínio principal: usar slug do dono
        query = { slug: ownerSlug.toLowerCase() };
      } else if (hostWithoutPort.endsWith(`.${baseDomain}`)) {
        // Subdomínio: extrair slug
        const subdomain = hostWithoutPort.replace(`.${baseDomain}`, '');
        query = { slug: subdomain.toLowerCase() };
      } else {
        // Domínio customizado: buscar pelo campo customDomain
        query = { customDomain: hostWithoutPort.toLowerCase() };
      }
    }

    // Identificador único para o cache baseado na query
    const cacheKey = query.slug ? `slug:${query.slug}` : `domain:${query.customDomain}`;

    // Verificar cache (não cachear em preview para sempre ter dados frescos)
    if (!isPreview) {
      const cached = cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        req.organization = cached.org;
        req.organizationId = cached.org._id;
        return next();
      }
    }

    // Buscar organização no banco (preview ignora isActive para permitir edição)
    const dbQuery = isPreview ? query : { ...query, isActive: true };
    const org = await Organization.findOne(dbQuery).lean();
    if (!org && query.customDomain) {
      // Fallback para ownerSlug se for domínio customizado não encontrado
      // (evita quebrar o servidor se o DNS apontar mas o domínio não estiver no banco)
      const fallbackOrg = await Organization.findOne({ slug: ownerSlug.toLowerCase(), isActive: true }).lean();
      if (fallbackOrg) {
        req.organization = fallbackOrg;
        req.organizationId = fallbackOrg._id;
        return next();
      }
    }

    if (!org) {
      return res.status(404).json({ 
        error: 'Organização não encontrada',
        query,
        hint: 'Verifique se o domínio/subdomínio está correto ou se a organização está ativa'
      });
    }

    // Salvar no cache
    cache.set(cacheKey, {
      org,
      timestamp: Date.now()
    });

    // Adicionar ao request
    req.organization = org;
    req.organizationId = org._id;
    
    next();
  } catch (error) {
    console.error('Erro no middleware de tenant:', error);
    res.status(500).json({ error: 'Erro ao resolver organização' });
  }
}

function clearOrgCache(slug) {
  if (slug) cache.delete(`org:${slug.toLowerCase()}`);
}

module.exports = { resolveTenant, clearOrgCache };
