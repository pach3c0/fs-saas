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
    const baseDomain = process.env.BASE_DOMAIN || 'fsfotografias.com.br';
    const ownerSlug = process.env.OWNER_SLUG || 'fs';

    let slug = null;

    // Desenvolvimento: permitir query parameter ?_tenant=xxx
    if (process.env.NODE_ENV === 'development' || host.includes('localhost')) {
      slug = req.query._tenant || ownerSlug;
    } else {
      // Produção: extrair do subdomínio
      // joao.fsfotografias.com.br → slug = 'joao'
      // fsfotografias.com.br → slug = ownerSlug (domínio principal)
      
      // Remover porta se existir
      const hostWithoutPort = host.split(':')[0];
      
      if (hostWithoutPort === baseDomain || hostWithoutPort === `www.${baseDomain}`) {
        // Domínio principal: usar slug do dono
        slug = ownerSlug;
      } else if (hostWithoutPort.endsWith(`.${baseDomain}`)) {
        // Subdomínio: extrair slug
        slug = hostWithoutPort.replace(`.${baseDomain}`, '');
      } else {
        // Domínio desconhecido: usar owner slug como fallback
        slug = ownerSlug;
      }
    }

    // Verificar cache
    const cacheKey = `org:${slug}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      req.organization = cached.org;
      req.organizationId = cached.org._id;
      return next();
    }

    // Buscar organização no banco
    const org = await Organization.findOne({ slug: slug.toLowerCase(), isActive: true }).lean();
    if (!org) {
      return res.status(404).json({ 
        error: 'Organização não encontrada',
        slug,
        hint: 'Verifique se o subdomínio está correto ou se a organização está ativa'
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

module.exports = { resolveTenant };
