/**
 * Script: seed-solutions.js
 * Atualiza as soluções da landing page no MongoDB com ícones Lucide SVG.
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

// SVGs Lucide — mesmo padrão visual do resto da landing page
const ICONS = {
  layout:      '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>',
  heart:       '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
  trendingUp:  '<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>',
  downloadCloud: '<svg viewBox="0 0 24 24"><polyline points="8 17 12 21 16 17"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"></path></svg>',
  bookOpen:    '<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>',
};

const newSolutions = {
  title: 'Soluções completas para fotógrafos',
  subtitle: 'Cada ferramenta pensada para profissionalizar sua entrega e aumentar sua receita.',
  items: [
    {
      icon: ICONS.layout,
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
      icon: ICONS.heart,
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
      icon: ICONS.trendingUp,
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
      icon: ICONS.downloadCloud,
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
      icon: ICONS.bookOpen,
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
    const iconName = Object.keys(ICONS).find(k => ICONS[k] === s.icon) || '?';
    console.log(`  ${i + 1}. [${iconName}] ${s.title} (${s.subItems.length} sub-itens)`);
  });

  await mongoose.disconnect();
  console.log('\n🏁 Pronto! Faça git push e recarregue na VPS.');
}

run().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
