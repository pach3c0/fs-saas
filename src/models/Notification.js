const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: String,
  sessionId: String,
  sessionName: String,
  message: String,
  read: { type: Boolean, default: false },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
