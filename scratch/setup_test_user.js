const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Organization = require('../src/models/Organization');
const Subscription = require('../src/models/Subscription');

async function setupTestUser() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cliquezoom';
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado ao MongoDB para setup...');

    const email = 'test-auto-admin@exemplo.com';
    const password = 'password123';
    const slug = 'test-auto-org';

    // Limpar dados de teste anteriores se existirem
    await User.deleteMany({ email });
    await Organization.deleteMany({ slug });

    const org = await Organization.create({
      name: 'Test Auto Org',
      slug,
      isActive: true,
      plan: 'free'
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      passwordHash,
      name: 'Test Auto Admin',
      role: 'admin',
      organizationId: org._id,
      approved: true
    });

    org.ownerId = user._id;
    await org.save();

    await Subscription.create({
      organizationId: org._id,
      plan: 'free',
      status: 'active',
      limits: {
        maxSessions: 100,
        maxPhotos: 1000,
        maxAlbums: 10,
        maxStorage: 5000,
        customDomain: false
      },
      usage: { sessions: 0, photos: 0, albums: 0, storage: 0 }
    });

    console.log('Usuário de teste criado com sucesso!');
    console.log('Email:', email);
    console.log('Senha:', password);
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Erro no setup:', error);
    process.exit(1);
  }
}

setupTestUser();
