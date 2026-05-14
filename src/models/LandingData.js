const mongoose = require('mongoose');

// Documento único que armazena todo o conteúdo da landing page do SaaS
const LandingDataSchema = new mongoose.Schema({
  hero: {
    headline: { type: String, default: 'A plataforma completa para fotógrafos profissionais' },
    subheadline: { type: String, default: 'Galeria de seleção, entrega online, prova de álbum e site profissional — tudo em um só lugar.' },
    ctaText: { type: String, default: 'Começar grátis' },
    ctaSubtext: { type: String, default: 'Sem cartão de crédito. Plano gratuito para sempre.' }
  },

  howItWorks: {
    title: { type: String, default: 'Como funciona' },
    steps: {
      type: [{
        icon: String,
        title: String,
        description: String
      }],
      default: [
        { icon: '📸', title: 'Crie sua conta', description: 'Cadastre-se gratuitamente e configure seu estúdio em minutos.' },
        { icon: '🖼️', title: 'Envie suas fotos', description: 'Faça upload das fotos da sessão e compartilhe o link com seu cliente.' },
        { icon: '✅', title: 'Cliente aprova', description: 'Seu cliente seleciona, aprova e você entrega com um clique.' }
      ]
    }
  },

  features: {
    title: { type: String, default: 'Tudo que você precisa' },
    items: {
      type: [{
        icon: String,
        title: String,
        description: String,
        active: Boolean
      }],
      default: [
        { icon: '🖼️', title: 'Galeria de Seleção', description: 'Cliente seleciona as fotos favoritas com um coração. Limite de pacote e preço por foto extra configuráveis.', active: true },
        { icon: '📦', title: 'Entrega Online', description: 'Entregue as fotos em alta resolução direto pelo link. Cliente baixa individualmente ou em ZIP.', active: true },
        { icon: '📖', title: 'Prova de Álbum', description: 'Envie a prova do álbum folheável para aprovação. Cliente aprova página por página ou tudo de uma vez.', active: true },
        { icon: '🌐', title: 'Site Profissional', description: 'Crie seu site de portfólio com 5 templates exclusivos. Domínio próprio suportado.', active: true },
        { icon: '👥', title: 'CRM de Clientes', description: 'Gerencie seus clientes, histórico de sessões e dados de contato em um só lugar.', active: true },
        { icon: '💧', title: 'Marca D\'Água', description: 'Proteja suas fotos com marca d\'água personalizada (texto ou logo) com opacidade ajustável.', active: true },
        { icon: '📊', title: 'Analytics', description: 'Acompanhe acessos à sua galeria com Google Analytics e Meta Pixel integrados.', active: true },
        { icon: '📱', title: 'PWA Offline', description: 'Galeria funciona offline como app nativo. Cliente instala no celular e acessa sem internet.', active: true }
      ]
    }
  },

  plans: {
    title: { type: String, default: 'Planos e preços' },
    subtitle: { type: String, default: 'Comece grátis e cresça no seu ritmo.' },
    items: {
      type: [{
        name: String,
        price: String,
        period: String,
        description: String,
        highlighted: Boolean,
        features: [String]
      }],
      default: [
        {
          name: 'Free',
          price: 'R$ 0',
          period: 'para sempre',
          description: 'Para começar e testar a plataforma.',
          highlighted: false,
          features: ['Até 5 sessões', 'Até 100 fotos por sessão', '1 álbum de prova', '500 MB de armazenamento', 'Galeria de seleção', 'Entrega online']
        },
        {
          name: 'Basic',
          price: 'R$ 49',
          period: 'por mês',
          description: 'Para fotógrafos em crescimento.',
          highlighted: true,
          features: ['Até 50 sessões', 'Até 5.000 fotos por sessão', '10 álbuns de prova', '10 GB de armazenamento', 'Tudo do Free', 'Site profissional', 'CRM de clientes', 'Analytics integrado']
        },
        {
          name: 'Pro',
          price: 'R$ 99',
          period: 'por mês',
          description: 'Para estúdios profissionais.',
          highlighted: false,
          features: ['Sessões ilimitadas', 'Fotos ilimitadas', 'Álbuns ilimitados', '50 GB de armazenamento', 'Tudo do Basic', 'Domínio próprio', 'Suporte prioritário']
        }
      ]
    }
  },

  testimonials: {
    title: { type: String, default: 'O que dizem nossos fotógrafos' },
    items: {
      type: [{
        text: String,
        author: String,
        role: String,
        active: Boolean
      }],
      default: [
        { text: 'Meus clientes adoram a facilidade de selecionar as fotos. Economizo horas de trabalho em cada entrega.', author: 'Ana Paula', role: 'Fotógrafa de casamentos', active: true },
        { text: 'A prova de álbum online mudou meu fluxo de trabalho completamente. Aprovações em horas, não semanas.', author: 'Carlos Mendes', role: 'Fotógrafo de família', active: true },
        { text: 'Finalmente uma plataforma feita por quem entende fotografia. Interface limpa e cliente ama.', author: 'Beatriz Lima', role: 'Fotógrafa newborn', active: true }
      ]
    }
  },

  faq: {
    title: { type: String, default: 'Perguntas frequentes' },
    items: {
      type: [{
        question: String,
        answer: String,
        active: Boolean
      }],
      default: [
        { question: 'Preciso de cartão de crédito para começar?', answer: 'Não. O plano Free é gratuito para sempre, sem necessidade de cartão de crédito.', active: true },
        { question: 'Posso mudar de plano a qualquer momento?', answer: 'Sim. Você pode fazer upgrade ou downgrade do seu plano quando quiser.', active: true },
        { question: 'Como meu cliente acessa as fotos?', answer: 'Você compartilha um link com código de acesso. O cliente acessa pelo navegador, sem precisar criar conta.', active: true },
        { question: 'As fotos ficam seguras na plataforma?', answer: 'Sim. As fotos são armazenadas com segurança e protegidas por marca d\'água. Apenas quem tem o código de acesso pode ver.', active: true },
        { question: 'Posso usar meu próprio domínio?', answer: 'Sim, no plano Pro você pode conectar seu domínio próprio ao seu site profissional.', active: true }
      ]
    }
  },

  cta: {
    title: { type: String, default: 'Pronto para transformar sua entrega de fotos?' },
    subtitle: { type: String, default: 'Junte-se a fotógrafos profissionais que já usam a CliqueZoom.' },
    buttonText: { type: String, default: 'Criar conta grátis' }
  },

  solutions: {
    title: { type: String, default: 'Soluções completas para fotógrafos' },
    subtitle: { type: String, default: 'Cada ferramenta pensada para profissionalizar sua entrega e aumentar sua receita.' },
    items: {
      type: [{
        icon: { type: String, default: '📷' },
        title: String,
        description: String,
        subItems: [{
          name: String,
          description: String
        }],
        active: { type: Boolean, default: true }
      }],
      default: [
        {
          icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>',
          title: 'Portfólio Online',
          description: 'Seu site profissional com subdomínio exclusivo. Mostre seu trabalho de forma elegante, impressione clientes e apareça no Google.',
          active: true,
          subItems: [
            { name: 'Site completo e editável', description: 'Hero, Sobre, Portfólio, Álbuns e FAQ — tudo personalizável pelo painel, sem precisar de programador.' },
            { name: 'Subdomínio exclusivo', description: 'Seu endereço seu-nome.cliquezoom.com.br pronto para compartilhar no Instagram e WhatsApp.' },
            { name: 'Galeria responsiva', description: 'Design moderno que se adapta perfeitamente a qualquer dispositivo, do celular ao desktop.' },
            { name: 'Domínio próprio', description: 'Conecte seu domínio personalizado e tenha 100% de identidade de marca no Plano Pro.' }
          ]
        },
        {
          icon: '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
          title: 'Galeria de Seleção',
          description: 'Fluxos adaptados a qualquer tipo de sessão — do ensaio individual à formatura com centenas de pessoas. O cliente seleciona, você entrega.',
          active: true,
          subItems: [
            { name: 'Seleção com coração', description: 'Cliente escolhe as fotos favoritas com um clique. Limite de pacote configurável, ideal para ensaios e casamentos.' },
            { name: 'Galeria imediata', description: 'Cliente visualiza e baixa as fotos diretamente, sem etapa de seleção. Perfeito para entregas rápidas.' },
            { name: 'Multi-Seleção', description: 'Vários participantes acessam a mesma galeria e selecionam suas fotos individualmente. Ideal para formaturas e eventos corporativos.' },
            { name: 'Multi-Imediata ao vivo', description: 'Fotos entregues em tempo real conforme o upload. Cada participante vê e baixa suas fotos na hora — perfeito para shows e eventos ao vivo.' }
          ]
        },
        {
          icon: '<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
          title: 'Automação de Vendas de Fotos Extras',
          description: 'Transforme cada seleção em uma oportunidade de receita adicional. O sistema oferece e cobra pelas fotos excedentes automaticamente, sem você precisar negociar.',
          active: true,
          subItems: [
            { name: 'Venda automática de extras', description: 'Quando o cliente ultrapassa o limite do pacote, o sistema exibe o preço por foto extra e processa o pagamento sem intervenção sua.' },
            { name: 'Preço por foto configurável', description: 'Você define o valor de cada foto excedente por sessão. O sistema calcula e cobra o total automaticamente.' },
            { name: 'Bloqueio inteligente', description: 'O download só é liberado após a confirmação do pagamento das extras, garantindo que você sempre recebe.' },
            { name: 'Receita sem esforço', description: 'Fotógrafos que usam esse recurso faturam em média 30% a mais por sessão, apenas com fotos que já estavam prontas.' }
          ]
        },
        {
          icon: '<svg viewBox="0 0 24 24"><polyline points="8 17 12 21 16 17"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"></path></svg>',
          title: 'Entrega Online Profissional',
          description: 'Entregue as fotos finais em alta resolução com download seguro, sem marca d\'água. Controle total sobre o acesso e o momento da entrega.',
          active: true,
          subItems: [
            { name: 'Download individual ou em lote', description: 'Cliente baixa foto a foto ou todas de uma vez em arquivo ZIP, com um único clique.' },
            { name: 'Marca d\'água removida na entrega', description: 'As fotos de prova têm watermark. Após aprovação e pagamento, a entrega é em alta resolução e sem marca.' },
            { name: 'Controle de liberação', description: 'Você decide quando o cliente pode baixar. Libere manualmente ou configure liberação automática após a seleção.' },
            { name: 'Status em tempo real', description: 'Painel com status de cada sessão: pendente, aguardando seleção, aprovado ou entregue.' }
          ]
        },
        {
          icon: '<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>',
          title: 'Prova de Álbum Online',
          description: 'Envie a diagramação do álbum para aprovação sem imprimir nada. O cliente visualiza página por página, deixa comentários e aprova — tudo pelo celular.',
          active: true,
          subItems: [
            { name: 'Visualização folheável', description: 'O cliente vê o álbum como um livro digital, virando páginas com animação suave. Compatível com celular e tablet.' },
            { name: 'Aprovação por seção', description: 'Cliente aprova cada dupla de páginas individualmente ou clica em "Aprovar Tudo" de uma vez, eliminando idas e vindas por WhatsApp.' },
            { name: 'Comentários por página', description: 'Cliente pode deixar observações direto na página específica. Você recebe tudo organizado no painel, sem perder nada no chat.' },
            { name: 'Histórico de versões', description: 'Envie revisões do álbum e o sistema guarda todas as versões. Rastreie o que foi aprovado e quando.' }
          ]
        }
      ]
    }
  },

  footer: {

    text: { type: String, default: '© 2026 CliqueZoom. Todos os direitos reservados.' }
  }

}, { timestamps: true });

module.exports = mongoose.model('LandingData', LandingDataSchema);
