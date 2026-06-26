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
    content: 'O modo **Seleção em Grupo** permite que múltiplos clientes selecionem fotos do mesmo ensaio ou evento, cada um com seu próprio link, carrinho e privacidade total. Ideal para formaturas, eventos corporativos, turmas e qualquer trabalho com vários participantes escolhendo do mesmo álbum. O fluxo usa a mesma "Página Única" inteligente do modo Seleção normal, com um painel avançado de gerenciamento de participantes.'
  },
  {
    type: 'callout',
    color: 'accent',
    content: 'Privacidade total: Cada participante tem seu próprio código de acesso, carrinho de fotos independente e chat privado com você. Ninguém vê o que a outra pessoa selecionou, comentou ou pediu de extra — a interação é 100% individual.'
  },

  // ── PARTE 1: Criação e Configuração ──
  {
    type: 'steps',
    steps: [
      {
        n: 1,
        who: 'fotógrafo',
        title: 'Criar a Sessão',
        desc: 'Na aba **Sessões**, clique no card **"Seleção em Grupo"** no painel superior. A sessão de rascunho é criada na hora e o assistente abre automaticamente.'
      },
      {
        n: 2,
        who: 'fotógrafo',
        title: 'Configurar na Barra Lateral',
        desc: 'Na barra lateral direita, preencha: **Nome** da sessão, **Foto de Capa**, **Tipo de Evento**, **Prazo de Seleção** e **Resolução do Preview**. No modo grupo, o campo "Cliente" não aparece porque os participantes são adicionados individualmente (próximo passo). Tudo salva automaticamente.'
      },
      {
        n: 3,
        who: 'fotógrafo',
        title: 'Definir Pacote Padrão',
        desc: 'Configure **Fotos do Pacote (padrão)** e **Preço por Foto Extra (padrão)**. Esses valores serão herdados por todos os novos participantes, mas podem ser personalizados individualmente depois (veja o passo 5).'
      },
      {
        n: 4,
        who: 'fotógrafo',
        title: 'Adicionar Participantes',
        desc: 'No painel **"Progresso dos Participantes"** (abaixo do grid), clique em **"Gerenciar"** e depois em **"+ Cadastrar"** para adicionar os convidados manualmente. Preencha nome, WhatsApp e grau de parentesco (se aplicável). Cada participante recebe automaticamente um código de acesso exclusivo.'
      },
      {
        n: 5,
        who: 'fotógrafo',
        title: 'Personalizar Pacote por Pessoa',
        desc: 'Se alguém comprou um pacote diferente (ex: mais fotos), clique no **ícone de lápis (Editar)** ao lado do nome do participante. Você pode alterar individualmente as **Fotos do Pacote** e o **Preço por Foto Extra** daquela pessoa específica, sem afetar os demais.'
      }
    ]
  },

  {
    type: 'callout',
    color: 'green',
    content: 'Inscrição Automática (QR Code): Para turmas grandes ou eventos com muitos convidados, ative a **Inscrição Automática** no painel de participantes. O sistema gera um **QR Code** ou **Link aberto** que você pode imprimir e exibir no dia do evento. Os próprios convidados preenchem seus dados (nome, WhatsApp, parentesco) e entram na sessão automaticamente — sem você precisar cadastrar um por um. O sistema tem proteção contra duplicatas por WhatsApp: se a mesma pessoa escanear de novo, reutiliza o mesmo código.'
  },

  // ── PARTE 2: Upload e Compartilhamento ──
  {
    type: 'steps',
    steps: [
      {
        n: 6,
        who: 'fotógrafo',
        title: 'Upload das Fotos',
        desc: 'Na área central do grid, escolha entre **"Fotos originais"** (brutas para seleção → trata depois) ou **"Fotos já editadas"** (finalizadas). O upload é idêntico ao do modo Seleção individual — todas as fotos ficam disponíveis para todos os participantes ao mesmo tempo.'
      },
      {
        n: 7,
        who: 'fotógrafo',
        title: 'Compartilhar por Pessoa',
        desc: 'No painel de participantes, cada nome tem seus próprios botões: **WhatsApp** (abre o app com mensagem e código individual), **Copiar Link** e **Copiar Código**. Diferente do modo individual, não existe um único link "da sessão" — cada pessoa tem o seu.'
      }
    ]
  },

  // ── PARTE 3: Experiência do Cliente ──
  {
    type: 'steps',
    steps: [
      {
        n: 8,
        who: 'cliente',
        title: 'Acessar a Galeria Pessoal',
        desc: 'O participante abre o link que recebeu, digita seu código exclusivo e entra na galeria. Ele vê **todas as fotos do evento** em uma grade, mas sua interação é completamente isolada dos demais participantes.'
      },
      {
        n: 9,
        who: 'cliente',
        title: 'Selecionar, Comentar e Enviar',
        desc: 'O participante toca nos **corações** para marcar favoritas, acompanha o limite do pacote na **barra flutuante** (com custo de extras, se ultrapassar), pode deixar **comentários privados** por foto, e ao final clica em **"Enviar Seleção"**. Se pediu extras, o sistema mostra o resumo financeiro antes de confirmar.'
      },
      {
        n: 10,
        who: 'cliente',
        title: 'Pedir Fotos Extras (Pós-Seleção)',
        desc: 'Depois de enviar a seleção, se o fotógrafo permitir, o participante pode voltar à galeria e **solicitar fotos extras** individualmente. Ele marca as desejadas, vê o custo acumulado na barra flutuante e confirma o pedido. O fotógrafo recebe a solicitação para aprovar ou recusar.'
      }
    ]
  },

  {
    type: 'callout',
    color: 'yellow',
    content: 'Tabela de Preços Progressiva: Para eventos, você pode configurar uma **Tabela de Preços** na barra lateral. Exemplo: de 1 a 10 extras = R$ 30 cada; acima de 10 = R$ 25 cada. O sistema calcula automaticamente o total cumulativo para cada participante durante a seleção. Se a tabela estiver vazia, usa o preço fixo por foto extra.'
  },

  // ── PARTE 4: Acompanhamento e Entrega ──
  {
    type: 'steps',
    steps: [
      {
        n: 11,
        who: 'fotógrafo',
        title: 'Acompanhar o Progresso',
        desc: 'O painel **"Progresso dos Participantes"** mostra o status de cada pessoa: ícone de relógio (ainda escolhendo), check verde (seleção enviada), badge "📸 pediu N extra(s)" (solicitação pendente). O **polling** atualiza automaticamente o grid com as seleções em tempo real.'
      },
      {
        n: 12,
        who: 'fotógrafo',
        title: 'Aceitar/Recusar Extras por Pessoa',
        desc: 'Quando um participante solicita fotos extras, aparecem os botões **"Aceitar"** e **"Recusar Pedido"** ao lado do nome dele. A recusa exige um **motivo obrigatório** que é enviado por e-mail ao participante. Cada pessoa tem seu fluxo de extras independente.'
      },
      {
        n: 13,
        who: 'fotógrafo',
        title: 'Entregar sem Esperar Todos',
        desc: 'Você **não precisa esperar todos terminarem!** Conforme cada participante envia sua seleção, você pode: clicar no **filtro por participante** (chips com nomes na toolbar), tratar as fotos daquela pessoa, subir as **editadas**, e usar o botão **"Entregar"** individual ao lado do nome dele. Isso libera o download exclusivo apenas para aquela pessoa.'
      },
      {
        n: 14,
        who: 'fotógrafo',
        title: 'Cortesia por Participante',
        desc: 'Cada participante tem seu próprio botão **"🎁 Cortesia"** no painel. Você pode presentear pessoas específicas com fotos extras sem custo — as cortesias vão apenas para o carrinho daquela pessoa.'
      },
      {
        n: 15,
        who: 'fotógrafo',
        title: 'Entrega em Lote',
        desc: 'Se preferir entregar para várias pessoas de uma vez, marque os checkboxes ao lado dos nomes no painel de participantes e use o botão **"Entregar (N)"** no topo do painel. O sistema libera o download para todos os selecionados simultaneamente.'
      }
    ]
  },
  {
    type: 'callout',
    color: 'accent',
    content: 'Reabertura por Participante: Se um participante precisar alterar a seleção, ele pode solicitar a reabertura pela galeria. Você recebe uma notificação e pode aprovar individualmente — a sessão reabre apenas para aquela pessoa, sem afetar os demais.'
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
