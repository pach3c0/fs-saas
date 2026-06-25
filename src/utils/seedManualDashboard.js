/**
 * Script standalone — cria/atualiza o módulo de manual "Dashboard" a partir da
 * varredura do código real (admin/js/tabs/dashboard.js). Nasce como RASCUNHO
 * (isPublished:false) para o superadmin revisar e publicar em Ajuda & Treinamentos.
 * Uso: node src/utils/seedManualDashboard.js
 * Idempotente: re-executar atualiza o conteúdo, preserva isPublished e order.
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: true });

const mongoose = require('mongoose');
const ManualModule = require('../models/ManualModule');

const ID = 'dashboard';
// Ícone Lucide (path) — mesmo "home/layout" da aba Visão Geral do Dashboard.
const ICON = 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z';

const BLOCKS = [
  {
    type: 'intro',
    content: 'O Dashboard é a primeira tela ao entrar no painel. Ele reúne, em um lugar só, o resumo do seu negócio, atalhos para as ações mais comuns e os comunicados da plataforma. Nada aqui é editável — é o seu painel de visão rápida.'
  },
  {
    type: 'callout',
    color: 'accent',
    content: 'O Dashboard tem duas abas internas: "Visão Geral" (seus números e atalhos) e "Eventos" (comunicados da plataforma). A aba Eventos mostra uma bolinha vermelha com a quantidade de avisos que você ainda não leu.'
  },
  {
    type: 'steps',
    steps: [
      { n: 1, who: 'sistema', title: 'Os 4 indicadores do topo', desc: 'Logo no início da Visão Geral aparecem quatro números, atualizados automaticamente conforme você trabalha: Total de Sessões (quantas você já criou), Fotos Upadas (total de fotos enviadas), Espaço Usado (quanto do seu armazenamento já foi ocupado) e Entregues (sessões já finalizadas e entregues ao cliente).' },
      { n: 2, who: 'fotógrafo', title: 'Sessões Recentes', desc: 'A lista mostra suas últimas sessões com o status de cada uma. Clique em uma sessão para abrir direto o assistente dela; use o botão "Ver todas" no canto para ir à aba Sessões e ver a lista completa.' },
      { n: 3, who: 'fotógrafo', title: 'Ação rápida: Nova Sessão', desc: 'No bloco "Ações Rápidas", o botão "Nova Sessão" leva você direto para a aba Sessões para começar a criar uma nova galeria ou seleção.' },
      { n: 4, who: 'fotógrafo', title: 'Ação rápida: Ver meu Site', desc: 'O botão "Ver meu Site" abre o seu site público em uma nova aba — exatamente do jeito que seus clientes o veem.' },
      { n: 5, who: 'sistema', title: 'Guia "Comece por aqui"', desc: 'Em contas novas aparece um guia de primeiros passos com uma barra de Progresso do Setup. Cada passo traz um link "Ver Tutorial". Quando não precisar mais, use "Ocultar guia" para escondê-lo.' },
      { n: 6, who: 'sistema', title: 'Novidades do CliqueZoom', desc: 'No fim da Visão Geral, o bloco "Novidades do CliqueZoom" traz as últimas atualizações e melhorias da plataforma.' }
    ]
  },
  {
    type: 'callout',
    color: 'yellow',
    content: 'O que cada status de sessão quer dizer: Pendente (criada, ainda aguardando) · Em Seleção (o cliente está escolhendo as fotos) · Revisar (o cliente enviou a seleção e está aguardando você) · Entregue (sessão finalizada).'
  }
];

async function run() {
  if (!process.env.MONGODB_URI) {
    console.log('Aviso: MONGODB_URI não definido — usando localhost.');
  }
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cliquezoom');
  console.log('Conectado ao MongoDB');

  const existing = await ManualModule.findOne({ id: ID });
  if (existing) {
    existing.label = 'Dashboard';
    existing.icon = ICON;
    existing.blocks = BLOCKS;
    await existing.save(); // preserva isPublished e order
    console.log(`Módulo "${ID}" atualizado (isPublished=${existing.isPublished}, order=${existing.order}).`);
  } else {
    const last = await ManualModule.findOne().sort({ order: -1 }).select('order').lean();
    const order = (last?.order || 0) + 1;
    await ManualModule.create({ id: ID, label: 'Dashboard', icon: ICON, order, isPublished: false, blocks: BLOCKS });
    console.log(`Módulo "${ID}" criado como RASCUNHO (isPublished=false, order=${order}). Revise e publique em Ajuda & Treinamentos.`);
  }

  await mongoose.disconnect();
  console.log('Concluído.');
}

run().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
