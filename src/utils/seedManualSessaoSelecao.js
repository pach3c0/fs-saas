/**
 * Script standalone — cria/atualiza o módulo de manual "Sessão: Seleção" a partir da
 * varredura do código real (admin/js/tabs/sessoes/wizard/). Nasce como RASCUNHO
 * (isPublished:false) para o superadmin revisar e publicar em Ajuda & Treinamentos.
 * Uso: node src/utils/seedManualSessaoSelecao.js
 * Idempotente: re-executar atualiza o conteúdo, preserva isPublished e order.
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: true });

const mongoose = require('mongoose');
const ManualModule = require('../models/ManualModule');

const ID = 'sessao_selecao';
const LABEL = 'Sessão: Seleção';
const ICON = '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>';

const BLOCKS = [
  {
    type: 'intro',
    content: 'O modo Seleção é focado em guiar o seu cliente para escolher as fotos favoritas. Agora o fluxo acontece em uma única página dinâmica (Fotos da Sessão), centralizando os uploads, configurações e o compartilhamento em um só lugar.'
  },
  {
    type: 'callout',
    color: 'accent',
    content: 'Configurações (Barra Lateral): À direita da tela, você tem todo o controle. Defina o Nome, cadastre ou busque o Cliente, adicione uma Foto de Capa, determine o Prazo de Seleção e os valores de Fotos do Pacote e Extras.'
  },
  {
    type: 'steps',
    steps: [
      {
        n: 1,
        who: 'fotógrafo',
        title: 'Escolha o seu caminho de Upload',
        desc: 'Ao iniciar, você verá duas opções: **Fotos originais (sem edição)**, onde você sobe os arquivos brutos para editar só as escolhidas depois, ou **Fotos já editadas**, ideal se você já tratou o material e quer pular o re-upload no final.'
      },
      {
        n: 2,
        who: 'fotógrafo',
        title: 'Pré-requisitos de Compartilhamento',
        desc: 'O sistema possui um bloqueio de segurança (faixa laranja "Antes de compartilhar, conclua"). Você só poderá enviar o acesso ao cliente depois de **vincular o cliente** na barra lateral direita e fazer o upload de pelo menos 1 foto.'
      },
      {
        n: 3,
        who: 'fotógrafo',
        title: 'Compartilhar o Código',
        desc: 'Cumpridos os requisitos, a aba inferior **Compartilhar com o cliente** será liberada. Você pode copiar o link ou enviar as instruções e o código direto para o WhatsApp ou E-mail do cliente.'
      },
      {
        n: 4,
        who: 'cliente',
        title: 'Seleção',
        desc: 'O cliente acessa a galeria usando o código que você mandou, clica nos corações para marcar suas favoritas, acompanha o limite contratado na barra flutuante e envia a seleção.'
      },
      {
        n: 5,
        who: 'fotógrafo',
        title: 'Acompanhar, Editar e Entregar',
        desc: 'Na mesma página central, você acompanha o total selecionado. Se escolheu fotos originais, você baixa os nomes (arquivo .txt), trata e depois clica em "Subir editadas". Quando tudo estiver finalizado, o botão "Entregar fotos" é liberado para o cliente baixar em alta resolução.'
      }
    ]
  },
  {
    type: 'callout',
    color: 'yellow',
    content: 'Fotos Adicionais (Upsell): Os limites e os preços de fotos extras são definidos diretamente na barra lateral de configurações. Se o cliente extrapolar a quantidade, o sistema calcula e notifica você na mesma tela, permitindo que aceite a demanda extra com um clique.'
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
