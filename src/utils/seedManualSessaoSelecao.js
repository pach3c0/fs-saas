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
    content: 'O modo **Seleção** é o fluxo principal da plataforma para quem trabalha com ensaios e eventos individuais. Você sobe as fotos (originais ou já editadas), compartilha um código de acesso com o seu cliente, e ele escolhe as favoritas dentro do pacote contratado. Depois, você trata as selecionadas, sobe as versões finais e entrega — tudo sem sair de uma única tela.'
  },
  {
    type: 'callout',
    color: 'accent',
    content: 'Tela única: O fluxo inteiro acontece na seção "Fotos da Sessão", com a barra lateral de Configurações sempre visível à direita. Abaixo do grid de fotos fica o painel colapsável "Compartilhar com o cliente" (link, WhatsApp, e-mail). Não existe mais navegação em passos — tudo é feito na mesma página.'
  },

  // ── PARTE 1: Criação e Configuração ──
  {
    type: 'steps',
    steps: [
      {
        n: 1,
        who: 'fotógrafo',
        title: 'Criar a Sessão',
        desc: 'Na aba **Sessões**, clique no card **"Seleção"** no painel superior. Uma sessão de rascunho é criada na hora e o assistente abre automaticamente. Se você fechar sem subir nenhuma foto, o rascunho é descartado sozinho.'
      },
      {
        n: 2,
        who: 'fotógrafo',
        title: 'Configurar na Barra Lateral',
        desc: 'Na barra lateral direita, preencha: **Nome** da sessão (aparece para o cliente), **Cliente** (busque pelo nome ou cadastre um novo), **Foto de Capa** (ilustra o card na lista), **Tipo de Evento**, **Prazo de Seleção** (data limite para o cliente escolher) e **Resolução do Preview** (tamanho das fotos que o cliente visualiza com marca d\'água). Tudo salva automaticamente ao digitar — sem botão "Salvar".'
      },
      {
        n: 3,
        who: 'fotógrafo',
        title: 'Definir Pacote e Preço de Extras',
        desc: 'Ainda na barra lateral, configure **Fotos do Pacote** (quantas estão incluídas no contrato) e **Preço por Foto Extra** (quanto cada foto adicional custará se o cliente quiser mais). Esses valores são exibidos ao cliente na barra flutuante durante a seleção.'
      },
      {
        n: 4,
        who: 'fotógrafo',
        title: 'Escolher o Caminho de Upload',
        desc: 'Na área central, você verá dois cards: **"Fotos originais (sem edição)"** — suba os arquivos brutos para o cliente escolher e depois edite só as selecionadas; ou **"Fotos já editadas"** — ideal se você já tratou todo o material antes e quer pular o re-upload no final. Escolha um caminho e selecione os arquivos.'
      },
      {
        n: 5,
        who: 'fotógrafo',
        title: 'Organizar o Grid de Fotos',
        desc: 'Após o upload, todas as fotos aparecem no grid unificado. Use os **filtros rápidos** na toolbar ("Todas", "Selecionadas", "Editadas", "Ocultas") para navegar. Se precisar esconder alguma foto do cliente sem deletá-la, passe o mouse e clique em **"Ocultar foto"** — ela ficará com opacidade reduzida e invisível para o cliente.'
      }
    ]
  },

  {
    type: 'callout',
    color: 'yellow',
    content: 'Bloqueios automáticos 🔒: Após o primeiro upload, o campo "Resolução do Preview" trava — não é possível alterar depois. O "Modo da Sessão" também fica bloqueado após o cliente começar a escolher. Isso previne quebras de estado. Se precisar mudar, será necessário criar uma nova sessão.'
  },

  // ── PARTE 2: Compartilhamento ──
  {
    type: 'steps',
    steps: [
      {
        n: 6,
        who: 'sistema',
        title: 'Pré-requisitos para Compartilhar',
        desc: 'Antes de liberar o acesso, o sistema exibe uma **faixa laranja** com os itens pendentes: você precisa **vincular um cliente** na barra lateral e ter **pelo menos 1 foto visível** na sessão. Enquanto não cumprir ambos, os botões de envio ficam travados.'
      },
      {
        n: 7,
        who: 'fotógrafo',
        title: 'Enviar o Código de Acesso',
        desc: 'Cumpridos os requisitos, abra o painel **"Compartilhar com o cliente"** (abaixo do grid). Você pode: **Copiar o link** direto, enviar via **WhatsApp** (abre o app com a mensagem pronta contendo o código) ou enviar por **E-mail** (com template personalizado). O código é único e intransferível.'
      }
    ]
  },

  // ── PARTE 3: Experiência do Cliente ──
  {
    type: 'callout',
    color: 'green',
    content: 'O que o cliente vê: O cliente NÃO acessa o painel admin. Ele abre o link recebido, insere o código de acesso e entra numa galeria limpa, no tema visual do seu site, rodando como um app (PWA) — funciona inclusive offline depois do primeiro acesso.'
  },
  {
    type: 'steps',
    steps: [
      {
        n: 8,
        who: 'cliente',
        title: 'Acessar a Galeria e Navegar',
        desc: 'O cliente digita o código recebido e vê todas as fotos visíveis da sessão em uma grade. As fotos aparecem na resolução de preview que você configurou, com marca d\'água sobreposta (se ativa). Ele pode ampliar cada foto tocando/clicando nela.'
      },
      {
        n: 9,
        who: 'cliente',
        title: 'Selecionar Favoritas (Corações)',
        desc: 'Para marcar uma foto, o cliente toca no ícone de **coração** (ou carrinho, conforme configurado). Na parte inferior da tela, uma **barra flutuante** mostra em tempo real: quantas fotos já foram marcadas, o limite do pacote contratado, e o custo acumulado de fotos extras (se ultrapassar o pacote).'
      },
      {
        n: 10,
        who: 'cliente',
        title: 'Comentários por Foto',
        desc: 'Se a opção "Mensagens por foto" estiver ativa nas configurações, cada foto terá um ícone de balãozinho. O cliente pode abrir e escrever um comentário privado (ex: "gostei dessa, mas pode clarear?"). Esses comentários são visíveis apenas entre o cliente e você.'
      },
      {
        n: 11,
        who: 'cliente',
        title: 'Enviar a Seleção',
        desc: 'Quando estiver satisfeito, o cliente clica em **"Enviar Seleção"** na barra flutuante. Se escolheu mais fotos que o pacote, o sistema mostra o resumo financeiro das extras antes de confirmar. Após enviar, a seleção fica travada — ele não pode mais alterar (a menos que você reabra).'
      }
    ]
  },

  // ── PARTE 4: Acompanhamento, Edição e Entrega ──
  {
    type: 'steps',
    steps: [
      {
        n: 12,
        who: 'sistema',
        title: 'Acompanhamento em Tempo Real (Polling)',
        desc: 'Enquanto o cliente está escolhendo, o sistema atualiza automaticamente o grid a cada 30 segundos (e a cada 10 segundos em janelas de atividade intensa). Você verá as fotos marcadas com **borda amarela** (selecionadas) aparecendo ao vivo, sem precisar recarregar.'
      },
      {
        n: 13,
        who: 'fotógrafo',
        title: 'Aceitar ou Recusar Fotos Extras',
        desc: 'Se o cliente pediu fotos além do pacote, você recebe uma notificação. No painel de status, aparecerão os botões **"Aceitar"** (as extras passam a integrar a seleção) e **"Recusar Pedido"** (com campo para justificativa — o motivo é enviado por e-mail ao cliente).'
      },
      {
        n: 14,
        who: 'fotógrafo',
        title: 'Exportar para Lightroom',
        desc: 'Para facilitar a edição, clique em **"Exportar para Lightroom (.txt)"** — o sistema baixa um arquivo de texto com os nomes exatos das fotos selecionadas. Use esse arquivo para filtrar no Lightroom e tratar apenas as que o cliente escolheu.'
      },
      {
        n: 15,
        who: 'fotógrafo',
        title: 'Subir Fotos Editadas',
        desc: 'Após tratar as fotos, clique em **"Subir editadas"** na toolbar. O sistema cruza automaticamente pelo **nome do arquivo** — a foto editada "DSC_1234.jpg" substitui o preview de "DSC_1234.jpg". Fotos editadas ganham uma **borda verde** no grid. Se um arquivo não tiver correspondente, o sistema avisa para você decidir.'
      },
      {
        n: 16,
        who: 'fotógrafo',
        title: 'Dar Cortesia (Fotos-Presente)',
        desc: 'Quer presentear o cliente com fotos fora da seleção? Clique no botão **"🎁 Dar cortesia"** na toolbar, marque as fotos desejadas e confirme. Elas ganham uma **borda roxa com estrela (★ Cortesia)** e serão incluídas na entrega final junto com as selecionadas, sem custo extra para o cliente.'
      },
      {
        n: 17,
        who: 'fotógrafo',
        title: 'Entregar Fotos ao Cliente',
        desc: 'Quando todas as selecionadas (e cortesias) estiverem com a versão editada pronta (borda verde), o botão **"Entregar fotos"** aparece na toolbar. Clique nele para liberar o download em alta resolução. O cliente recebe uma notificação (e-mail/WhatsApp) com o link para baixar. O botão muda para **"Re-entregar"** caso você precise adicionar mais fotos depois.'
      }
    ]
  },
  {
    type: 'callout',
    color: 'accent',
    content: 'Reabertura: Se o cliente precisar alterar a seleção depois de enviar, ele pode solicitar a reabertura pela galeria. Você recebe uma notificação e pode aprovar — a sessão volta para "Em Seleção" temporariamente. O prazo de reabertura é controlado nas configurações da sessão.'
  },
  {
    type: 'callout',
    color: 'yellow',
    content: 'Automação de Vendas: Na barra lateral, a seção "Vendas" ativa o robô de e-mails de urgência. Conforme o prazo de seleção se aproxima, o sistema envia lembretes automáticos ao cliente para que ele não perca a data limite.'
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
