const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const { can } = require('../services/subscriptionPricing');
const { authenticateToken } = require('../middleware/auth');
const { verifyDomain } = require('../utils/dnsVerifier');
const { checkAvailability, DEFAULT_TLDS, PRICE_ESTIMATES } = require('../utils/domainAvailability');
const { execFile } = require('child_process');
const path = require('path');

// Obter status do domínio
router.get('/domains/status', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId).lean();
    const baseDomain = (process.env.BASE_DOMAIN || 'cliquezoom.com.br').trim();
    res.json({
      success: true,
      customDomain: org.customDomain || null,
      domainStatus: org.domainStatus,
      // Endereço gratuito (subdomínio do slug) — sempre ativo, mostrado ao cliente
      // quando o plano não permite domínio próprio.
      subdomain: org.slug ? `${org.slug}.${baseDomain}` : null,
      serverIP: process.env.SERVER_IP || '5.189.174.18'
    });
  } catch (error) {
    req.logger.error('Erro ao obter status do domínio', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Adicionar domínio customizado
router.post('/domains', authenticateToken, async (req, res) => {
  try {
    // Normaliza antes de validar — usuário pode digitar maiúsculas ou espaços
    const domain = String(req.body.domain || '').trim().toLowerCase();

    // Validar formato do domínio
    if (!/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/.test(domain)) {
      return res.status(400).json({ error: 'Domínio inválido' });
    }

    // Gate de plano: domínio próprio é capability de Pro+ (dominioProprio). Free/Basic
    // recebem 403 com mensagem de upgrade. Fail-open em erro de leitura para nunca
    // bloquear um plano pago por uma falha de DB (domínios já conectados não são tocados).
    try {
      const sub = await Subscription.findOne({ organizationId: req.user.organizationId }).lean();
      if (!can(sub, 'dominioProprio')) {
        // upgrade:true → o wrapper de API do front NÃO desloga (403 sem `upgrade`
        // é tratado como token inválido); a aba Domínio mostra um modal educado.
        return res.status(403).json({
          error: 'Domínio próprio está disponível a partir do plano Pro.',
          code: 'PLAN_REQUIRED',
          upgrade: true,
          message: 'Conecte um domínio próprio no plano Pro ou superior. Seu plano atual usa o endereço gratuito (subdomínio CliqueZoom).'
        });
      }
    } catch (e) {
      req.logger.error('Falha ao checar plano para domínio próprio (fail-open)', { error: e.message });
    }

    // Verificar se já está em uso por OUTRA conta (re-salvar o próprio é permitido)
    const existing = await Organization.findOne({
      customDomain: domain,
      _id: { $ne: req.user.organizationId }
    }).lean();
    if (existing) {
      return res.status(400).json({ error: 'Domínio já cadastrado em outra conta' });
    }

    // Salvar e iniciar verificação
    await Organization.findByIdAndUpdate(
      req.user.organizationId,
      {
        customDomain: domain,
        domainStatus: 'pending'
      }
    );

    res.json({
      success: true,
      message: 'Configure o DNS e clique em "Verificar"',
      instructions: {
        type: 'A Record',
        name: domain,
        value: process.env.SERVER_IP || '5.189.174.18',
        ttl: 3600
      }
    });
  } catch (error) {
    req.logger.error('Erro ao adicionar domínio customizado', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Verificar configuração DNS
router.post('/domains/verify', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId);
    if (!org.customDomain) {
      return res.status(400).json({ error: 'Nenhum domínio configurado' });
    }

    const serverIP = process.env.SERVER_IP || '5.189.174.18';
    const isValid = await verifyDomain(org.customDomain, serverIP);

    if (isValid) {
      org.domainStatus = 'verified';
      org.domainVerifiedAt = new Date();
      await org.save();

      // Gerar certificado SSL automático (só em produção — local não tem certbot/nginx)
      if (process.env.NODE_ENV === 'production') {
        const logger = req.logger;
        const scriptPath = path.join(__dirname, '../scripts/generate-ssl.sh');
        execFile('bash', [scriptPath, org.customDomain], (error) => {
          if (error) {
            logger.error(`Erro SSL para ${org.customDomain}: ${error.message}`);
          }
        });
      }

      res.json({ success: true, message: 'Domínio verificado com sucesso! O SSL será gerado em instantes.' });
    } else {
      res.json({
        success: false,
        message: 'DNS ainda não propagado. Aguarde até 48h e tente novamente.'
      });
    }
  } catch (error) {
    req.logger.error('Erro ao verificar DNS do domínio', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Remover domínio customizado
router.delete('/domains', authenticateToken, async (req, res) => {
  try {
    // $unset (não null): customDomain tem índice unique sparse — null gravado conta no
    // índice e duas orgs sem domínio colidiriam em duplicate key
    await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { $unset: { customDomain: 1, domainVerifiedAt: 1 }, $set: { domainStatus: 'pending' } }
    );
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro ao remover domínio customizado', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Verificar disponibilidade de um nome em várias extensões (RDAP, sem gating de plano —
// a busca é aberta como funil de venda; conectar o domínio ao site segue sendo Pro).
router.get('/domains/check', authenticateToken, async (req, res) => {
  try {
    // Normaliza: lowercase, trim. Se vier um domínio completo (com ponto), usa só o
    // primeiro label (SLD). Aceita apenas [a-z0-9-].
    let name = String(req.query.name || '').trim().toLowerCase();
    if (name.includes('.')) name = name.split('.')[0];

    if (!name || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) {
      return res.status(400).json({ error: 'Nome inválido. Use apenas letras, números e hífen.' });
    }

    const found = await checkAvailability(name, DEFAULT_TLDS);
    const results = found.map(r => ({
      ...r,
      priceEstimate: PRICE_ESTIMATES[r.tld] || null
    }));

    req.logger.info('Busca de disponibilidade de domínio', { name, count: results.length });
    res.json({ success: true, results });
  } catch (error) {
    req.logger.error('Erro na busca de disponibilidade de domínio', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;