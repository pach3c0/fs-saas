'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: true });

const mongoose = require('mongoose');
const ManualModule = require('../models/ManualModule');

const ID = 'header';                 // slug único
const LABEL = 'Navegação e Busca';   // ex.: 'Navegação'
const ICON = 'M4 6h16M4 12h16M4 18h16'; // path do ícone Lucide (Menu)

const BLOCKS = [
  { 
    type: 'intro', 
    content: 'A barra de navegação superior é o principal painel de controle do seu negócio. Ela está sempre visível no topo da tela e permite que você acesse rapidamente qualquer ferramenta, visualize notificações importantes e pesquise por funcionalidades sem perder tempo.' 
  },
  { 
    type: 'callout', 
    color: 'accent', 
    content: 'Dica: Se você não encontrar uma aba específica, use a barra de Pesquisa no centro. Basta digitar o nome da ferramenta (ex: "Sessões" ou "Domínio") e apertar a tecla Enter no seu teclado para ir direto para lá.' 
  },
  {
    type: 'steps',
    steps: [
      { 
        n: 1, 
        who: 'fotógrafo', 
        title: 'Navegação Principal', 
        desc: 'Do lado esquerdo da barra, você encontra atalhos diretos para as ferramentas mais acessadas do dia a dia: Sessões, Meu Site (com menu estendido para Mensagens e Domínio), Gestão e CRM.' 
      },
      { 
        n: 2, 
        who: 'fotógrafo', 
        title: 'Busca Rápida', 
        desc: 'No centro da barra superior fica o campo de busca. Digite o que precisa e aperte Enter para navegar na mesma hora, ideal para quando você está com pressa.' 
      },
      { 
        n: 3, 
        who: 'sistema', 
        title: 'Notificações', 
        desc: 'Sempre que houver uma novidade importante — como um cliente finalizando uma seleção — o ícone de sino no canto direito receberá um aviso. Clique nele para ver os detalhes e marcar os avisos como lidos.' 
      },
      { 
        n: 4, 
        who: 'fotógrafo', 
        title: 'Configurações e Ajuda', 
        desc: 'Ainda no lado direito, você encontra as engrenagens de Configurações, acesso direto às Tarefas, Marca D\'água e o atalho de Ajuda, onde você pode acessar os tutoriais a qualquer momento.' 
      }
    ]
  }
];

async function run() {
  if (!process.env.MONGODB_URI) console.log('Aviso: MONGODB_URI não definido — usando localhost.');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cliquezoom-dev');
  console.log('Conectado ao MongoDB');

  const existing = await ManualModule.findOne({ id: ID });
  if (existing) {
    existing.label = LABEL;
    existing.icon = ICON;
    existing.blocks = BLOCKS;
    await existing.save(); // preserva isPublished e order
    console.log(`Módulo "${ID}" atualizado (isPublished=${existing.isPublished}, order=${existing.order}).`);
  } else {
    const last = await ManualModule.findOne().sort({ order: -1 }).select('order').lean();
    const order = (last?.order || 0) + 1;
    await ManualModule.create({ id: ID, label: LABEL, icon: ICON, order, isPublished: false, blocks: BLOCKS });
    console.log(`Módulo "${ID}" criado como RASCUNHO (isPublished=false, order=${order}). Revise e publique em Ajuda & Treinamentos.`);
  }

  await mongoose.disconnect();
  console.log('Concluído.');
}

run().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
