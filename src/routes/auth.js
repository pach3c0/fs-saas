const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const plans = require('../models/plans');
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const { checkHoneyPot } = require('../middleware/security');
const { sendWelcomeEmail, sendApprovalEmail, sendPasswordResetEmail, sendNewPhotographerNotificationEmail } = require('../utils/email');
const { applyDefaultTemplate } = require('./site');
const { trackEvent } = require('../utils/activityTracker');
const { provisionRhynoTenant } = require('../utils/rhynoProvision');
const { validateSlug } = require('../utils/slug');
const { effectivePerms } = require('../services/memberPermissions');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' });
    }

    const secret = process.env.JWT_SECRET || 'fs-fotografias-secret-key';

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      req.logger.warn(`Tentativa de login: E-mail não encontrado: ${email}`);
      return res.status(401).json({ success: false, error: 'E-mail não cadastrado' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      req.logger.warn(`Tentativa de login: Senha incorreta para e-mail: ${email}`);
      return res.status(401).json({ success: false, error: 'Senha incorreta' });
    }

    if (!user.approved) {
      return res.status(403).json({ success: false, error: 'Conta desativada. Entre em contato com o suporte.' });
    }

    const org = await Organization.findById(user.organizationId);
    if (!org || !org.isActive) {
      return res.status(403).json({ success: false, error: 'Conta desativada. Entre em contato com o suporte.' });
    }

    const token = jwt.sign(
      { userId: user._id, organizationId: user.organizationId, role: user.role },
      secret,
      { expiresIn: '7d' }
    );

    // Track login event (fire-and-forget)
    trackEvent(user.organizationId, user._id, 'login');

    return res.json({
      success: true,
      token,
      organizationId: user.organizationId.toString(),
      role: user.role
    });
  } catch (error) {
    req.logger.error(`Erro crítico no login: ${error.message}`, { stack: error.stack });
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// Solicitar recuperação de senha
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Sempre retorna 200 para não revelar se o e-mail existe
    if (!user) return res.json({ success: true });

    const secret = process.env.JWT_SECRET || 'fs-fotografias-secret-key';
    const token = jwt.sign({ userId: user._id, purpose: 'reset' }, secret, { expiresIn: '1h' });

    const baseUrl = process.env.BASE_URL || 'https://app.cliquezoom.com.br';
    const resetUrl = `${baseUrl}/admin/?reset=${token}`;

    sendPasswordResetEmail(user.email, user.name, resetUrl).catch(() => { });

    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro no forgot-password:', { message: error.message });
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Redefinir senha com token
router.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token e senha são obrigatórios' });
    if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });

    const secret = process.env.JWT_SECRET || 'fs-fotografias-secret-key';
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      return res.status(400).json({ error: 'Link inválido ou expirado' });
    }

    if (payload.purpose !== 'reset') {
      return res.status(400).json({ error: 'Token inválido' });
    }

    // Convites de equipe carregam `pv` (fingerprint da senha ATUAL) para serem SINGLE-USE:
    // após o 1º uso a senha muda, o fingerprint deixa de bater e o link morre (não é
    // replayável). Tokens de reset comum não têm `pv` → comportamento inalterado.
    // Ver src/routes/team.js (POST /team/:id/invite).
    if (payload.pv) {
      const u = await User.findById(payload.userId).select('passwordHash').lean();
      const pv = u ? crypto.createHash('sha256').update(String(u.passwordHash)).digest('hex').slice(0, 16) : null;
      if (!u || pv !== payload.pv) {
        return res.status(400).json({ error: 'Link inválido ou já utilizado' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(payload.userId, { passwordHash });

    res.json({ success: true, message: 'Senha redefinida com sucesso' });
  } catch (error) {
    req.logger.error('Erro no reset-password:', { message: error.message });
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Registro self-service (cria org + user já ativos)
router.post('/auth/register', checkHoneyPot, async (req, res) => {
  try {
    const { email, password, name, orgName, slug, whatsapp } = req.body;

    if (!email || !password || !name || !orgName || !slug) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Trava de segurança: rejeita hífen no começo/fim, espaços, pontuação,
    // acentos, emojis e nomes reservados (ver src/utils/slug.js).
    const slugCheck = validateSlug(slug);
    if (!slugCheck.ok) {
      return res.status(400).json({ error: slugCheck.error });
    }
    const cleanSlug = slugCheck.slug;

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    const existingOrg = await Organization.findOne({ slug: cleanSlug });
    if (existingOrg) {
      return res.status(409).json({ error: 'Slug já está em uso' });
    }

    const org = await Organization.create({
      name: orgName,
      slug: cleanSlug,
      isActive: true,
      plan: 'free',
      // WhatsApp é opcional no cadastro (item 8): se não vier, fica vazio e o
      // gatilho suave no painel pede o número depois de algumas sessões criadas.
      whatsapp: (whatsapp || '').trim()
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      name,
      role: 'admin',
      organizationId: org._id,
      approved: true
    });

    org.ownerId = user._id;
    await org.save();

    await Subscription.create({
      organizationId: org._id,
      plan: 'free',
      status: 'active',
      limits: { ...plans.free.limits },  // fonte única: models/plans.js
      usage: { sessions: 0, photos: 0, albums: 0, storage: 0 }
    });

    applyDefaultTemplate(org._id).catch(() => { });
    // Provisiona o tenant Rhyno (aba Gestão via SSO) sem bloquear o cadastro.
    // Falha → org fica fail-closed (Gestão 409) até um retry/backfill.
    provisionRhynoTenant(org, user).catch((err) =>
      req.logger.error('Falha ao provisionar tenant Rhyno no cadastro', {
        org: org.slug, error: err.message,
      }));
    sendWelcomeEmail(user.email, user.name, org.slug).catch(() => { });
    sendNewPhotographerNotificationEmail(user.name, user.email, org.slug).catch(() => { });

    res.status(201).json({
      success: true,
      message: 'Cadastro realizado! Acesse seu painel com o e-mail e senha cadastrados.',
      organizationSlug: org.slug
    });
  } catch (error) {
    req.logger.error('Erro no registro', { error: error.message });
    res.status(500).json({ error: 'Erro interno ao criar cadastro' });
  }
});

// Verificar disponibilidade de slug
router.get('/auth/check-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) return res.status(400).json({ error: 'Slug é obrigatório' });

    // Primeiro valida o formato (mesma trava do cadastro) — slug inválido
    // nunca está "disponível".
    const slugCheck = validateSlug(slug);
    if (!slugCheck.ok) {
      return res.json({ success: true, available: false, valid: false, message: slugCheck.error });
    }

    const existingOrg = await Organization.findOne({ slug: slugCheck.slug });
    res.json({
      success: true,
      available: !existingOrg,
      valid: true,
      message: existingOrg ? 'Slug já está em uso' : 'Disponível'
    });
  } catch (error) {
    req.logger.error('Erro ao verificar slug', { error: error.message });
    res.status(500).json({ error: 'Erro ao verificar slug' });
  }
});

// GET /api/auth/me — identidade + permissões EFETIVAS do usuário logado (Slice 2). O admin
// usa `permissions`/`isOwner` para esconder as abas fora do papel (cosmético; a cerca dura
// é server-side). Lê do DB → reflete mudança de permissão sem re-login.
router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('name email role permissions').lean();
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    const isOwner = user.role === 'admin' || user.role === 'superadmin';
    res.json({
      success: true,
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      isOwner,
      permissions: effectivePerms(user),
    });
  } catch (error) {
    req.logger.error('Erro no /auth/me', { message: error.message });
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/auth/me/password — o próprio usuário troca a senha (self). Valida a senha atual.
// Membro convidado usa isto na aba "Minha conta"; o dono também pode. Não mexe no Rhyno.
router.put('/auth/me/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Senha atual incorreta' });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    req.logger.error('Erro ao trocar a própria senha', { message: error.message });
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Verificar token
router.post('/auth/verify', (req, res) => {
  const { token } = req.body;
  if (!token) return res.json({ valid: false });
  const secret = process.env.JWT_SECRET || 'fs-fotografias-secret-key';
  jwt.verify(token, secret, (err) => {
    if (err) return res.json({ valid: false });
    res.json({ valid: true });
  });
});

module.exports = router;