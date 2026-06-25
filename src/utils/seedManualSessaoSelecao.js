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
    content: 'O modo Seleção é focado em guiar o seu cliente para escolher as fotos favoritas dentro de um limite de prazo. Criamos um Passo a Passo (Wizard) que acompanha você desde o upload das fotos brutas até a entrega do material editado final, garantindo que nada passe batido.'
  },
  {
    type: 'callout',
    color: 'accent',
    content: 'Dica: O fluxo é dividido em 5 etapas no topo da tela (Upload → Compartilhar → Acompanhar → Editadas → Entregar). Você só avança para a próxima etapa quando concluir a atual.'
  },
  {
    type: 'steps',
    steps: [
      {
        n: 1,
        who: 'fotógrafo',
        title: 'Passo 1: Upload (Fotos Brutas)',
        desc: 'Abra a sessão e clique em **Subir fotos**. Faça o upload das suas imagens originais (brutas). Quando terminar de enviar todas as fotos do ensaio, clique no botão superior **Concluí upload** para travar esta fase e liberar o compartilhamento.'
      },
      {
        n: 2,
        who: 'fotógrafo',
        title: 'Passo 2: Compartilhar',
        desc: 'Nesta etapa, o sistema gera o código de acesso único do cliente. Use os botões **E-mail** ou **WhatsApp** para enviar o convite. O texto já vai pronto com o link do seu negócio, código da sessão e a data limite que você definiu.'
      },
      {
        n: 3,
        who: 'cliente',
        title: 'Seleção do Cliente',
        desc: 'O cliente acessa o link, digita o código e entra na galeria. Ele navega pelas fotos, marca suas favoritas clicando no coração, e clica em "Enviar Seleção" quando terminar.'
      },
      {
        n: 4,
        who: 'fotógrafo',
        title: 'Passo 3: Acompanhar',
        desc: 'Enquanto o cliente escolhe, a etapa **Acompanhar** mostra a barra de progresso em tempo real. Se o cliente deixar comentários (ícone de balão), você pode ler e responder por aqui. Quando o cliente finalizar, a sessão é enviada de volta para você. Se precisar, você também pode clicar em **Travar e iniciar edição** para forçar o encerramento do prazo.'
      },
      {
        n: 5,
        who: 'fotógrafo',
        title: 'Passo 4: Editadas',
        desc: 'Baixe o **Arquivo .txt** com os nomes das fotos selecionadas e use no Lightroom para filtrar a sua biblioteca. Edite as fotos e depois clique em **Subir fotos tratadas**. O painel vai automaticamente identificar as fotos e sobrepor as versões brutas.'
      },
      {
        n: 6,
        who: 'fotógrafo',
        title: 'Passo 5: Entregar',
        desc: 'Com todas as fotos escolhidas já tratadas, o botão **Entregar e notificar cliente** é liberado. Ao clicar nele, o cliente recebe um e-mail avisando que o álbum final está pronto para download em alta resolução. Você também pode usar a opção "Compartilhar entrega" via WhatsApp nesta tela.'
      }
    ]
  },
  {
    type: 'callout',
    color: 'yellow',
    content: 'Fotos Adicionais (Upsell): Se o cliente escolher mais fotos do que o pacote contratado, o sistema avisa e calcula o valor extra. No passo de Acompanhamento, você verá a solicitação e poderá Aceitar ou Recusar as fotos extras antes de iniciar as edições.'
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
