const jwt = require('jsonwebtoken');
const Organization = require('../models/Organization');

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
  console.log(`[${req.method}] ${req.path} org=${user.organizationId || 'n/a'} role=${user.role}`);
  next();
};

// Middleware para restringir acesso a superadmins
const requireSuperadmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso restrito a superadministradores' });
  }
  next();
};

module.exports = { authenticateToken, requireSuperadmin };
