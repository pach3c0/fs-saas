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

  footer: {
    text: { type: String, default: '© 2026 CliqueZoom. Todos os direitos reservados.' }
  }

}, { timestamps: true });

module.exports = mongoose.model('LandingData', LandingDataSchema);
