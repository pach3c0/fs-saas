const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  active: {
    type: Boolean,
    default: true
  },
  source: {
    type: String,
    default: 'website'
  }
}, {
  timestamps: true
});

// Index composto: permite mesmo email em diferentes orgs, mas único dentro da mesma org
newsletterSchema.index({ organizationId: 1, email: 1 }, { unique: true });
newsletterSchema.index({ active: 1, subscribedAt: -1 });

module.exports = mongoose.model('Newsletter', newsletterSchema);
