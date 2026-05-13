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
    subtitle: { type: String, default: 'Escolha o fluxo ideal para cada tipo de trabalho.' },
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
          icon: '🖼️',
          title: 'Portfólio Online',
          description: 'Seu site profissional com subdomínio exclusivo. Mostre seu trabalho de forma elegante e atraia novos clientes.',
          active: true,
          subItems: [
            { name: 'Galeria responsiva', description: 'Design moderno que se adapta a qualquer dispositivo, desktop ou celular.' },
            { name: 'Subdomínio exclusivo', description: 'Seu endereço seu-nome.cliquezoom.com.br, pronto para compartilhar.' },
            { name: 'Seções completas', description: 'Hero, Sobre, Portfólio, Álbuns, FAQ — tudo editável pelo painel admin.' },
            { name: 'Domínio próprio', description: 'Plano Pro permite conectar seu domínio personalizado.' }
          ]
        },
        {
          icon: '❤️',
          title: 'Galeria de Seleção',
          description: 'Fluxos de entrega adaptados a qualquer tipo de sessão — do ensaio individual à formatura com centenas de pessoas.',
          active: true,
          subItems: [
            { name: 'Seleção', description: 'Cliente escolhe suas fotos favoritas com um coração. Ideal para ensaios e casamentos com limite de pacote configurável.' },
            { name: 'Galeria', description: 'Cliente visualiza e baixa as fotos diretamente, sem etapa de seleção. Perfeito para entregas imediatas.' },
            { name: 'Multi-Seleção', description: 'Vários participantes acessam a mesma galeria e fazem suas seleções individualmente. Ideal para formaturas e shows.' },
            { name: 'Multi-Imediata', description: 'Fotos entregues em tempo real conforme o upload. Cada participante vê e baixa suas fotos na hora. Perfeito para eventos ao vivo.' }
          ]
        },
        {
          icon: '📦',
          title: 'Entrega Online',
          description: 'Entregue as fotos finais com download seguro e profissional. Controle total sobre o que o cliente acessa e quando.',
          active: true,
          subItems: [
            { name: 'Download individual ou em lote', description: 'Cliente baixa foto a foto ou todas de uma vez em arquivo ZIP.' },
            { name: 'Sem marca d\'água na entrega', description: 'Watermark removido automaticamente após aprovação do pacote.' },
            { name: 'Status em tempo real', description: 'Acompanhe o status de cada sessão: pendente, enviado ou entregue.' },
            { name: 'Controle pelo painel admin', description: 'Você define quando liberar o acesso e quais fotos estão disponíveis.' }
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
