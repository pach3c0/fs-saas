const Subscription = require('../models/Subscription');

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

async function checkSessionLimit(req, res, next) {
  const sub = req.subscription;
  if (sub.limits.maxSessions !== -1 && sub.usage.sessions >= sub.limits.maxSessions) {
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
  if (sub.limits.maxPhotos !== -1 && sub.usage.photos >= sub.limits.maxPhotos) {
    return res.status(403).json({
      error: 'Limite de fotos atingido',
      upgrade: true
    });
  }
  next();
}

async function checkAlbumLimit(req, res, next) {
  const sub = req.subscription;
  if (sub.limits.maxAlbums !== -1 && sub.usage.albums >= sub.limits.maxAlbums) {
    return res.status(403).json({
      error: 'Limite de álbuns atingido',
      upgrade: true
    });
  }
  next();
}

module.exports = { checkLimit, checkSessionLimit, checkPhotoLimit, checkAlbumLimit };