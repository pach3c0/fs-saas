require('dotenv').config();
const mongoose = require('mongoose');
const ManualModule = require('../src/models/ManualModule');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cliquezoom-dev';

// ─── Ícones Lucide (SVG path inline) ────────────────────────────────────────
const ICONS = {
  dashboard:    '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  sessoes:      '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  clientes:     '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  mensagens:    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  gestao:       '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  'meu-site':   '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  dominio:      '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  integracoes:  '<path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/>',
  marketing:    '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  perfil:       '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  plano:        '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
};

// ─── Definição dos módulos ───────────────────────────────────────────────────
const MODULES = [

  // ── 1. DASHBOARD ────────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: ICONS.dashboard,
    order: 0,
    isPublished: true,
    blocks: [
      {
        type: 'intro',
        content: 'O Dashboard é a primeira tela que você vê ao entrar no CliqueZoom. Ele reúne em um só lugar os indicadores mais importantes do seu negócio, as sessões mais recentes e atalhos para as ações do dia a dia.',
      },
      {
        type: 'callout',
        color: 'yellow',
        content: 'Checklist de Boas-Vindas: na sua primeira semana, um card de onboarding aparece no topo com 3 tarefas sugeridas (criar uma sessão, subir fotos e enviar um link). Ele some automaticamente assim que você conclui os passos.',
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'fotógrafo',
            color: 'accent',
            title: 'KPI — Total de Sessões',
            desc: 'Exibe quantas sessões foram criadas na sua conta (todos os modos: Seleção, Galeria e Multi-Seleção). Clique no número para ir direto à lista de sessões.',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'accent',
            title: 'KPI — Fotos Enviadas',
            desc: 'Total de arquivos de preview que foram subidos. Lembre-se: o sistema guarda o original em alta resolução separado; este número conta os previews com marca d\'água.',
          },
          {
            n: 3,
            who: 'fotógrafo',
            color: 'accent',
            title: 'KPI — Espaço Usado',
            desc: 'Soma do armazenamento consumido pela sua conta (previews + originais + fotos editadas). O limite depende do seu plano. Quando estiver próximo de 90%, o sistema alerta antes de bloquear novos uploads.',
          },
          {
            n: 4,
            who: 'fotógrafo',
            color: 'green',
            title: 'KPI — Entregues',
            desc: 'Número de sessões que foram marcadas como "Entregue" — ou seja, o cliente já recebeu as fotos editadas sem marca d\'água. É o seu indicador de trabalhos concluídos.',
          },
        ],
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Botão "Nova Sessão"',
            desc: 'Atalho rápido que abre o modal de criação de sessão. Equivale a clicar em "Sessões" no menu lateral e depois em "+ Nova Sessão".',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Botão "Ver meu Site"',
            desc: 'Abre o seu site público em uma nova aba. Útil para conferir como seus clientes estão vendo o site antes de divulgar.',
          },
          {
            n: 3,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Sessões Recentes',
            desc: 'Lista as últimas 5 sessões criadas, com nome, modo e status. Clicar em qualquer uma abre o wizard daquela sessão no ponto em que estava.',
          },
        ],
      },
      {
        type: 'callout',
        color: 'green',
        content: 'Dica de rotina: abra o Dashboard toda semana e verifique quantas sessões ainda estão com status "Em seleção" ou "Código enviado". Clientes que demoraram mais de 7 dias sem responder podem precisar de um lembrete no WhatsApp.',
      },
    ],
  },

  // ── 2. SESSÕES ──────────────────────────────────────────────────────────────
  {
    id: 'sessoes',
    label: 'Sessões',
    icon: ICONS.sessoes,
    order: 1,
    isPublished: true,
    blocks: [
      {
        type: 'intro',
        content: 'Sessões é o coração do CliqueZoom. Aqui você cria, acompanha e entrega seus trabalhos. Cada sessão tem um wizard (assistente passo a passo) com um painel de configurações que salva automaticamente a cada mudança.',
      },
      {
        type: 'callout',
        color: 'accent',
        content: 'Há três modos de sessão: Seleção (o cliente escolhe as fotos), Galeria (entrega direta sem seleção) e Multi-Seleção (vários participantes selecionam individualmente). O modo é escolhido na criação e não pode ser alterado depois que o cliente acessar.',
      },

      // ── Modo Seleção ──
      {
        type: 'callout',
        color: 'green',
        content: 'Modo SELEÇÃO — ideal para ensaios, newborn, famílias e casamentos. O cliente vê as fotos com marca d\'água e escolhe as que quer dentro do pacote contratado.',
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Criar a sessão',
            desc: 'Clique em "+ Nova Sessão", preencha o nome da sessão, selecione o modo "Seleção" e, opcionalmente, vincule um cliente cadastrado. Clique em "Criar".',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Passo "Fotos" — Upload dos originais',
            desc: 'Arraste as fotos brutas para a área ou clique para selecionar. O sistema gera automaticamente um preview reduzido na resolução configurada (ex.: 1200px). Os arquivos originais em alta resolução ficam guardados separadamente.',
          },
          {
            n: 3,
            who: 'sistema',
            color: 'yellow',
            title: 'Marca d\'água aplicada automaticamente',
            desc: 'Cada preview recebe a marca d\'água que você configurou no Perfil. O cliente nunca vê a foto limpa antes da entrega — mesmo que tente salvar a imagem da tela, só terá o preview com marca.',
          },
          {
            n: 4,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Passo "Compartilhar" — Enviar o código',
            desc: 'Copie o código de acesso gerado e envie ao cliente. Use o botão "Enviar via WhatsApp" para abrir o app com uma mensagem pronta, ou "Enviar por E-mail" para disparar pelo sistema. O código é único para esta sessão.',
          },
          {
            n: 5,
            who: 'cliente',
            color: 'accent',
            title: 'Cliente acessa a galeria',
            desc: 'O cliente acessa app.cliquezoom.com.br (ou o link enviado), digita o código e vê todas as fotos com marca d\'água. Ele pode navegar livremente antes de começar a selecionar.',
          },
          {
            n: 6,
            who: 'cliente',
            color: 'accent',
            title: 'Cliente seleciona as fotos',
            desc: 'O cliente clica nas fotos que deseja — elas vão para a área "Selecionadas". A barra inferior mostra quantas foram escolhidas em relação ao pacote. Se a venda de extras estiver ativada, o cliente pode adicionar fotos além do pacote e o sistema calcula o valor automaticamente.',
          },
          {
            n: 7,
            who: 'cliente',
            color: 'green',
            title: 'Cliente confirma a seleção',
            desc: 'Ao clicar em "Confirmar Seleção", o cliente envia a lista para você. Após confirmar, ele não pode alterar a seleção — a não ser que você abra novamente (botão "Reabrir" no passo Acompanhar).',
          },
          {
            n: 8,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Passo "Acompanhar" — Ver quais fotos foram escolhidas',
            desc: 'Veja exatamente quais fotos o cliente selecionou, quantas extras pediu e se deixou comentários em alguma foto. Exporte a lista para o Lightroom com um clique (botão "Exportar para Lightroom").',
          },
          {
            n: 9,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Passo "Editadas" — Upload das fotos tratadas',
            desc: 'Edite as fotos no Lightroom/Photoshop e suba os arquivos finais aqui. O sistema vincula automaticamente cada editada ao original correspondente pelo nome de arquivo. Fotos não selecionadas que você incluir aparecem como Cortesia (sem custo para o cliente).',
          },
          {
            n: 10,
            who: 'fotógrafo',
            color: 'green',
            title: 'Botão "Entregar e Notificar"',
            desc: 'Confirma a entrega. O cliente recebe um e-mail/WhatsApp avisando que as fotos estão prontas. A partir deste momento, as fotos aparecem SEM marca d\'água para o cliente.',
          },
          {
            n: 11,
            who: 'cliente',
            color: 'green',
            title: 'Cliente baixa as fotos',
            desc: 'O cliente acessa a galeria com o mesmo código, agora vê as fotos editadas sem marca d\'água e pode baixar individualmente ou em ZIP completo.',
          },
        ],
      },
      {
        type: 'callout',
        color: 'yellow',
        content: 'Fotos não selecionadas pelo cliente que você subir nas "Editadas" viram Cortesia automaticamente — ou seja, o cliente recebe de brinde. Você pode remover essas cortesias antes de entregar, se quiser.',
      },

      // ── Modo Galeria ──
      {
        type: 'callout',
        color: 'green',
        content: 'Modo GALERIA — ideal para entregas diretas: corporativo, imprensa, ensaios já prontos. O cliente baixa as fotos diretamente, sem precisar fazer seleção.',
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Criar sessão em modo Galeria',
            desc: 'No modal de criação, selecione o modo "Galeria". Não há pacote de fotos nem seleção — você entrega o que subir.',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Subir as fotos já editadas',
            desc: 'No passo "Fotos", envie os arquivos prontos. Como não há seleção, você já sobe a versão final que quer entregar.',
          },
          {
            n: 3,
            who: 'fotógrafo',
            color: 'green',
            title: 'Compartilhar e entregar',
            desc: 'No passo "Compartilhar", clique em "Compartilhar e Entregar". O código é enviado ao cliente e as fotos ficam disponíveis sem marca d\'água imediatamente.',
          },
          {
            n: 4,
            who: 'cliente',
            color: 'accent',
            title: 'Cliente baixa direto',
            desc: 'Com o código em mãos, o cliente acessa a galeria e baixa todas as fotos de uma vez ou individualmente. Não há etapa de seleção.',
          },
        ],
      },

      // ── Modo Multi-Seleção ──
      {
        type: 'callout',
        color: 'green',
        content: 'Modo MULTI-SELEÇÃO — ideal para formaturas, shows e eventos com múltiplos participantes. Cada pessoa recebe um código único e seleciona suas próprias fotos independentemente.',
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Criar sessão em modo Multi-Seleção',
            desc: 'No modal de criação, selecione "Multi-Seleção". Configure o pacote padrão e o preço de foto extra — você pode ajustar individualmente por participante depois.',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Upload de todas as fotos do evento',
            desc: 'Suba todas as fotos do evento de uma vez. O sistema exibe todas para todos os participantes — cada um escolhe dentro do que foi tirado.',
          },
          {
            n: 3,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Passo "Compartilhar" — Adicionar participantes',
            desc: 'Adicione participantes manualmente (nome + WhatsApp/e-mail) ou compartilhe o QR Code de auto-inscrição para que cada pessoa se cadastre sozinha. Cada participante recebe um código único.',
          },
          {
            n: 4,
            who: 'cliente',
            color: 'accent',
            title: 'Cada participante seleciona suas fotos',
            desc: 'Usando o código próprio, cada participante acessa a galeria e seleciona independentemente. As seleções não interferem entre si.',
          },
          {
            n: 5,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Passo "Acompanhar" — Tabela de participantes',
            desc: 'Veja o status de cada participante em tempo real: Pendente, Selecionando ou Pronto. A tabela atualiza a cada 30 segundos. Você pode enviar lembrete ou reabrir a seleção de um participante específico.',
          },
          {
            n: 6,
            who: 'fotógrafo',
            color: 'green',
            title: 'Entregar por participante',
            desc: 'No passo "Editadas", você sobe e entrega as fotos de cada participante individualmente. O botão "Entregar" aparece por pessoa — assim quem está pronto já recebe, sem esperar os demais.',
          },
        ],
      },
      {
        type: 'callout',
        color: 'red',
        content: 'A resolução de preview (960px, 1200px, 1400px ou 1600px) é definida no painel de configurações da sessão e NÃO pode ser alterada após o primeiro upload. Escolha antes de subir qualquer foto.',
      },
    ],
  },

  // ── 3. CLIENTES ─────────────────────────────────────────────────────────────
  {
    id: 'clientes',
    label: 'Clientes',
    icon: ICONS.clientes,
    order: 2,
    isPublished: true,
    blocks: [
      {
        type: 'intro',
        content: 'A aba Clientes reúne o cadastro de todas as pessoas com quem você trabalha. Vincular um cliente a uma sessão facilita o envio do código de acesso e mantém o histórico de trabalhos por pessoa.',
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Cadastrar novo cliente',
            desc: 'Clique em "+ Novo Cliente", preencha nome, e-mail e WhatsApp (pelo menos um dos dois é obrigatório para envio automático). Clique em "Salvar".',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Vincular cliente a uma sessão',
            desc: 'Na criação da sessão (modal) ou no painel de configurações do wizard, use o campo "Cliente" para buscar e vincular. O nome do cliente aparece no card da sessão na lista.',
          },
          {
            n: 3,
            who: 'sistema',
            color: 'green',
            title: 'Envio automático do código',
            desc: 'Ao vincular um cliente com WhatsApp cadastrado e clicar em "Enviar via WhatsApp" no passo Compartilhar, o número é preenchido automaticamente — você só confirma o envio.',
          },
          {
            n: 4,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Ver histórico de sessões do cliente',
            desc: 'No card do cliente, clique em "Ver sessões" para listar todos os trabalhos realizados com aquela pessoa, com status e data.',
          },
          {
            n: 5,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Editar ou arquivar cliente',
            desc: 'Clique no menu (···) no canto do card para editar os dados ou arquivar o cliente. Clientes arquivados não aparecem na busca ao criar sessão, mas o histórico é preservado.',
          },
        ],
      },
      {
        type: 'callout',
        color: 'green',
        content: 'Integração com Gestão: clientes cadastrados aqui também aparecem no ERP (aba Gestão) como Clientes do Rhyno. O cadastro é unificado — não precisa criar duas vezes.',
      },
    ],
  },

  // ── 4. MENSAGENS ────────────────────────────────────────────────────────────
  {
    id: 'mensagens',
    label: 'Mensagens',
    icon: ICONS.mensagens,
    order: 3,
    isPublished: true,
    blocks: [
      {
        type: 'intro',
        content: 'A aba Mensagens centraliza dois tipos de comunicação recebida: depoimentos enviados pelos clientes pelo site público e contatos feitos pelo formulário da sua página.',
      },
      {
        type: 'callout',
        color: 'yellow',
        content: 'Depoimentos pendentes: quando há avaliações aguardando aprovação, um badge vermelho aparece no ícone de Mensagens no menu lateral. Não deixe acumular — clientes que veem depoimentos publicados têm mais confiança para contratar.',
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'sistema',
            color: 'accent',
            title: 'Depoimento chega automaticamente',
            desc: 'Quando um cliente acessa seu site e clica em "Deixar avaliação", o formulário envia nome, nota (1 a 5 estrelas) e texto. O depoimento fica na fila "Pendentes" — invisível no site até você aprovar.',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'green',
            title: 'Aprovar depoimento',
            desc: 'Clique em "Aprovar" no card do depoimento. Ele é publicado imediatamente na seção de Depoimentos do seu site. Não há limite de depoimentos publicados.',
          },
          {
            n: 3,
            who: 'fotógrafo',
            color: 'red',
            title: 'Rejeitar depoimento',
            desc: 'Clique em "Rejeitar" para apagar o depoimento permanentemente. Não há confirmação extra — o depoimento some sem recuperação. Use com cuidado.',
          },
        ],
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'sistema',
            color: 'accent',
            title: 'Contato recebido pelo site',
            desc: 'Quando alguém preenche o formulário de contato do seu site público, a mensagem aparece aqui com nome, assunto e data/hora.',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Ler a mensagem completa',
            desc: 'Clique no card do contato para ver o conteúdo completo. O status muda de "Não lido" para "Lido" automaticamente.',
          },
          {
            n: 3,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Responder e apagar',
            desc: 'A resposta é feita por fora do sistema (WhatsApp ou e-mail da pessoa). Após responder, apague o contato clicando no ícone de lixeira para manter a lista limpa.',
          },
        ],
      },
    ],
  },

  // ── 5. GESTÃO ───────────────────────────────────────────────────────────────
  {
    id: 'gestao',
    label: 'Gestão',
    icon: ICONS.gestao,
    order: 4,
    isPublished: true,
    blocks: [
      {
        type: 'intro',
        content: 'A aba Gestão integra o ERP Rhyno ao CliqueZoom com login único automático (SSO). Ao clicar na aba, você já entra autenticado no sistema de gestão sem precisar de outra senha.',
      },
      {
        type: 'callout',
        color: 'accent',
        content: 'Login único: você não precisa criar outra conta. Ao acessar Gestão pela primeira vez, o sistema provisiona automaticamente sua conta no Rhyno com as mesmas credenciais do CliqueZoom.',
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Operação — Dashboard, Clientes e Ordens de Serviço',
            desc: 'O Dashboard do Rhyno mostra um resumo financeiro. Em Clientes você vê o mesmo cadastro do CliqueZoom (integrado). Ordens de Serviço são contratos formais para cada trabalho — inclua itens do catálogo de produtos/serviços.',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Cadastros — Produtos e Serviços',
            desc: 'Cadastre os itens que você vende ou presta (ensaio, impressão, álbum, etc.) com preço padrão. Todo item de uma Ordem de Serviço deve vir deste catálogo — isso evita preços fora do padrão.',
          },
          {
            n: 3,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Financeiro — Contas a Receber e a Pagar',
            desc: 'Registre parcelas, despesas e formas de pagamento. Contas a Receber vêm das Ordens de Serviço; Contas a Pagar são as despesas do seu negócio (aluguel de estúdio, equipamentos, etc.).',
          },
          {
            n: 4,
            who: 'fotógrafo',
            color: 'accent',
            title: 'CRM — Leads e Relacionamento',
            desc: 'Acompanhe leads (potenciais clientes), registre conversas e gerencie o funil de vendas. Leads convertidos viram Clientes automaticamente no cadastro unificado.',
          },
          {
            n: 5,
            who: 'fotógrafo',
            color: 'green',
            title: 'Concluir retorno agendado',
            desc: 'Nos retornos agendados no CRM, use o botão "✅ Concluir" para marcar o contato como feito e remover da lista de pendências sem apagar o histórico.',
          },
        ],
      },
      {
        type: 'callout',
        color: 'yellow',
        content: 'O ERP roda em uma janela separada dentro do admin. Se o iframe ficar em branco, aguarde alguns segundos e atualize a aba — pode ser que o servidor de gestão esteja inicializando.',
      },
    ],
  },

  // ── 6. MEU SITE ─────────────────────────────────────────────────────────────
  {
    id: 'meu-site',
    label: 'Meu Site',
    icon: ICONS['meu-site'],
    order: 5,
    isPublished: true,
    blocks: [
      {
        type: 'intro',
        content: 'A aba Meu Site é o construtor do seu site profissional público. Você edita as seções, escolhe o tema e vê uma prévia ao vivo — tudo sem precisar saber programar. O site fica em seuslug.cliquezoom.com.br ou no domínio próprio que você configurar.',
      },
      {
        type: 'callout',
        color: 'accent',
        content: 'Enquanto o site estiver desativado, visitantes veem uma página "Em breve". Você pode editar à vontade sem que ninguém veja — só ative quando estiver pronto.',
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Aba "Geral" — Escolher tema e ativar o site',
            desc: 'Selecione entre 5 temas prontos: Elegante, Minimalista, Moderno, Escuro e Galeria. O interruptor "Status do Site" ativa ou desativa a visibilidade pública. Mudanças de tema são instantâneas.',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Aba "Seções" — Ligar e reordenar blocos',
            desc: 'Cada seção do site (Capa, Sobre, Portfólio, Serviços, etc.) tem um interruptor. Arraste os itens para mudar a ordem em que aparecem no site. Seções desativadas ficam invisíveis para visitantes.',
          },
          {
            n: 3,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Editar cada seção',
            desc: 'Clique na seção que quer editar no painel esquerdo: Capa (imagem de fundo + textos em camadas), Sobre (sua história + fotos), Portfólio (melhores imagens), Serviços (com preços), Depoimentos, FAQ, Contato e Rodapé.',
          },
          {
            n: 4,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Simular em diferentes dispositivos',
            desc: 'Use os botões Desktop / Tablet / Mobile no topo do preview para ver como o site aparece em cada tela. O site é responsivo por padrão — ajuste textos e imagens pensando nos três tamanhos.',
          },
          {
            n: 5,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Aba "Personalizar" — Cores e fonte',
            desc: 'Defina a paleta de cores principal e a tipografia do site. Você pode manter o padrão do tema ou criar sua identidade visual própria. As mudanças aparecem em tempo real no preview.',
          },
          {
            n: 6,
            who: 'fotógrafo',
            color: 'green',
            title: 'Publicar o site',
            desc: 'Quando estiver satisfeito, vá à aba "Geral" e ligue o interruptor "Status do Site". Pronto — o site está ao ar.',
          },
        ],
      },
      {
        type: 'callout',
        color: 'yellow',
        content: 'O construtor roda dentro de um iframe e não herda o tema escuro do painel admin. Se parecer com fundo branco, é comportamento esperado — o visual do seu site público é independente do painel.',
      },
    ],
  },

  // ── 7. DOMÍNIO ──────────────────────────────────────────────────────────────
  {
    id: 'dominio',
    label: 'Domínio',
    icon: ICONS.dominio,
    order: 6,
    isPublished: true,
    blocks: [
      {
        type: 'intro',
        content: 'Na aba Domínio você conecta um endereço próprio (ex.: www.flaviacristina.com.br) ao seu site no CliqueZoom. Enquanto não configurar, o site fica disponível em seuslug.cliquezoom.com.br.',
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Adicionar o domínio',
            desc: 'Digite o endereço desejado (ex.: www.seunome.com.br) no campo e clique em "Adicionar". O sistema exibe as instruções de configuração DNS.',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Criar o registro A no seu provedor',
            desc: 'Acesse o painel do seu provedor de domínio (Hostinger, Registro.br, GoDaddy, etc.), vá em "Gerenciar DNS" e crie um registro do tipo A apontando para o IP exibido na tela do CliqueZoom.',
          },
          {
            n: 3,
            who: 'sistema',
            color: 'yellow',
            title: 'Aguardar a propagação DNS',
            desc: 'A propagação DNS pode levar de alguns minutos até 48 horas, dependendo do provedor. Durante esse tempo o site continua no endereço .cliquezoom.com.br normalmente.',
          },
          {
            n: 4,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Verificar o DNS',
            desc: 'Quando achar que a propagação ocorreu, clique em "Verificar DNS". O sistema testa se o domínio está apontando para o servidor correto.',
          },
          {
            n: 5,
            who: 'sistema',
            color: 'green',
            title: 'Certificado SSL gerado automaticamente',
            desc: 'Após a verificação, o CliqueZoom gera o certificado HTTPS automaticamente. O site passa a funcionar no seu domínio próprio com cadeado de segurança.',
          },
          {
            n: 6,
            who: 'fotógrafo',
            color: 'green',
            title: 'Status verificado e ativo',
            desc: 'Quando tudo estiver correto, o painel mostra o status "Verificado e Ativo" e as instruções desaparecem. Seu site agora responde no domínio próprio.',
          },
        ],
      },
      {
        type: 'callout',
        color: 'red',
        content: 'Não apague o registro A do seu provedor após verificar — o certificado SSL precisa dele para renovar a cada 90 dias. Se apagar, o site fica sem HTTPS e pode sair do ar.',
      },
      {
        type: 'callout',
        color: 'yellow',
        content: 'Se a verificação falhar, confira se o tipo do registro é exatamente "A" (não CNAME), se o endereço IP está correto e se o TTL foi salvo. Aguarde mais 30 minutos e tente novamente.',
      },
    ],
  },

  // ── 8. INTEGRAÇÕES ──────────────────────────────────────────────────────────
  {
    id: 'integracoes',
    label: 'Integrações',
    icon: ICONS.integracoes,
    order: 7,
    isPublished: true,
    blocks: [
      {
        type: 'intro',
        content: 'Na aba Integrações você conecta ferramentas de medição ao seu site público. Com elas é possível entender de onde vêm seus visitantes, quais páginas convertem melhor e criar públicos para anúncios.',
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Google Analytics 4 — Obter o Measurement ID',
            desc: 'Acesse analytics.google.com, crie uma conta (ou abra a existente), vá em Admin > Fluxo de dados > Web e copie o Measurement ID. Começa com "G-" seguido de letras e números.',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Google Analytics 4 — Ativar',
            desc: 'No CliqueZoom, marque o checkbox "Ativar", cole o Measurement ID no campo e clique em "Salvar Configurações". A tag do GA4 é inserida automaticamente no seu site.',
          },
          {
            n: 3,
            who: 'sistema',
            color: 'green',
            title: 'Dados aparecem no GA4 em ~24 horas',
            desc: 'Os primeiros dados de visitas chegam no painel do Google Analytics em até 24 horas após a ativação. Use o relatório "Tempo real" para confirmar que o código está funcionando.',
          },
        ],
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Meta Pixel — Obter o Pixel ID',
            desc: 'Acesse o Gerenciador de Negócios do Facebook (business.facebook.com) > Fontes de Dados > Pixels. Crie um pixel para o seu site ou copie o ID do pixel existente (número de 15 dígitos).',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Meta Pixel — Ativar',
            desc: 'Marque o checkbox "Ativar", cole o ID no campo e clique em "Salvar Configurações". O pixel começa a rastrear visitas e eventos no seu site automaticamente.',
          },
          {
            n: 3,
            who: 'sistema',
            color: 'green',
            title: 'Público de remarketing disponível',
            desc: 'Com o pixel ativo, você pode criar públicos personalizados no Gerenciador de Anúncios (pessoas que visitaram seu site) e veicular anúncios de remarketing no Facebook e Instagram.',
          },
        ],
      },
      {
        type: 'callout',
        color: 'green',
        content: 'Ambas as integrações são opcionais. Só ative as que você realmente for usar — código desnecessário no site pode deixar o carregamento levemente mais lento.',
      },
    ],
  },

  // ── 9. MARKETING ────────────────────────────────────────────────────────────
  {
    id: 'marketing',
    label: 'Marketing',
    icon: ICONS.marketing,
    order: 8,
    isPublished: true,
    blocks: [
      {
        type: 'intro',
        content: 'A aba Marketing tem duas partes: Visão Geral (saúde do negócio com dados dos últimos 30 dias) e Vendas Automáticas (robô que lembra o cliente do prazo e oferece fotos extras após a entrega).',
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'fotógrafo',
            color: 'accent',
            title: 'KPIs — Últimos 30 dias',
            desc: 'Quatro indicadores no topo: Sessões criadas, Clientes novos, Taxa de acesso (% de sessões cujo código foi acessado pelo cliente) e Taxa de entrega (% de sessões marcadas como entregues). Compare semana a semana para identificar gargalos.',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Funil de Sessões',
            desc: 'Mostra quantas sessões estão em cada etapa: Criada → Código enviado → Cliente acessou → Seleção enviada → Entregue. Se muitas sessões "travam" entre "Cliente acessou" e "Seleção enviada", o prazo pode estar muito curto ou o cliente precisa de um lembrete.',
          },
          {
            n: 3,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Distribuição por status',
            desc: 'Gráfico com o número atual de sessões em cada status: Pendente, Em seleção, Seleção enviada, Entregue, Expirado. Muitas sessões "Expiradas" indicam que clientes não completaram a seleção dentro do prazo.',
          },
        ],
      },
      {
        type: 'callout',
        color: 'accent',
        content: 'Vendas Automáticas: o sistema pode trabalhar por você enquanto você edita. Ative os lembretes e a escassez pós-entrega nas configurações de cada sessão para vender mais sem esforço.',
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Ativar Lembrete de Seleção',
            desc: 'No painel de configurações da sessão (coluna direita do wizard), ative "Automação de vendas > Lembrete". O CliqueZoom envia uma mensagem automática ao cliente quando o prazo está próximo de vencer.',
          },
          {
            n: 2,
            who: 'sistema',
            color: 'green',
            title: 'Mensagem de lembrete enviada automaticamente',
            desc: 'O sistema dispara e-mail (e WhatsApp se disponível) lembrando o cliente de finalizar a seleção. Você não precisa fazer nada — o robô cuida disso.',
          },
          {
            n: 3,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Ativar Escassez Pós-Entrega',
            desc: 'Ative "Escassez Pós-Entrega" nas configurações da sessão. Após a entrega, o sistema envia ao cliente uma oferta das fotos não selecionadas com um cupom de desconto por tempo limitado.',
          },
          {
            n: 4,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Acompanhar cupons emitidos',
            desc: 'Na seção "Vendas Automáticas" do Marketing, veja a lista de cupons emitidos com código, sessão e status (Em aberto / Usado). Após o cliente pagar por fora (WhatsApp/PIX), clique em "Marcar como usado".',
          },
        ],
      },
      {
        type: 'callout',
        color: 'yellow',
        content: 'As automações só funcionam se o cliente tiver e-mail ou WhatsApp cadastrado na sessão. Vincule sempre um cliente com contato ao criar a sessão para aproveitar os recursos.',
      },
    ],
  },

  // ── 10. PERFIL ──────────────────────────────────────────────────────────────
  {
    id: 'perfil',
    label: 'Perfil',
    icon: ICONS.perfil,
    order: 9,
    isPublished: true,
    blocks: [
      {
        type: 'intro',
        content: 'Na aba Perfil você configura os dados do seu negócio (nome, contato, logo) e cria a marca d\'água que protegerá automaticamente todas as fotos enviadas aos clientes durante a seleção.',
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Dados do Negócio — Preencher informações',
            desc: 'Preencha Nome do Negócio, E-mail de Contato, Telefone/WhatsApp e Website. Esses dados aparecem nos e-mails enviados aos seus clientes e nas informações do site público.',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Dados do Negócio — Upload do logo',
            desc: 'Clique na área do logo para selecionar um arquivo (PNG com fundo transparente dá melhor resultado). O logo aparece no cabeçalho dos e-mails e pode ser usado como marca d\'água.',
          },
          {
            n: 3,
            who: 'fotógrafo',
            color: 'green',
            title: 'Salvar Perfil',
            desc: 'Clique em "Salvar Perfil" para gravar as informações. As mudanças nos dados do negócio só são aplicadas ao clicar neste botão.',
          },
        ],
      },
      {
        type: 'callout',
        color: 'accent',
        content: 'Marca d\'água: a marca d\'água é aplicada automaticamente em todas as fotos enviadas ao cliente na etapa de seleção. Ela desaparece automaticamente quando você confirma a entrega — o cliente nunca vê o original antes da entrega.',
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Adicionar texto à marca d\'água',
            desc: 'Clique em "+ Texto" para adicionar uma camada de texto. Digite seu nome, @instagram ou qualquer mensagem. Use as alças do preview para posicionar e o controle deslizante para ajustar a opacidade.',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Adicionar imagem à marca d\'água',
            desc: 'Clique em "+ Imagem" para usar seu logo ou qualquer imagem como camada. Funciona melhor com PNG transparente. Combine texto e imagem para criar uma marca d\'água mais completa.',
          },
          {
            n: 3,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Ajustar posição, ângulo e opacidade',
            desc: 'Arraste cada camada no preview para posicionar. Use o seletor de ângulo para girar (marcas d\'água diagonais são mais difíceis de remover). A opacidade entre 30% e 60% equilibra proteção e estética.',
          },
          {
            n: 4,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Reordenar camadas',
            desc: 'Use os botões "subir" e "descer" para alterar qual camada fica na frente. A marca d\'água suporta múltiplas camadas sobrepostas.',
          },
          {
            n: 5,
            who: 'fotógrafo',
            color: 'yellow',
            title: 'Botão "↺ Padrão"',
            desc: 'Restaura a marca d\'água padrão do CliqueZoom. Use se quiser desfazer todas as customizações e voltar ao estado inicial.',
          },
        ],
      },
    ],
  },

  // ── 11. PLANO ───────────────────────────────────────────────────────────────
  {
    id: 'plano',
    label: 'Meu Plano',
    icon: ICONS.plano,
    order: 10,
    isPublished: true,
    blocks: [
      {
        type: 'intro',
        content: 'Na aba Meu Plano você acompanha sua assinatura atual, o uso de armazenamento e pode contratar recursos extras ou fazer upgrade para um plano com mais capacidade.',
      },
      {
        type: 'steps',
        steps: [
          {
            n: 1,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Ver plano atual e uso',
            desc: 'O card do plano atual mostra: nome do plano (Free, Basic, Pro ou Studio), o limite de armazenamento incluído, quanto você já usou e a data de renovação da assinatura.',
          },
          {
            n: 2,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Fazer upgrade de plano',
            desc: 'Clique em "Fazer Upgrade" para ver os planos disponíveis e mudar para um com mais armazenamento. O upgrade entra em vigor imediatamente. Não há proporcionalidade — a cobrança ocorre no próximo ciclo.',
          },
          {
            n: 3,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Contratar storage adicional',
            desc: 'Se precisar de mais espaço sem mudar de plano, contrate um add-on de storage: +50 GB (R$ 19/mês), +100 GB (R$ 35/mês) ou +250 GB (R$ 69/mês). O add-on é cobrado junto com a mensalidade.',
          },
          {
            n: 4,
            who: 'fotógrafo',
            color: 'accent',
            title: 'Ver histórico de pagamentos',
            desc: 'A seção de histórico lista todas as cobranças com data, valor e status (pago, pendente, falhou). Use para conciliar com o extrato do cartão.',
          },
        ],
      },
      {
        type: 'callout',
        color: 'yellow',
        content: 'Ao atingir 90% do armazenamento, o sistema exibe um alerta e novos uploads são bloqueados quando chegar a 100%. Contratar um add-on ou fazer upgrade libera o espaço imediatamente.',
      },
      {
        type: 'callout',
        color: 'green',
        content: 'Todos os planos — incluindo o Free — entregam fotos em alta resolução sem marca d\'água. O plano Free se diferencia pelo selo "CliqueZoom" nas galerias dos clientes e pelo limite de 3 GB de armazenamento.',
      },
    ],
  },

];

// ─── Runner ──────────────────────────────────────────────────────────────────
async function run() {
  await mongoose.connect(uri);
  console.log('Conectado ao MongoDB:', uri);

  let criados = 0;
  let atualizados = 0;

  for (const mod of MODULES) {
    const result = await ManualModule.findOneAndUpdate(
      { id: mod.id },
      mod,
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true }
    );
    const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
    if (isNew) {
      criados++;
      console.log(`  ✓ Criado:     [${String(mod.order).padStart(2, '0')}] ${mod.label}`);
    } else {
      atualizados++;
      console.log(`  ↺ Atualizado: [${String(mod.order).padStart(2, '0')}] ${mod.label}`);
    }
  }

  console.log(`\nConcluído — ${criados} criado(s), ${atualizados} atualizado(s) de ${MODULES.length} módulos.`);
  console.log('Acesse: Admin → Ajuda → Manual do Usuário\n');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Erro ao popular o manual:', err);
  process.exit(1);
});
