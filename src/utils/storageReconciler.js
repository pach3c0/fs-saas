const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const storage = require('../services/storage');
const logger = require('./logger');

// Reconciliador de storage (Fase 1 — SÓ-MEDE, NÃO bloqueia nada).
//
// Roda 1× por dia: varre o disco real de cada org (getDirSize) e grava o uso
// medido na Subscription. É a FONTE DE VERDADE do medidor — a barra do painel e
// o futuro gate (Fase 2) leem o valor persistido, em vez de varrer o disco a
// cada request.
//
// O backfill acontece de graça: como o safeInterval dispara no boot, a primeira
// execução já preenche `usage.storageBytes/storageQuotaBytes` de TODAS as orgs
// (incl. a real, revelando o uso de fato antes de qualquer gating).
async function reconcileStorage() {
  const orgs = await Organization.find({ deletedAt: null }).select('_id slug').lean();
  const toMB = b => Math.round(b / 1024 / 1024);
  let ok = 0;
  let fail = 0;

  for (const org of orgs) {
    try {
      const b = await storage.getOrgStorageBytes(org._id.toString());
      // upsert:false — orgs sem Subscription não são medidas (o billing cria a
      // sub sob demanda no primeiro acesso). Aqui só atualizamos as existentes.
      const r = await Subscription.findOneAndUpdate(
        { organizationId: org._id },
        {
          $set: {
            'usage.storageBytes': b.total,
            'usage.storageQuotaBytes': b.sessions,
            'usage.storageReconciledAt': new Date()
          }
        },
        { upsert: false }
      );
      if (r) {
        ok++;
        logger.info(`[storageReconciler] ${org.slug}: ${toMB(b.sessions)}MB fotos / ${toMB(b.total)}MB disco`);
      }
    } catch (e) {
      fail++;
      logger.error(`[storageReconciler] Falha na org ${org.slug}: ${e.message}`);
    }
  }

  logger.info(`[storageReconciler] Concluído: ${ok} org(s) medida(s), ${fail} falha(s)`);
}

module.exports = { run: reconcileStorage, reconcileStorage };
