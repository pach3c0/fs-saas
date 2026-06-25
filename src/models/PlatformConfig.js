const mongoose = require('mongoose');

// Configurações globais da plataforma gerenciadas pelo Super Admin.
// Singleton pattern (garante apenas um documento).
const platformConfigSchema = new mongoose.Schema({
  singleton: { type: String, default: 'main', unique: true },
  watermarkPreviewImage: { type: String, default: '' },
}, { timestamps: true });

platformConfigSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ singleton: 'main' });
  if (!doc) doc = await this.create({ singleton: 'main' });
  return doc;
};

module.exports = mongoose.model('PlatformConfig', platformConfigSchema);
