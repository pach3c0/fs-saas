// Manifesto do "Manual do Operador" — documentação interna do dono/superadmin.
// Fonte ÚNICA das seções: tanto a aba do Super Admin quanto a tool da IA
// (getManualOperador) leem daqui via src/services/manualOperador.js.
//
// Cada seção é um arquivo .md NESTA pasta. `slug` é o identificador estável
// usado nas rotas e pela IA — NUNCA derive caminho de arquivo do input do
// usuário; só os slugs deste manifesto são aceitos (guarda anti path-traversal).
//
// Para adicionar uma seção nova: crie o .md aqui e registre uma entrada abaixo.
//
// O Manual do Operador deixou de ser só o runbook de cobrança: virou a BASE DE
// CONHECIMENTO do app inteiro para a IA do Super Admin (o que é cada parte, como
// funciona e de quem é — empresa × fotógrafo × cliente). `visao-geral` é a espinha.
module.exports = [
  {
    slug: 'visao-geral',
    title: 'Visão Geral & Mapa de Públicos',
    order: 1,
    file: 'visao-geral.md',
  },
  {
    slug: 'sessoes',
    title: 'Sessões e os Modos de Galeria',
    order: 2,
    file: 'sessoes.md',
  },
  {
    slug: 'clientes-crm',
    title: 'Clientes & CRM',
    order: 3,
    file: 'clientes-crm.md',
  },
  {
    slug: 'storage-planos',
    title: 'Planos, Preços e Storage',
    order: 4,
    file: 'storage-planos.md',
  },
  {
    slug: 'superadmin-jornada-auditoria',
    title: 'Jornada, Presença & Auditoria',
    order: 5,
    file: 'superadmin-jornada-auditoria.md',
  },
  {
    slug: 'mercado-pago',
    title: 'Mercado Pago — Cobrança',
    order: 6,
    file: 'mercado-pago.md',
  },
];
