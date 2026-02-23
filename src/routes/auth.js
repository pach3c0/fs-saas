const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const { sendWelcomeEmail, sendApprovalEmail } = require('../utils/email');

// Login com email + senha (novo) ou senha legada (compatibilidade)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const secret = process.env.JWT_SECRET || 'cliquezoom-secret-key';

    // Novo fluxo: login por email
    if (email) {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return res.status(401).json({ success: false, error: 'Usuário não encontrado' });
      }

      // Verificar senha
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Senha incorreta' });
      }

      // Verificar se usuário está aprovado
      if (!user.approved) {
        return res.status(403).json({ success: false, error: 'Conta aguardando aprovação' });
      }

      // Verificar se organização está ativa
      const org = await Organization.findById(user.organizationId);
      if (!org || !org.isActive) {
        return res.status(403).json({ success: false, error: 'Organização inativa' });
      }

      // Gerar JWT com userId, organizationId e role
      const token = jwt.sign(
        { 
          userId: user._id,
          organizationId: user.organizationId,
          role: user.role 
        },
        secret,
        { expiresIn: '7d' }
      );

      return res.json({ 
        success: true, 
        token,
        organizationId: user.organizationId.toString(),
        role: user.role
      });
    }

    // Fluxo legado: login só com senha (manter temporariamente)
    if (password && !email) {
      const passwordHash = process.env.ADMIN_PASSWORD_HASH;
      const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

      let isValid = false;
      if (passwordHash) {
        isValid = await bcrypt.compare(password, passwordHash);
      } else {
        isValid = password === adminPass;
      }

      if (isValid) {
        // Buscar superadmin para retornar organizationId
        const superadmin = await User.findOne({ role: 'superadmin' });
        if (superadmin) {
          const token = jwt.sign(
            { 
              userId: superadmin._id,
              organizationId: superadmin.organizationId,
              role: 'superadmin' 
            },
            secret,
            { expiresIn: '7d' }
          );
          return res.json({ 
            success: true, 
            token,
            organizationId: superadmin.organizationId.toString(),
            role: 'superadmin'
          });
        }
        
        // Fallback: buscar org pelo slug do owner
        const ownerSlug = process.env.OWNER_SLUG || 'fs';
        const ownerOrg = await Organization.findOne({ slug: ownerSlug });
        if (ownerOrg) {
          const token = jwt.sign(
            { userId: null, organizationId: ownerOrg._id, role: 'superadmin' },
            secret,
            { expiresIn: '7d' }
          );
          return res.json({ success: true, token, organizationId: ownerOrg._id.toString(), role: 'superadmin' });
        }
        // Ultimo fallback: sem org (servidor precisa da migracao)
        return res.status(500).json({ success: false, error: 'Execute a migração primeiro: node src/scripts/migrate-to-multitenancy.js' });
      }
      
      return res.status(401).json({ success: false, error: 'Senha incorreta' });
    }

    res.status(400).json({ success: false, error: 'Email ou senha não fornecidos' });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// Registro self-service (cria org + user pendentes de aprovação)
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name, orgName, slug } = req.body;

    // Validações
    if (!email || !password || !name || !orgName || !slug) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Validar formato do slug
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Slug deve conter apenas letras minúsculas, números e hifens' });
    }

    // Verificar se email já existe
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    // Verificar se slug já existe
    const existingOrg = await Organization.findOne({ slug: slug.toLowerCase().trim() });
    if (existingOrg) {
      return res.status(409).json({ error: 'Slug já está em uso' });
    }

    // Criar organização (inativa)
    const org = await Organization.create({
      name: orgName,
      slug: slug.toLowerCase().trim(),
      isActive: false,
      plan: 'free'
    });

    // Criar usuário (não aprovado)
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      name,
      role: 'admin',
      organizationId: org._id,
      approved: false
    });

    // Atualizar ownerId da org
    org.ownerId = user._id;
    await org.save();

    // Criar Subscription no plano Free
    await Subscription.create({
      organizationId: org._id,
      plan: 'free',
      status: 'active',
      limits: {
        maxSessions: 5,
        maxPhotos: 100,
        maxAlbums: 1,
        maxStorage: 500,
        customDomain: false
      },
      usage: { sessions: 0, photos: 0, albums: 0, storage: 0 }
    });

    // Enviar email de boas-vindas (async, nao bloqueia resposta)
    sendWelcomeEmail(user.email, user.name, org.slug).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Cadastro realizado! Aguarde a aprovação do administrador.',
      organizationSlug: org.slug
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno ao criar cadastro' });
  }
});

// Verificar token
router.post('/auth/verify', (req, res) => {
  const { token } = req.body;
  if (!token) return res.json({ valid: false });
  const secret = process.env.JWT_SECRET || 'cliquezoom-secret-key';
  jwt.verify(token, secret, (err) => {
    if (err) return res.json({ valid: false });
    res.json({ valid: true });
  });
});

// ============================================================================
// ROTAS DE ADMINISTRAÇÃO DE ORGANIZAÇÕES (superadmin only)
// ============================================================================

// Listar todas as organizações com métricas
router.get('/admin/organizations', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const Session = require('../models/Session');

    const organizations = await Organization.find({ deletedAt: null })
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Buscar contagem de sessões por org em uma query
    const sessionCounts = await Session.aggregate([
      { $group: { _id: '$organizationId', count: { $sum: 1 }, photos: { $sum: { $size: '$photos' } } } }
    ]);
    const countMap = {};
    sessionCounts.forEach(s => { countMap[s._id?.toString()] = { sessions: s.count, photos: s.photos }; });

    const orgsWithStats = organizations.map(org => ({
      ...org,
      stats: countMap[org._id.toString()] || { sessions: 0, photos: 0 }
    }));

    res.json({ organizations: orgsWithStats });
  } catch (error) {
    console.error('Erro ao listar organizações:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar organizações na lixeira (DEVE ficar antes das rotas com :id)
router.get('/admin/organizations/trash', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const organizations = await Organization.find({ deletedAt: { $ne: null } })
      .populate('ownerId', 'name email')
      .sort({ deletedAt: -1 })
      .lean();

    res.json({ organizations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aprovar organização (ativa org e aprova users)
router.put('/admin/organizations/:id/approve', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // Ativar organização
    org.isActive = true;
    await org.save();

    // Aprovar todos os usuários da organização
    await User.updateMany(
      { organizationId: org._id },
      { approved: true }
    );

    // Enviar email de aprovação para o owner
    const owner = await User.findById(org.ownerId);
    if (owner) {
      sendApprovalEmail(owner.email, owner.name, org.slug).catch(() => {});
    }

    res.json({
      success: true,
      message: `Organização "${org.name}" aprovada com sucesso!`
    });
  } catch (error) {
    console.error('Erro ao aprovar organização:', error);
    res.status(500).json({ error: error.message });
  }
});

// Métricas gerais do SaaS
router.get('/admin/saas/metrics', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const Session = require('../models/Session');
    const Notification = require('../models/Notification');
    const Newsletter = require('../models/Newsletter');

    const [totalOrgs, activeOrgs, totalUsers, totalSessions, totalPhotos, totalNewsletterSubs, planGroups] = await Promise.all([
      Organization.countDocuments(),
      Organization.countDocuments({ isActive: true }),
      User.countDocuments(),
      Session.countDocuments(),
      Session.aggregate([{ $project: { count: { $size: '$photos' } } }, { $group: { _id: null, total: { $sum: '$count' } } }]),
      Newsletter.countDocuments(),
      Organization.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }])
    ]);

    const byPlan = {};
    planGroups.forEach(g => { byPlan[g._id] = g.count; });

    res.json({
      organizations: { total: totalOrgs, active: activeOrgs, pending: totalOrgs - activeOrgs, byPlan },
      users: totalUsers,
      sessions: totalSessions,
      photos: totalPhotos[0]?.total || 0,
      newsletterSubs: totalNewsletterSubs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Detalhes de uma organização específica
router.get('/admin/organizations/:id/details', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const Session = require('../models/Session');
    const Newsletter = require('../models/Newsletter');
    const fs = require('fs');
    const path = require('path');

    const org = await Organization.findById(req.params.id).populate('ownerId', 'name email');
    if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

    const users = await User.find({ organizationId: org._id }).select('name email role approved createdAt');
    const sessions = await Session.find({ organizationId: org._id }).select('name type mode selectionStatus photos createdAt');
    const newsletterCount = await Newsletter.countDocuments({ organizationId: org._id });

    // Calcular storage usado
    let storageBytes = 0;
    const orgUploadDir = path.join(__dirname, '../../uploads', org._id.toString());
    function calcDirSize(dir) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) calcDirSize(fullPath);
        else storageBytes += fs.statSync(fullPath).size;
      }
    }
    calcDirSize(orgUploadDir);

    const totalPhotos = sessions.reduce((sum, s) => sum + (s.photos?.length || 0), 0);

    res.json({
      organization: org,
      users,
      stats: {
        sessions: sessions.length,
        photos: totalPhotos,
        newsletterSubs: newsletterCount,
        storageMB: Math.round(storageBytes / 1024 / 1024 * 100) / 100
      },
      recentSessions: sessions.slice(0, 10).map(s => ({
        name: s.name,
        type: s.type,
        mode: s.mode,
        status: s.selectionStatus,
        photosCount: s.photos?.length || 0,
        createdAt: s.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mover organização para lixeira (soft delete)
router.put('/admin/organizations/:id/trash', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

    org.isActive = false;
    org.deletedAt = new Date();
    await org.save();

    res.json({ success: true, message: `"${org.name}" movida para a lixeira` });
  } catch (error) {
    console.error('Erro ao mover para lixeira:', error);
    res.status(500).json({ error: error.message });
  }
});

// Restaurar organização da lixeira
router.put('/admin/organizations/:id/restore', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

    org.isActive = true;
    org.deletedAt = null;
    await org.save();

    await User.updateMany({ organizationId: org._id }, { approved: true });

    res.json({ success: true, message: `"${org.name}" restaurada com sucesso` });
  } catch (error) {
    console.error('Erro ao restaurar:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete definitivo (apaga TUDO da organização)
router.delete('/admin/organizations/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

    // Segurança: só permite deletar orgs na lixeira
    if (!org.deletedAt) {
      return res.status(400).json({ error: 'Mova para a lixeira antes de excluir definitivamente' });
    }

    const orgId = org._id;
    const Session = require('../models/Session');
    const SiteData = require('../models/SiteData');
    const Notification = require('../models/Notification');
    const Newsletter = require('../models/Newsletter');
    const fs = require('fs');
    const path = require('path');

    // Deletar todos os dados do banco
    await Promise.all([
      User.deleteMany({ organizationId: orgId }),
      SiteData.deleteMany({ organizationId: orgId }),
      Session.deleteMany({ organizationId: orgId }),
      Notification.deleteMany({ organizationId: orgId }),
      Newsletter.deleteMany({ organizationId: orgId })
    ]);

    // Deletar pasta de uploads
    const uploadDir = path.join(__dirname, '../../uploads', orgId.toString());
    if (fs.existsSync(uploadDir)) {
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }

    // Deletar a organização
    await Organization.findByIdAndDelete(orgId);

    res.json({ success: true, message: `"${org.name}" excluída definitivamente` });
  } catch (error) {
    console.error('Erro ao excluir definitivamente:', error);
    res.status(500).json({ error: error.message });
  }
});

// Desativar organização
router.put('/admin/organizations/:id/deactivate', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    org.isActive = false;
    await org.save();

    res.json({
      success: true,
      message: `Organização "${org.name}" desativada`
    });
  } catch (error) {
    console.error('Erro ao desativar organização:', error);
    res.status(500).json({ error: error.message });
  }
});

// Forçar troca de plano
router.put('/admin/organizations/:id/plan', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { plan } = req.body;
    const PLAN_LIMITS = {
      free:  { maxSessions: 5,   maxPhotos: 100,  maxAlbums: 1,  maxStorage: 500,   customDomain: false },
      basic: { maxSessions: 50,  maxPhotos: 5000, maxAlbums: 10, maxStorage: 10000, customDomain: false },
      pro:   { maxSessions: -1,  maxPhotos: -1,   maxAlbums: -1, maxStorage: 50000, customDomain: true  }
    };

    if (!PLAN_LIMITS[plan]) {
      return res.status(400).json({ error: 'Plano inválido. Use: free, basic ou pro' });
    }

    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

    org.plan = plan;
    await org.save();

    await Subscription.findOneAndUpdate(
      { organizationId: org._id },
      { plan, limits: PLAN_LIMITS[plan] }
    );

    res.json({ success: true, message: `Plano de "${org.name}" alterado para ${plan}` });
  } catch (error) {
    console.error('Erro ao alterar plano:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
