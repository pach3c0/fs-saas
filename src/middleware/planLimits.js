const Subscription = require('../models/Subscription');
const { effectiveStorageMB, effectiveLimits } = require('../services/subscriptionPricing');

async function checkLimit(req, res, next) {
  try {
    let sub = await Subscription.findOne({ organizationId: req.user.organizationId });
    if (!sub) {
      // Criar subscription free automático se não existir
      sub = new Subscription({
        organizationId: req.user.organizationId,
        plan: 'free',
        status: 'active'
      });
      await sub.save();
    }

    req.subscription = sub;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Os limites de contagem usam effectiveLimits (deriva de plans.js) — não o
// sub.limits gravado, que pode estar defasado e reativar caps por engano. No
// modelo atual todos os planos têm -1 (ilimitado), então isto é um no-op de fato;
// fica como guarda caso algum override custom defina um teto.
async function checkSessionLimit(req, res, next) {
  const sub = req.subscription;
  const max = effectiveLimits(sub).maxSessions;
  if (max !== -1 && sub.usage.sessions >= max) {
    return res.status(403).json({
      error: 'Limite de sessões atingido',
      upgrade: true,
      currentPlan: sub.plan
    });
  }
  next();
}

async function checkPhotoLimit(req, res, next) {
  const sub = req.subscription;
  const max = effectiveLimits(sub).maxPhotos;
  if (max !== -1 && sub.usage.photos >= max) {
    return res.status(403).json({
      error: 'Limite de fotos atingido',
      upgrade: true
    });
  }
  next();
}

async function checkAlbumLimit(req, res, next) {
  const sub = req.subscription;
  const max = effectiveLimits(sub).maxAlbums;
  if (max !== -1 && sub.usage.albums >= max) {
    return res.status(403).json({
      error: 'Limite de álbuns atingido',
      upgrade: true
    });
  }
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// GATE DE STORAGE (Fase 2). Recusa um NOVO upload de foto de sessão quando o uso
// medido + o tamanho do upload que está chegando ultrapassaria o limite efetivo
// do plano. NUNCA deleta nada — só barra o que ainda não foi gravado.
//
// Rollout seguro (conta real de produção já em uso):
//   • Só BLOQUEIA com STORAGE_GATE_ENFORCE=true. Sem a flag (default) roda em modo
//     "medir e avisar": loga o que bloquearia e deixa passar. Ligar/desligar a flag
//     é o rollback instantâneo, sem redeploy.
//   • limitBytes <= 0 = ILIMITADO (ex.: override com maxStorage = -1) → nunca barra.
//     É a isenção explícita para contas grandes já existentes.
//   • Qualquer erro interno → deixa passar (falha aberta): o gate jamais derruba um
//     upload legítimo por um bug próprio.
//
// Conservador por desenho: usa o Content-Length (tamanho que CHEGA, antes de gerar
// thumb/deletar original nos modos de seleção), então pode barrar um pouco antes do
// real — o reconciliador diário corrige o medidor para o tamanho efetivo no disco.
async function checkStorageGate(req, res, next) {
  try {
    let sub = req.subscription;
    if (!sub) {
      const organizationId = req.user?.organizationId || req.organizationId;
      if (organizationId) sub = await Subscription.findOne({ organizationId });
    }
    if (!sub) return next(); // sem assinatura → não barra (seguro)

    // Congelamento comercial pós-reembolso (Fase 2): trava deliberada de NOVOS uploads,
    // independente da quota — diferente do gate de storage e SEM depender de STORAGE_GATE_ENFORCE.
    // Só cliente comum chega congelado (protegida/override/cortesia nunca são congeladas no revert).
    if (sub.storageFrozen) {
      req.logger?.info?.(`[storageGate] upload bloqueado (conta congelada pós-reembolso) org ${sub.organizationId}`);
      return res.status(403).json({
        code: 'STORAGE_FROZEN',
        error: 'Conta congelada após reembolso',
        message: 'Sua conta está temporariamente congelada após o reembolso. Assine um plano para voltar a enviar fotos.',
        upgrade: true
      });
    }

    const usedBytes = sub.usage?.storageQuotaBytes || 0;
    const limitBytes = effectiveStorageMB(sub) * 1024 * 1024;
    if (!(limitBytes > 0)) return next(); // ilimitado / sem limite configurado

    const incomingBytes = Number(req.headers['content-length'] || 0);
    if (usedBytes + incomingBytes <= limitBytes) return next();

    const usedMB = Math.round(usedBytes / 1048576);
    const limitMB = Math.round(limitBytes / 1048576);
    const enforce = process.env.STORAGE_GATE_ENFORCE === 'true';

    if (!enforce) {
      // Modo escuro: mede e avisa, não bloqueia.
      req.logger?.warn?.(`[storageGate] (modo medir) BLOQUEARIA org ${sub.organizationId}: ${usedMB}MB + ${Math.round(incomingBytes / 1048576)}MB chegando > ${limitMB}MB`);
      return next();
    }

    req.logger?.info?.(`[storageGate] bloqueado org ${sub.organizationId}: ${usedMB}/${limitMB}MB`);
    return res.status(403).json({
      code: 'STORAGE_FULL',
      error: 'Armazenamento cheio',
      message: `Seu armazenamento está cheio (${usedMB} MB de ${limitMB} MB). Libere espaço apagando fotos antigas ou aumente seu plano para continuar enviando.`,
      upgrade: true,
      usedMB,
      limitMB
    });
  } catch (error) {
    // Falha do gate não pode quebrar upload — falha aberta.
    req.logger?.error?.(`[storageGate] erro, deixando passar: ${error.message}`);
    next();
  }
}

module.exports = { checkLimit, checkSessionLimit, checkPhotoLimit, checkAlbumLimit, checkStorageGate };