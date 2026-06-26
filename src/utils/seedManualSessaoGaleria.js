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
    content: 'O modo **Galeria** é a via expressa da plataforma: feito para quando você **não precisa** que o cliente escolha fotos. Você sobe as fotos já finalizadas, compartilha o link e o cliente visualiza e baixa tudo em alta resolução. Ideal para pacotes "tudo incluso", coberturas de eventos ou portfólios públicos.'
  },
  {
    type: 'callout',
    color: 'accent',
    content: 'Página Simplificada: O fluxo acontece em apenas duas seções verticais empilhadas — "Upload de Fotos" (acima) e "Compartilhar e Entregar" (abaixo). Não existem configurações de pacote, limite de fotos ou upsell de extras neste modo. A barra lateral direita fica disponível para nome, capa, cliente e marca d\'água.'
  },

  // ── PARTE 1: Criação e Upload ──
  {
    type: 'steps',
    steps: [
      {
        n: 1,
        who: 'fotógrafo',
        title: 'Criar a Sessão',
        desc: 'Na aba **Sessões**, clique no card **"Galeria"** no painel superior. A sessão de rascunho é criada na hora e o assistente abre automaticamente. Se você fechar sem subir nenhuma foto, o rascunho é descartado sozinho.'
      },
      {
        n: 2,
        who: 'fotógrafo',
        title: 'Configurar na Barra Lateral',
        desc: 'Na barra lateral direita, defina: **Nome** da sessão (visível para o cliente), **Cliente** (vincule alguém existente ou cadastre novo), **Foto de Capa** e **Tipo de Evento**. Se desejar uma galeria com prazo de expiração, defina o **Prazo de Acesso**. A marca d\'água vem desativada por padrão na Galeria, mas pode ser ligada se quiser uma exibição sem download liberado imediatamente.'
      },
      {
        n: 3,
        who: 'fotógrafo',
        title: 'Upload das Fotos Finais',
        desc: 'Na primeira seção da tela, clique em **"Subir fotos"** e selecione os arquivos já tratados e finalizados. Como não há etapa de seleção, suba apenas o material que quer entregar ao cliente. O upload exibe uma barra de progresso para cada arquivo.'
      }
    ]
  },

  // ── PARTE 2: Compartilhar e Entregar ──
  {
    type: 'steps',
    steps: [
      {
        n: 4,
        who: 'sistema',
        title: 'Pré-requisitos para Compartilhar',
        desc: 'Assim como no modo Seleção, o sistema exige que você **vincule um cliente** e tenha **pelo menos 1 foto** antes de liberar os botões de envio. Uma faixa informativa aparece enquanto os requisitos não forem cumpridos.'
      },
      {
        n: 5,
        who: 'fotógrafo',
        title: 'Compartilhar o Link',
        desc: 'Na seção **"Compartilhar e Entregar"**, use os botões de **WhatsApp** (abre o app com mensagem pronta), **E-mail** (template personalizado) ou **Copiar Link**. Como não há seleção, o simples ato de enviar o link já é "entregar" — o cliente terá acesso direto às fotos.'
      },
      {
        n: 6,
        who: 'fotógrafo',
        title: 'Entregar e Notificar',
        desc: 'O botão **"Entregar e notificar"** envia uma notificação formal ao cliente informando que as fotos estão prontas para download. Use esse botão quando quiser que o cliente receba um aviso oficial por e-mail ou WhatsApp com o link de acesso.'
      }
    ]
  },

  // ── PARTE 3: Experiência do Cliente ──
  {
    type: 'callout',
    color: 'green',
    content: 'O que o cliente vê: Ao abrir o link, o cliente entra diretamente numa vitrine limpa com todas as fotos do evento, no tema visual do seu site. Ele pode visualizar cada foto em tamanho grande e baixar individualmente ou usar o botão de download geral (ZIP com todas).'
  },
  {
    type: 'steps',
    steps: [
      {
        n: 7,
        who: 'cliente',
        title: 'Acessar e Visualizar',
        desc: 'O cliente digita o código recebido e vê a grade completa de fotos. Não existe limite de seleção, corações ou carrinho — é uma experiência de pura **visualização e download**. Ele pode navegar livremente e ampliar qualquer foto.'
      },
      {
        n: 8,
        who: 'cliente',
        title: 'Baixar as Fotos',
        desc: 'Para baixar, o cliente pode clicar no **ícone de download** ao passar o mouse sobre cada foto (download individual em alta resolução) ou usar o **botão "Baixar todas"** no topo para receber um arquivo ZIP com o lote completo. O download é rastreado — você verá no Histórico da sessão quando e quantas vezes o cliente baixou.'
      }
    ]
  },

  {
    type: 'callout',
    color: 'yellow',
    content: 'Dica: Você pode adicionar mais fotos à galeria a qualquer momento, mesmo depois de compartilhar o link. Basta subir os novos arquivos e o cliente verá as adições automaticamente ao recarregar a página. Se quiser notificá-lo, use o botão "Re-entregar".'
  },
  {
    type: 'callout',
    color: 'accent',
    content: 'Quando usar a Galeria: Pacotes "tudo incluso" com preço fechado, coberturas de imprensa, portfólios de ensaios onde o cliente já pagou todas as fotos, ou qualquer situação em que você não precisa que o cliente passe pela etapa de escolha.'
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
