const SecurityLog = require('../models/SecurityLog');
const logger = require('../utils/logger');

/**
 * Middleware de Honey Pot (Nível 1)
 * Detecta bots que preenchem campos ocultos destinados apenas a máquinas.
 */
const checkHoneyPot = async (req, res, next) => {
  // O campo 'confirm_email_field' é um nome comum que bots tentam preencher
  // mas que deve ser escondido do usuário final via CSS.
  const honeyField = req.body._hp_trap;

  if (honeyField) {
    // É um bot!
    const logData = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      event: 'honey_pot_trap',
      route: req.originalUrl,
      details: { 
        filledField: '_hp_trap',
        value: honeyField,
        body: { ...req.body, password: '[REDACTED]' }
      },
      organizationId: req.organizationId || null
    };

    try {
      await SecurityLog.create(logData);
      logger.warn('Bot detected by Honey Pot', logData);
    } catch (error) {
      logger.error('Error saving security log', { error: error.message });
    }

    // Retorna erro mas de forma genérica para não "ensinar" o bot
    return res.status(400).json({ 
      success: false, 
      error: 'Requisição inválida. Se você é um humano, tente novamente sem preencher campos ocultos.' 
    });
  }

  next();
};

module.exports = {
  checkHoneyPot
};
