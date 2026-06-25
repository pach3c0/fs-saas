/**
 * Script standalone — cria/atualiza o módulo de manual "Sessão: Galeria" a partir da
 * varredura do código real (admin/js/tabs/sessoes/wizard/gallery-single-page.js). 
 * Nasce como RASCUNHO (isPublished:false) para o superadmin revisar e publicar.
 * Uso: node src/utils/seedManualSessaoGaleria.js
 * Idempotente: re-executar atualiza o conteúdo, preserva isPublished e order.
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: true });

const mongoose = require('mongoose');
const ManualModule = require('../models/ManualModule');

const ID = 'sessao_galeria';
const LABEL = 'Sessão: Galeria';
const ICON = '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>';

const BLOCKS = [
  {
    type: 'intro',
    content: 'O modo Galeria é a via expressa da plataforma: feito para quando você não precisa que o cliente escolha fotos, apenas entregá-las prontas para visualização e download em alta resolução.'
  },
  {
    type: 'callout',
    color: 'accent',
    content: 'Página Simplificada: Aqui o fluxo ocorre em apenas duas seções verticais (Upload e Compartilhar/Entregar). Configurações de pacotes e upsell de fotos extras não existem neste modo, deixando tudo mais rápido e direto.'
  },
  {
    type: 'steps',
    steps: [
      {
        n: 1,
        who: 'fotógrafo',
        title: 'Upload das Fotos Finais',
        desc: 'Neste modo, você sobe exclusivamente as suas fotos já tratadas e finalizadas. Use a primeira seção da tela para anexar os arquivos na resolução ideal para a entrega ao cliente.'
      },
      {
        n: 2,
        who: 'fotógrafo',
        title: 'Configurações da Sessão',
        desc: 'A barra lateral direita continua servindo para organizar as coisas: defina o nome, mude a foto de capa, vincule o cliente e adicione marca d\'água (se desejar apenas uma exibição sem download liberado imediatamente).'
      },
      {
        n: 3,
        who: 'fotógrafo',
        title: 'Compartilhar e Entregar',
        desc: 'Abaixo da área de fotos, você encontra o painel de entrega. Como não existe a etapa de escolha, você simplesmente usa os botões de WhatsApp ou E-mail para enviar o link direto da galeria pública para o seu cliente.'
      },
      {
        n: 4,
        who: 'cliente',
        title: 'Baixando as fotos',
        desc: 'Quando o cliente abrir o link, ele será levado diretamente para uma vitrine limpa com todas as suas fotos. O botão de download geral estará disponível e ele não precisará selecionar nada, apenas aproveitar o resultado final.'
      }
    ]
  },
  {
    type: 'callout',
    color: 'green',
    content: 'Dica: O modo Galeria é excelente para portfólios públicos, cobertura de eventos de imprensa ou ensaios em que o pacote "tudo incluso" já foi contratado e pago.'
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
