/**
 * Script: seed-solutions.js
 * Atualiza as soluções da landing page no MongoDB.
 *
 * Uso: node scripts/seed-solutions.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGODB_URI não encontrado no .env');
  process.exit(1);
}

// SVGs Lucide — padrão visual da landing page
const ICONS = {
  layout:       '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>',
  heart:        '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
  users:        '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
  bookOpen:     '<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>',
  messageSquare:'<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
  trendingUp:   '<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
  monitor:      '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
  globe:        '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
  link:         '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
  barChart:     '<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
};

const newSolutions = {
  title: 'Soluções completas para fotógrafos',
  subtitle: 'Escolha o fluxo ideal para cada tipo de trabalho.',
  items: [
    {
      icon: ICONS.layout,
      title: 'Painel',
      description: 'O centro de comando da sua plataforma. Tenha uma visão clara e imediata de tudo o que está acontecendo no seu negócio, logo na tela inicial.',
      active: true,
      subItems: [
        { name: 'Métricas em tempo real', description: 'Acompanhe na hora o número de galerias ativas, fotos entregues e espaço de armazenamento utilizado.' },
        { name: 'Alertas inteligentes', description: 'O painel avisa sobre prazos expirando, novas mensagens e clientes que finalizaram suas seleções.' },
        { name: 'Atalhos rápidos', description: 'Navegue de forma intuitiva para as seções recentes e funções que você mais usa no dia a dia.' },
        { name: 'Visão 360°', description: 'Entenda a saúde do seu negócio em segundos, sem precisar abrir várias abas ou planilhas.' },
      ]
    },
    {
      icon: ICONS.heart,
      title: 'Galeria de Seleção',
      description: 'Fluxos adaptados a qualquer tipo de sessão — do ensaio individual à formatura com centenas de pessoas. O cliente seleciona, você entrega.',
      active: true,
      subItems: [
        { name: 'Seleção com coração', description: 'O cliente escolhe as fotos favoritas com um clique. Limite de pacote configurável, ideal para ensaios e casamentos.' },
        { name: 'Galeria imediata', description: 'O cliente visualiza e baixa as fotos diretamente, sem etapa de seleção. Perfeito para entregas rápidas.' },
        { name: 'Multi-Seleção', description: 'Vários participantes acessam a mesma galeria e selecionam suas fotos individualmente. Ideal para formaturas e eventos corporativos.' },
        { name: 'Multi-Imediata ao vivo', description: 'Fotos entregues em tempo real conforme o upload. Cada participante vê e baixa suas fotos na hora — perfeito para shows e eventos ao vivo.' },
      ]
    },
    {
      icon: ICONS.users,
      title: 'Clientes',
      description: 'Tenha controle total da sua base de contatos. Um cadastro organizado que facilita o relacionamento e gera novas oportunidades de negócio.',
      active: true,
      subItems: [
        { name: 'Histórico unificado', description: 'Acesse facilmente todas as sessões e galerias vinculadas a cada cliente.' },
        { name: 'Gestão centralizada', description: 'Dados de contato, telefone, e-mail e endereço sempre à mão.' },
        { name: 'Busca inteligente', description: 'Encontre clientes rapidamente no painel com filtros práticos.' },
        { name: 'Base para automação', description: 'Estruture e organize seus contatos para futuras ações de marketing e fidelização.' },
      ]
    },
    {
      icon: ICONS.bookOpen,
      title: 'Prova de Álbum Online',
      description: 'Envie a diagramação do álbum para aprovação sem imprimir nada. O cliente visualiza página por página, deixa comentários e aprova — tudo pelo celular.',
      active: true,
      subItems: [
        { name: 'Visualização folheável', description: 'O cliente vê o álbum como um livro digital, virando páginas com animação suave. Compatível com celular e tablet.' },
        { name: 'Aprovação por seção', description: 'O cliente aprova cada dupla de páginas individualmente ou clica em "Aprovar Tudo" de uma vez, eliminando idas e vindas por WhatsApp.' },
        { name: 'Comentários por página', description: 'O cliente pode deixar observações direto na página específica. Você recebe tudo organizado no painel, sem perder nada no chat.' },
        { name: 'Histórico de versões', description: 'Envie revisões do álbum e o sistema guarda todas as versões. Rastreie o que foi aprovado e quando.' },
      ]
    },
    {
      icon: ICONS.messageSquare,
      title: 'Mensagens',
      description: 'Centralize sua comunicação e não perca nenhuma oportunidade. Gerencie contatos recebidos do seu site diretamente no painel.',
      active: true,
      subItems: [
        { name: 'Caixa de entrada', description: 'Receba e organize todos os formulários de contato vindos do seu site.' },
        { name: 'Gestão de depoimentos', description: 'Aprove avaliações recebidas de clientes para exibi-las automaticamente no seu portfólio.' },
        { name: 'Alerta em tempo real', description: 'Seja notificado no painel sempre que um novo potencial cliente entrar em contato.' },
        { name: 'Histórico de interações', description: 'Mantenha um registro profissional das solicitações para melhorar seu atendimento.' },
      ]
    },
    {
      icon: ICONS.trendingUp,
      title: 'CRM',
      description: 'Aumente seu faturamento trabalhando com quem já é seu cliente. Automações inteligentes que geram vendas passivas enquanto você fotografa.',
      active: true,
      subItems: [
        { name: 'Venda de fotos extras', description: 'O sistema oferece, calcula e cobra pelas fotos excedentes automaticamente.' },
        { name: 'Gatilhos de escassez', description: 'Alertas automáticos antes da galeria expirar para incentivar o cliente a não perder as memórias.' },
        { name: 'Reengajamento anual', description: 'Seja lembrado de contatar clientes 11 meses após o ensaio para fechar uma nova cobertura.' },
        { name: 'Receita sem esforço', description: 'Fotógrafos faturam até 30% a mais por trabalho usando nossa automação de vendas.' },
      ]
    },
    {
      icon: ICONS.monitor,
      title: 'Meu Site',
      description: 'Seu portfólio profissional e de alta conversão pronto em minutos, sem precisar entender de programação. Impressione clientes e apareça no Google.',
      active: true,
      subItems: [
        { name: 'Templates exclusivos', description: 'Escolha entre designs elegantes, minimalistas e modernos criados para fotógrafos.' },
        { name: '100% editável pelo painel', description: 'Personalize Hero, Sobre Mim, Serviços, Portfólio e FAQ facilmente.' },
        { name: 'Identidade visual flexível', description: 'Ajuste cores e tipografia para refletir perfeitamente a essência da sua marca.' },
        { name: 'Totalmente responsivo', description: 'Um site rápido e otimizado que funciona perfeitamente em celulares, tablets e computadores.' },
      ]
    },
    {
      icon: ICONS.globe,
      title: 'Domínio',
      description: 'Fortaleça a autoridade da sua marca com um endereço exclusivo na internet. Passe mais credibilidade em cada link compartilhado.',
      active: true,
      subItems: [
        { name: 'Conexão de domínio próprio', description: 'Conecte seu site (www.seunome.com.br) para máxima autoridade no mercado.' },
        { name: 'Subdomínio incluso', description: 'Comece a usar imediatamente com um endereço gratuito (seu-nome.cliquezoom.com.br).' },
        { name: 'Certificado SSL grátis', description: 'Seu site e as galerias dos clientes são protegidos com criptografia HTTPS.' },
        { name: 'Configuração simplificada', description: 'Siga instruções fáceis no painel para apontar seu domínio em poucos minutos.' },
      ]
    },
    {
      icon: ICONS.link,
      title: 'Integrações',
      description: 'Conecte seu site às principais ferramentas de tráfego e métricas do mercado para impulsionar suas campanhas publicitárias.',
      active: true,
      subItems: [
        { name: 'Pixel da Meta', description: 'Rastreie visitantes no Facebook/Instagram e crie campanhas de remarketing altamente precisas.' },
        { name: 'Google Analytics', description: 'Entenda de onde vêm seus acessos e qual é o comportamento do seu público.' },
        { name: 'Automação de e-mails', description: 'Configure disparos integrados ao comportamento do cliente nas galerias.' },
        { name: 'Pronto para escalar', description: 'Ferramentas essenciais para fotógrafos que investem em anúncios patrocinados.' },
      ]
    },
    {
      icon: ICONS.barChart,
      title: 'Marketing',
      description: 'Dados que orientam suas decisões estratégicas. Acompanhe a performance do seu site e o engajamento real das suas galerias.',
      active: true,
      subItems: [
        { name: 'Funil de conversão', description: 'Visualize claramente quantos clientes acessam, selecionam e baixam as fotos entregues.' },
        { name: 'Indicadores (KPIs) de receita', description: 'Monitore a taxa de conversão e o faturamento extra gerado pelo sistema.' },
        { name: 'Visão centralizada', description: 'Um dashboard completo para entender o que está dando mais resultado no seu estúdio.' },
        { name: 'Análise de origem', description: 'Descubra de onde seus melhores clientes estão chegando para focar seus esforços.' },
      ]
    },
  ]
};

async function run() {
  console.log('🔌 Conectando ao MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Conectado!');

  const db = mongoose.connection.db;
  const collection = db.collection('landingdatas');

  const result = await collection.updateOne(
    {},
    { $set: { solutions: newSolutions } },
    { upsert: true }
  );

  if (result.matchedCount > 0) {
    console.log('✅ Soluções atualizadas no documento existente!');
  } else if (result.upsertedCount > 0) {
    console.log('✅ Documento criado com as novas soluções!');
  }

  console.log('\n📋 Soluções publicadas:');
  newSolutions.items.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.title} (${s.subItems.length} sub-itens)`);
  });

  await mongoose.disconnect();
  console.log('\n🏁 Pronto! Execute na VPS ou localmente para atualizar o MongoDB.');
}

run().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
