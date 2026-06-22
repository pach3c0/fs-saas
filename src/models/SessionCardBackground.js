const mongoose = require('mongoose');

// Imagem de fundo dos cards do catálogo de sessões do fotógrafo, por MODO de sessão,
// gerida pelo Superadmin. As keys são FIXAS (os 3 modos V1 visíveis no catálogo) —
// não é conteúdo livre. Sem documento/imagem => o card cai no tint sólido padrão
// (color-mix por modo, tratado no front em admin/js/tabs/sessoes/list.js).
//   - selection       → sessões de Seleção
//   - gallery          → sessões de Galeria
//   - multi_selection  → sessões de Multi-Seleção
const SESSION_CARD_BG_KEYS = ['selection', 'gallery', 'multi_selection', 'multi_gallery'];

const SessionCardBackgroundSchema = new mongoose.Schema({
  key:       { type: String, enum: SESSION_CARD_BG_KEYS, required: true, unique: true },
  imageUrl:  { type: String, default: '' },   // Caminho da imagem (upload). Vazio => tint sólido.
  opacity:   { type: Number, default: 0.18, min: 0, max: 1 }, // opacidade da imagem atrás do conteúdo do card.
  active:    { type: Boolean, default: true }, // Liga/desliga sem apagar a imagem.
  text:      { type: String, default: '' },   // Texto da marca d'água de fundo (ex: Galeria).
  textColor: { type: String, default: '#ffffff' }, // Cor do texto de fundo
  bgColor:   { type: String, default: '' }    // Cor de fundo que sobrescreve o cardBg padrão
}, { timestamps: true });

const SessionCardBackground = mongoose.model('SessionCardBackground', SessionCardBackgroundSchema);
SessionCardBackground.KEYS = SESSION_CARD_BG_KEYS;

module.exports = SessionCardBackground;
