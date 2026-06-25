// Criptografia simétrica para segredos guardados no banco (chaves de API do
// agente). AES-256-GCM com chave derivada de um segredo do ambiente — assim um
// dump do Mongo, sozinho, não revela as chaves. Formato: iv:tag:ciphertext (b64).
const crypto = require('crypto');

// Deriva 32 bytes de CONFIG_SECRET (ou JWT_SECRET como fallback). Se o segredo
// rotacionar, segredos antigos ficam ilegíveis (basta recadastrar a chave).
function deriveKey() {
  const secret = process.env.CONFIG_SECRET || process.env.JWT_SECRET || 'cliquezoom-dev-fallback';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

function decrypt(blob) {
  const [ivB, tagB, dataB] = String(blob).split(':');
  if (!ivB || !tagB || !dataB) throw new Error('segredo malformado');
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(), Buffer.from(ivB, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64')), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
