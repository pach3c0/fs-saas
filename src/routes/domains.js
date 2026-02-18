const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const { authenticateToken } = require('../middleware/auth');
const { verifyDomain } = require('../utils/dnsVerifier');
const { exec } = require('child_process');
const path = require('path');

// Obter status do domínio
router.get('/domains/status', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId);
    res.json({
      success: true,
      customDomain: org.customDomain,
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
    const { domain } = req.body;

    // Validar formato do domínio
    if (!/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/.test(domain)) {
      return res.status(400).json({ error: 'Domínio inválido' });
    }

    // Verificar se já está em uso
    const existing = await Organization.findOne({ customDomain: domain });
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

      // Gerar certificado SSL automático (executar script)
      const scriptPath = path.join(__dirname, '../scripts/generate-ssl.sh');
      exec(`bash ${scriptPath} ${org.customDomain}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Erro SSL: ${error.message}`);
          return;
        }
        console.log(`SSL Gerado: ${stdout}`);
      });

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
    await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { customDomain: null, domainStatus: 'pending', domainVerifiedAt: null }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;