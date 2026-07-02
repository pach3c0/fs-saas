const jwt = require('jsonwebtoken');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { can } = require('../services/memberPermissions');
const logger = require('../utils/logger');

// Middleware de autenticação
// JWT agora contém: { userId, organizationId, role }
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  const secret = process.env.JWT_SECRET || 'fs-fotografias-secret-key';

  let user;
  try {
    user = jwt.verify(token, secret);
  } catch {
    return res.status(403).json({ error: 'Token inválido' });
  }

  // Bloqueia contas suspensas (isActive=false), exceto superadmins
  if (user.role !== 'superadmin' && user.organizationId) {
    const org = await Organization.findById(user.organizationId).select('isActive').lean();
    if (org && org.isActive === false) {
      return res.status(403).json({ error: 'Conta suspensa. Entre em contato com o suporte.' });
    }
  }

  req.user = user; // { userId, organizationId, role }

  // Logger contextualizado. impersonatedBy marca sessões de suporte
  // (superadmin "entrou como" a org) — distinguível em todos os logs.
  req.logger = logger.child({
    requestId: req.requestId,
    orgId: user.organizationId,
    userId: user.userId,
    role: user.role,
    ...(user.impersonatedBy ? { impersonatedBy: user.impersonatedBy } : {})
  });

  next();
};

// Middleware para restringir acesso a superadmins
const requireSuperadmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso restrito a superadministradores' });
  }
  next();
};

// Guarda de DONO (Slice 2): admin/superadmin passam; 'member' 403. Promovido de team.js
// para ser reusado em todas as superfícies só-do-titular. A flag `forbidden:true` faz o
// api.js do admin mostrar toast em vez de deslogar (403 SEM flag = token inválido → logout).
const requireOwner = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) return next();
  return res.status(403).json({ success: false, forbidden: true, error: 'Apenas o titular da conta pode acessar isto.' });
};

// Gate por MÓDULO (Slice 2): dono passa; membro precisa de pelo menos UMA das `keys`. Lê o
// mapa de permissões do DB por-request → mudança de permissão vale NA HORA (não espera
// re-login). Múltiplas keys cobrem módulos que compartilham endpoint (ex.: 'perfil' e
// 'marca_dagua' no PUT /organization/profile). Nega com `forbidden:true` (ver requireOwner).
const requirePermission = (...keys) => async (req, res, next) => {
  try {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) return next();
    const user = await User.findById(req.user.userId).select('role permissions approved').lean();
    // Membro DESATIVADO perde acesso na hora, mesmo com o token de 7 dias ainda vivo
    // (o dono acabou de desligá-lo na aba Equipe). Fecha a janela de sessão-fantasma.
    if (!user || user.approved === false) {
      return res.status(403).json({ success: false, forbidden: true, error: 'Conta desativada.' });
    }
    // Disponibiliza o membro carregado ao handler p/ segregar por permissão quando um
    // endpoint é compartilhado por 2 módulos (ex.: PUT /profile = perfil × marca_dagua).
    req._permUser = user;
    if (keys.some((k) => can(user, k))) return next();
    return res.status(403).json({ success: false, forbidden: true, error: 'Você não tem permissão para esta ação.' });
  } catch (err) {
    req.logger?.error?.('Erro no gate de permissão', { error: err.message, keys });
    return res.status(500).json({ success: false, error: 'Erro ao validar permissão' });
  }
};

module.exports = { authenticateToken, requireSuperadmin, requireOwner, requirePermission };
