/**
 * Script standalone — cria/atualiza o módulo de manual "Sessão: Galeria em Grupo" a partir da
 * varredura do código real. Nasce como RASCUNHO (isPublished:false) para o superadmin 
 * revisar e publicar.
 * Uso: node src/utils/seedManualSessaoMultiGaleria.js
 * Idempotente: re-executar atualiza o conteúdo, preserva isPublished e order.
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: true });

const mongoose = require('mongoose');
const ManualModule = require('../models/ManualModule');

const ID = 'sessao_multi_galeria';
const LABEL = 'Sessão: Galeria em Grupo';
const ICON = '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>';

const BLOCKS = [
  {
    type: 'intro',
    content: 'O modo Galeria em Grupo (Multi-Galeria) une a praticidade da entrega direta da Galeria com a gestão de convidados em massa. É perfeito para cobrir eventos onde você quer simplesmente distribuir as fotos finais para várias pessoas de uma vez, mantendo links de acesso individualizados para cada participante.'
  },
  {
    type: 'callout',
    color: 'accent',
    content: 'Fluxo Expresso: Diferente da Seleção em Grupo, aqui ninguém tem carrinho, opções de curtir fotos ou limites de extras. Você simplesmente sobe as fotos finais do evento e distribui.'
  },
  {
    type: 'steps',
    steps: [
      {
        n: 1,
        who: 'fotógrafo',
        title: 'Upload das Fotos (Somente as Finais)',
        desc: 'Na primeira seção, faça o upload direto das fotos já tratadas do evento. Como não haverá etapa de seleção, não faz sentido subir o material bruto aqui.'
      },
      {
        n: 2,
        who: 'fotógrafo',
        title: 'Auto-inscrição e Cadastro',
        desc: 'Na barra lateral, você cadastra manualmente as pessoas que receberão o link ou, o mais prático para grandes eventos, ativa a **Inscrição Automática**. Assim, basta imprimir um QR Code no dia da festa para os convidados entrarem na lista de participantes por conta própria.'
      },
      {
        n: 3,
        who: 'fotógrafo',
        title: 'Distribuição Múltipla',
        desc: 'No bloco Compartilhar, você notará que cada participante tem o próprio ícone do WhatsApp e opção de copiar link. Se você ativou a auto-inscrição, a pessoa já cai na vitrine logo após preencher os dados, sem você precisar disparar nada manualmente!'
      },
      {
        n: 4,
        who: 'cliente',
        title: 'Visualização Limpa',
        desc: 'O cliente abre o link que recebeu e imediatamente se depara com a grade de fotos do evento. Ele tem total liberdade para baixar o conteúdo que ele desejar, sem caixas de avisos, pacotes ou seleções.'
      }
    ]
  },
  {
    type: 'callout',
    color: 'green',
    content: 'Dica: Use esse modo para formaturas em que os pais já pagaram a cota antecipada do pacote integral, ou coberturas de festas corporativas.'
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
