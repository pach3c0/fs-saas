const jwt = require('jsonwebtoken');

// Middleware de autenticação
// JWT agora contém: { userId, organizationId, role }
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  const secret = process.env.JWT_SECRET || 'cliquezoom-secret-key';
  jwt.verify(token, secret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user; // { userId, organizationId, role }
    next();
  });
};

// Middleware para restringir acesso a superadmins
const requireSuperadmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso restrito a superadministradores' });
  }
  next();
};

module.exports = { authenticateToken, requireSuperadmin };
