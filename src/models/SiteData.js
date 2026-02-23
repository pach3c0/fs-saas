const mongoose = require('mongoose');

const SiteDataSchema = new mongoose.Schema({
  logo: {
    type: { type: String, default: 'text' },
    text: { type: String, default: 'CliqueZoom' },
    image: { type: String, default: '' }
  },
  hero: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    image: { type: String, default: '' },
    transform: { 
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    titleTransform: { type: mongoose.Schema.Types.Mixed, default: {} },
    subtitleTransform: { type: mongoose.Schema.Types.Mixed, default: {} },
    titleFontSize: { type: Number, default: 48 },
    subtitleFontSize: { type: Number, default: 18 },
    topBarHeight: { type: Number, default: 0 },
    bottomBarHeight: { type: Number, default: 0 },
    overlayOpacity: { type: Number, default: 30 }
  },
  about: {
    title: { type: String, default: '' },
    text: { type: String, default: '' },
    image: { type: String, default: '' },
    images: { type: Array, default: [] }
  },
  portfolio: {
    type: Array,
    default: []
  },
  studio: { type: mongoose.Schema.Types.Mixed, default: {} },
  albums: { type: Array, default: [] },
  footer: { type: mongoose.Schema.Types.Mixed, default: {} },
  faq: {
    faqs: { type: Array, default: [] }
  },
  maintenance: { type: mongoose.Schema.Types.Mixed, default: { enabled: false } },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true }
}, { 
  timestamps: true,
  strict: false,
  collection: 'sitedatas'
});

module.exports = mongoose.model('SiteData', SiteDataSchema);