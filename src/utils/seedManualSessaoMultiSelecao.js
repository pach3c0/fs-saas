/**
 * Script standalone — cria/atualiza o módulo de manual "Sessão: Seleção em Grupo" a partir da
 * varredura do código real (admin/js/tabs/sessoes/wizard/multi-single-page.js). 
 * Nasce como RASCUNHO (isPublished:false) para o superadmin revisar e publicar.
 * Uso: node src/utils/seedManualSessaoMultiSelecao.js
 * Idempotente: re-executar atualiza o conteúdo, preserva isPublished e order.
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: true });

const mongoose = require('mongoose');
const ManualModule = require('../models/ManualModule');

const ID = 'sessao_multi_selecao';
const LABEL = 'Sessão: Seleção em Grupo';
const ICON = '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>';

const BLOCKS = [
  {
    type: 'intro',
    content: 'O modo Seleção em Grupo permite que múltiplos clientes selecionem fotos do mesmo ensaio (ideal para formaturas, eventos corporativos ou turmas). O fluxo baseia-se na mesma "Página Única" inteligente do modo Seleção normal, mas com um gerenciamento avançado de Participantes.'
  },
  {
    type: 'callout',
    color: 'accent',
    content: 'Dica de Ouro: Cada participante tem seu próprio link exclusivo, carrinho de fotos extras, e privacidade total. Ninguém vê o que a outra pessoa selecionou ou comentou!'
  },
  {
    type: 'steps',
    steps: [
      {
        n: 1,
        who: 'fotógrafo',
        title: 'Gerenciando os Participantes',
        desc: 'Na barra lateral direita, você pode adicionar participantes manualmente no botão **+ Cadastrar**. Para turmas grandes, ative a **Inscrição Automática**: gere um QR Code ou Link aberto e deixe que os próprios convidados preencham seus dados para entrar na sessão.'
      },
      {
        n: 2,
        who: 'fotógrafo',
        title: 'Pacotes e Preços Individuais',
        desc: 'Ainda na barra lateral, você define o "Pacote Padrão" da sessão. Porém, se alguém comprou mais fotos antes, você pode editar o pacote de uma pessoa específica clicando no ícone de lápis ao lado do nome dela.'
      },
      {
        n: 3,
        who: 'fotógrafo',
        title: 'Compartilhamento Exclusivo',
        desc: 'Ao contrário da sessão normal, o botão de Compartilhar gera links separados. Na lista de participantes, cada nome tem seu próprio botão de WhatsApp e copiar link. O sistema envia a pessoa direto para a galeria pessoal dela.'
      },
      {
        n: 4,
        who: 'cliente',
        title: 'Escolha e Interação Privada',
        desc: 'Cada participante navega pelas mesmas fotos do evento, mas as marcações e os chats de balãozinho só aparecem entre ele e você. Nenhuma interação é compartilhada com o grupo.'
      },
      {
        n: 5,
        who: 'fotógrafo',
        title: 'Entregas por Pessoa (sem esperar!)',
        desc: 'Você não precisa esperar todos terminarem! Conforme as pessoas forem clicando em "Enviar Seleção", você pode tratar as fotos individuais de quem terminou, subir as **Fotos Editadas**, e usar o botão Entregar para liberar o link de download exclusivo apenas para aquela pessoa.'
      }
    ]
  },
  {
    type: 'callout',
    color: 'green',
    content: 'Upsell (Tabela de Preços): Para eventos, você pode configurar uma Tabela de Preços progressiva. Exemplo: até 10 fotos extras custam R$ 30, e acima de 10 custam R$ 25. O sistema vai calcular e somar o total individualmente para cada participante durante a seleção deles.'
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
