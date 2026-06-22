const mongoose = require('mongoose');

const BannerConfigSchema = new mongoose.Schema({
  interval: { type: Number, default: 0 } // em segundos. 0 = sem auto-slide
}, { timestamps: true });

module.exports = mongoose.model('BannerConfig', BannerConfigSchema);
