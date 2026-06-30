// Manifesto do "Manual do Operador" — documentação interna do dono/superadmin.
// Fonte ÚNICA das seções: tanto a aba do Super Admin quanto a tool da IA
// (getManualOperador) leem daqui via src/services/manualOperador.js.
//
// Cada seção é um arquivo .md NESTA pasta. `slug` é o identificador estável
// usado nas rotas e pela IA — NUNCA derive caminho de arquivo do input do
// usuário; só os slugs deste manifesto são aceitos (guarda anti path-traversal).
//
// Para adicionar uma seção nova: crie o .md aqui e registre uma entrada abaixo.
module.exports = [
  {
    slug: 'mercado-pago',
    title: 'Mercado Pago — Cobrança',
    order: 1,
    file: 'mercado-pago.md',
  },
];
