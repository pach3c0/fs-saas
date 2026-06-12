const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const { authenticateToken } = require('../middleware/auth');
const { verifyDomain } = require('../utils/dnsVerifier');
const { execFile } = require('child_process');
const path = require('path');

// Obter status do domínio
router.get('/domains/status', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId).lean();
    res.json({
      success: true,
      customDomain: org.customDomain || null,
      domainStatus: org.domainStatus,
      serverIP: process.env.SERVER_IP || '5.189.174.18'
    });
  } catch (error) {
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
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;