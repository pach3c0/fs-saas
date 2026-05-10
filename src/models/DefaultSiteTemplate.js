const mongoose = require('mongoose');

// Singleton: apenas 1 documento nesta coleção
const DefaultSiteTemplateSchema = new mongoose.Schema({
  siteConfig:   { type: mongoose.Schema.Types.Mixed, default: {} },
  siteContent:  { type: mongoose.Schema.Types.Mixed, default: {} },
  siteStyle:    { type: mongoose.Schema.Types.Mixed, default: {} },
  siteSections: { type: [String], default: [] },
  updatedBy:    { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('DefaultSiteTemplate', DefaultSiteTemplateSchema);
