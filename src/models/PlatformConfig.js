const mongoose = require('mongoose');

// Configurações globais da plataforma gerenciadas pelo Super Admin.
// Singleton pattern (garante apenas um documento).
const platformConfigSchema = new mongoose.Schema({
  singleton: { type: String, default: 'main', unique: true },
  watermarkPreviewImage: { type: String, default: '' },
  // Modo manutenção GLOBAL da plataforma (gerenciado pelo Super Admin).
  // Diferente de SiteData.maintenance, que é por site de fotógrafo.
  maintenance: {
    enabled: { type: Boolean, default: false },
    message: { type: String, default: '' },
    etaText: { type: String, default: '' }, // previsão de retorno (texto livre)
    updatedAt: { type: Date },
  },
}, { timestamps: true });

platformConfigSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ singleton: 'main' });
  if (!doc) doc = await this.create({ singleton: 'main' });
  return doc;
};

module.exports = mongoose.model('PlatformConfig', platformConfigSchema);
