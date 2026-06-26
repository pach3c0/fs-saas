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
    content: 'O modo **Galeria em Grupo** (Multi-Galeria) une a praticidade da entrega direta da Galeria com a gestão de convidados em massa. Você sobe as fotos finais do evento e distribui links individualizados para várias pessoas de uma vez — cada participante acessa, visualiza e baixa sem etapa de seleção. Perfeito para formaturas com pacote pago antecipado, festas corporativas ou qualquer cobertura onde você quer simplesmente entregar as fotos prontas para um grupo.'
  },
  {
    type: 'callout',
    color: 'accent',
    content: 'Fluxo expresso: Diferente da Seleção em Grupo, aqui ninguém tem carrinho, corações, limites de extras ou comentários por foto. Você simplesmente sobe as fotos finais do evento e distribui. As duas seções verticais são: "Upload de Fotos" e "Compartilhar com os Convidados".'
  },

  // ── PARTE 1: Criação, Upload e Cadastro ──
  {
    type: 'steps',
    steps: [
      {
        n: 1,
        who: 'fotógrafo',
        title: 'Criar a Sessão',
        desc: 'Na aba **Sessões**, clique no card **"Galeria em Grupo"** no painel superior. A sessão de rascunho é criada na hora e o assistente abre com as duas seções prontas.'
      },
      {
        n: 2,
        who: 'fotógrafo',
        title: 'Configurar na Barra Lateral',
        desc: 'Na barra lateral direita, defina: **Nome** da sessão, **Foto de Capa** e **Tipo de Evento**. Como é galeria (entrega direta), não há campos de pacote, preço de extras ou resolução de preview — os arquivos são entregues na resolução original.'
      },
      {
        n: 3,
        who: 'fotógrafo',
        title: 'Upload das Fotos Finais',
        desc: 'Na primeira seção, clique em **"Subir fotos"** e selecione os arquivos já tratados do evento. Como não haverá etapa de seleção, suba exclusivamente o material finalizado que todos verão.'
      },
      {
        n: 4,
        who: 'fotógrafo',
        title: 'Cadastrar Participantes (Manual)',
        desc: 'Na seção **"Compartilhar com os Convidados"**, clique em **"Gerenciar"** e depois em **"+ Cadastrar"**. Preencha nome, WhatsApp e grau de parentesco (opcional) de cada convidado. Cada um recebe um código de acesso exclusivo automaticamente.'
      }
    ]
  },

  {
    type: 'callout',
    color: 'green',
    content: 'Inscrição Automática (QR Code): Para eventos com muitos convidados, ative a **Inscrição Automática** no painel de participantes. Imprima o **QR Code** ou compartilhe o **Link de inscrição** no dia da festa. Os convidados preenchem seus dados e entram na lista por conta própria. Se ativada, a pessoa já cai na vitrine de fotos logo após preencher os dados — sem você precisar disparar nada manualmente! O sistema detecta duplicatas por WhatsApp: se a mesma pessoa escanear de novo, reutiliza o mesmo código.'
  },

  // ── PARTE 2: Distribuição ──
  {
    type: 'steps',
    steps: [
      {
        n: 5,
        who: 'fotógrafo',
        title: 'Distribuir Links Individuais',
        desc: 'No painel de convidados, cada participante tem seus próprios botões: **WhatsApp** (abre o app com mensagem e código individual), **Copiar Link** e **Copiar Código**. Se você ativou a auto-inscrição, quem se cadastrou pelo QR já recebeu o acesso automaticamente — nesses casos, você não precisa enviar nada manualmente.'
      },
      {
        n: 6,
        who: 'fotógrafo',
        title: 'Entrega em Lote (Opcional)',
        desc: 'Se quiser enviar uma notificação formal para várias pessoas ao mesmo tempo, marque os checkboxes ao lado dos nomes e use o botão **"Entregar (N)"** no topo do painel de participantes. Isso dispara e-mail/WhatsApp de aviso para todos os selecionados.'
      }
    ]
  },

  // ── PARTE 3: Experiência do Cliente ──
  {
    type: 'steps',
    steps: [
      {
        n: 7,
        who: 'cliente',
        title: 'Acessar e Visualizar',
        desc: 'O convidado abre o link recebido (ou o que apareceu após a auto-inscrição), digita o código e entra diretamente na **grade de fotos** do evento. A experiência é limpa: sem caixas de avisos, pacotes, seleções ou carrinhos — apenas as fotos finais.'
      },
      {
        n: 8,
        who: 'cliente',
        title: 'Baixar as Fotos',
        desc: 'O convidado pode baixar fotos individualmente (ícone de download em cada foto) ou usar o botão **"Baixar todas"** no topo para receber um ZIP com todo o conteúdo. O download é rastreado no Histórico da sessão — você verá quando e quantas vezes cada pessoa baixou.'
      }
    ]
  },

  {
    type: 'callout',
    color: 'yellow',
    content: 'Dica: Você pode adicionar mais fotos a qualquer momento. Basta subir novos arquivos na seção de Upload — todos os participantes verão as adições automaticamente ao recarregar a página. É possível também adicionar novos participantes depois (manualmente ou pelo QR Code).'
  },
  {
    type: 'callout',
    color: 'accent',
    content: 'Quando usar a Galeria em Grupo: Formaturas em que os pais já pagaram a cota antecipada do pacote integral, festas corporativas com cobertura contratada pela empresa, eventos sociais onde todos os convidados têm direito às fotos, ou qualquer situação em que você quer distribuir fotos prontas para muitas pessoas sem etapa de escolha.'
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
