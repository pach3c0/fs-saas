const mongoose = require('mongoose');

const BannerConfigSchema = new mongoose.Schema({
  interval: { type: Number, default: 0 }, // em segundos. 0 = sem auto-slide
  accentColor: { type: String, default: '#3fb950' } // cor do brilho/CTA do banner (hex). Base escura é fixa.
}, { timestamps: true });

module.exports = mongoose.model('BannerConfig', BannerConfigSchema);
