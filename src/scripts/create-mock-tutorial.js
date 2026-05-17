const mongoose = require('mongoose');
require('dotenv').config();

const Tutorial = require('../models/Tutorial');

function extractYoutubeId(url) {
  if (!url) return '';
  url = url.trim();
  if (url.length === 11) return url;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}

async function insertMockTutorial() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cliquezoom';
  console.log('Conectando ao MongoDB:', mongoUri);
  
  try {
    await mongoose.connect(mongoUri);
    console.log('Conectado com sucesso!');

    // Limpar existentes
    await Tutorial.deleteMany({});
    console.log('Tutoriais antigos removidos.');

    const tutorials = [
      {
        title: 'Como Cadastrar/editar/deletar Clientes',
        description: 'Neste vídeo completo de 4 minutos, você aprenderá detalhadamente como cadastrar novos clientes, filtrar por tags, editar informações importantes e realizar exclusões seguras. Explicamos o papel de cada campo para automatizar suas comunicações do CRM.',
        category: 'clientes',
        level: 'Básico',
        duration: '4:32 min',
        order: 1,
        active: true,
        videoUrl: 'https://www.youtube.com/watch?v=wXhTHyIGQ_U'
      },
      {
        title: 'Entendendo seu Painel & Métricas',
        description: 'Uma visão geral e descomplicada de como o seu painel central funciona. Aprenda o que cada métrica visual representa (armazenamento, visualizações, cliques), como monitorar a atividade de seleção do cliente e decolar suas conversões.',
        category: 'dashboard',
        level: 'Intermediário',
        duration: '6:15 min',
        order: 2,
        active: true,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      },
      {
        title: 'Personalizando sua Galeria de Fotos e Portfólio',
        description: 'Aprenda a criar galerias de alta conversão, escolher templates premium, ajustar paletas de cores, configurar marcas d\'água dinâmicas e deixar o seu site 100% com a sua identidade visual.',
        category: 'portfolio',
        level: 'Avançado',
        duration: '8:40 min',
        order: 3,
        active: true,
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }
    ];

    for (const t of tutorials) {
      t.youtubeId = extractYoutubeId(t.videoUrl);
      await Tutorial.create(t);
      console.log(`Tutorial criado: "${t.title}"`);
    }

    console.log('Todos os tutoriais de teste foram inseridos com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao conectar ou inserir dados:', error);
    process.exit(1);
  }
}

insertMockTutorial();
