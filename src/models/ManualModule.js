const mongoose = require('mongoose');

const StepSchema = new mongoose.Schema({
  n:     { type: Number, required: true },
  who:   { type: String, default: 'fotógrafo' }, // fotógrafo | cliente | sistema
  color: { type: String, default: 'accent' },    // accent | green | yellow | red
  title: { type: String, required: true },
  desc:  { type: String, required: true }
}, { _id: false });

const BlockSchema = new mongoose.Schema({
  type:    { type: String, enum: ['intro', 'callout', 'steps', 'image'], required: true },
  content: { type: String },         // intro, callout
  color:   { type: String },         // callout: accent | green | yellow | red
  steps:   { type: [StepSchema] },   // steps
  url:     { type: String },         // image: caminho em /uploads (captura de tela real)
  caption: { type: String }          // image: legenda opcional
}, { _id: false });

const ManualModuleSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true }, // slug, ex: 'dashboard'
  label:       { type: String, required: true },
  icon:        { type: String, default: '' },    // SVG path do ícone Lucide
  order:       { type: Number, default: 0 },
  isPublished: { type: Boolean, default: false },
  blocks:      { type: [BlockSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('ManualModule', ManualModuleSchema);
