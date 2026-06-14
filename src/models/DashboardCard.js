const mongoose = require('mongoose');

// Personalização visual (imagem de fundo) por elemento do dashboard do fotógrafo,
// gerida pelo Superadmin. As keys são FIXAS — não é conteúdo livre.
// Sem documento/imagem => o elemento cai no estilo sólido padrão.
//  - Cards de métrica (véu escuro + texto branco): sessions, photos, storage, delivered
//  - Superfícies (imagem suave atrás do conteúdo, com opacidade ajustável):
//    recentSessions (painel Sessões Recentes), quickActionNew/quickActionSite (ações rápidas),
//    platformNews (card de Novidades do CliqueZoom)
const DASHBOARD_CARD_KEYS = [
  'sessions', 'photos', 'storage', 'delivered',
  'recentSessions', 'quickActionNew', 'quickActionSite', 'platformNews'
];

const DashboardCardSchema = new mongoose.Schema({
  key:      { type: String, enum: DASHBOARD_CARD_KEYS, required: true, unique: true },
  imageUrl: { type: String, default: '' },   // Caminho relativo da imagem (upload). Vazio => sólido.
  opacity:  { type: Number, default: 0.2, min: 0, max: 1 }, // só nas superfícies — opacidade da imagem atrás do conteúdo.
  active:   { type: Boolean, default: true }  // Liga/desliga sem apagar a imagem.
}, { timestamps: true });

const DashboardCard = mongoose.model('DashboardCard', DashboardCardSchema);
DashboardCard.KEYS = DASHBOARD_CARD_KEYS;

module.exports = DashboardCard;
