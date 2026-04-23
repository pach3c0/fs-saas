const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const { sendWelcomeEmail, sendApprovalEmail, sendPasswordResetEmail } = require('../utils/email');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email e senha são obrigatórios' });
    }

    const secret = process.env.JWT_SECRET || 'fs-fotografias-secret-key';

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.warn(`Tentativa de login: E-mail não encontrado: ${email}`);
      return res.status(401).json({ success: false, error: 'E-mail não cadastrado' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      console.warn(`Tentativa de login: Senha incorreta para e-mail: ${email}`);
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

    return res.json({
      success: true,
      token,
      organizationId: user.organizationId.toString(),
      role: user.role
    });
  } catch (error) {
    if (req.logger) {
      req.logger.error(`Erro crítico no login: ${error.message}`, { stack: error.stack });
    } else {
      console.error(`Erro crítico no login: ${error.message}`, error);
    }
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
    console.error('Erro no forgot-password:', error);
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

    const passwordHash = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(payload.userId, { passwordHash });

    res.json({ success: true, message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('Erro no reset-password:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Registro self-service (cria org + user já ativos)
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name, orgName, slug } = req.body;

    if (!email || !password || !name || !orgName || !slug) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Slug deve conter apenas letras minúsculas, números e hifens' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    const existingOrg = await Organization.findOne({ slug: slug.toLowerCase().trim() });
    if (existingOrg) {
      return res.status(409).json({ error: 'Slug já está em uso' });
    }

    const org = await Organization.create({
      name: orgName,
      slug: slug.toLowerCase().trim(),
      isActive: true,
      plan: 'free'
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
      limits: {
        maxSessions: 5,
        maxPhotos: 100,
        maxAlbums: 1,
        maxStorage: 500,
        customDomain: false
      },
      usage: { sessions: 0, photos: 0, albums: 0, storage: 0 }
    });

    sendWelcomeEmail(user.email, user.name, org.slug).catch(() => { });

    res.status(201).json({
      success: true,
      message: 'Cadastro realizado! Acesse seu painel com o e-mail e senha cadastrados.',
      organizationSlug: org.slug
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno ao criar cadastro' });
  }
});

// Verificar disponibilidade de slug
router.get('/auth/check-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) return res.status(400).json({ error: 'Slug é obrigatório' });

    const existingOrg = await Organization.findOne({ slug: slug.toLowerCase().trim() });
    res.json({ 
      success: true, 
      available: !existingOrg,
      message: existingOrg ? 'Slug já está em uso' : 'Disponível'
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar slug' });
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