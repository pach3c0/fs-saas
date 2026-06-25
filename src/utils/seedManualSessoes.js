'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: true });

const mongoose = require('mongoose');
const ManualModule = require('../models/ManualModule');

const ID = 'sessoes';
const LABEL = 'Catálogo de Sessões';
const ICON = 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z'; // Ícone de Câmera

const BLOCKS = [
  { 
    type: 'intro', 
    content: 'A página principal de Sessões é o catálogo geral do seu trabalho. Nela, você visualiza todas as sessões criadas em formato de "cards" (cartões), permitindo acompanhar o progresso de cada cliente de forma rápida, sem precisar abrir sessão por sessão.' 
  },
  {
    type: 'steps',
    steps: [
      { 
        n: 1, 
        who: 'fotógrafo', 
        title: 'Busca e Filtros', 
        desc: 'No topo da tela, use a barra de busca para encontrar um trabalho pelo nome. Você também pode usar os filtros para ver apenas sessões de um Status específico (Pendente, Em seleção, etc), por Período de data, Tipo de Evento ou Formato (Seleção vs Galeria).' 
      }
    ]
  },
  { 
    type: 'callout', 
    color: 'accent', 
    content: 'O que tem no Card? O título da sessão e o nome do cliente. Se o cliente estiver cadastrado, o nome dele será um link clicável que leva direto ao perfil dele no CRM. Além disso, as etiquetas (tags) mostram se a sessão é Individual ou em Grupo, e o seu status atual.' 
  },
  {
    type: 'steps',
    steps: [
      { 
        n: 2, 
        who: 'sistema', 
        title: 'Linha do Tempo (Progresso)', 
        desc: 'No meio de cada card, existe uma régua visual de etapas (Ex: Criada › Fotos › Link › Seleção › Entregue). Ela te diz exatamente o que está pendente no momento, como "Aguardando cliente" ou "Faça upload das fotos".' 
      },
      { 
        n: 3, 
        who: 'fotógrafo', 
        title: 'Botão: Bloquear / Liberar', 
        desc: 'Ícone de cadeado na base do card. Útil para quando você precisa suspender temporariamente o acesso do cliente ao link da sessão por pendências financeiras ou ajustes, sem deletar o trabalho.' 
      },
      { 
        n: 4, 
        who: 'fotógrafo', 
        title: 'Botão: Histórico', 
        desc: 'Abre o registro de atividades. Mostra tudo o que aconteceu na sessão com datas e horários exatos (ex: quando o cliente abriu o link, quando enviou a seleção, etc).' 
      },
      { 
        n: 5, 
        who: 'fotógrafo', 
        title: 'Botão: Deletar', 
        desc: 'Apaga a sessão e todas as fotos dela definitivamente do servidor para liberar espaço de armazenamento.' 
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
    await existing.save();
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
