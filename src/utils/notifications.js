const Notification = require('../models/Notification');

async function notify(type, sessionId, sessionName, message, organizationId) {
  try {
    await Notification.create({ 
      type, 
      sessionId, 
      sessionName, 
      message,
      organizationId 
    });
  } catch (e) { /* silent - notificacoes nao sao criticas */ }
}

module.exports = { notify };
