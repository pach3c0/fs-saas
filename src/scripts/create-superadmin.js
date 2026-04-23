const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Organization = require('../models/Organization');

async function createSuperadmin() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cliquezoom';
  const email = 'pacheco@rhynoproject.com.br';
  const password = '055360';
  const name = 'Pacheco Superadmin';

  try {
    await mongoose.connect(mongoUri);
    console.log('Conectado ao MongoDB:', mongoUri);

    // 1. Garantir que a organização existe
    let org = await Organization.findOne({ slug: 'admin' });
    if (!org) {
      org = await Organization.create({
        name: 'CliqueZoom Admin',
        slug: 'admin',
        isActive: true,
        plan: 'pro'
      });
      console.log('Organização "admin" criada.');
    }

    // 2. Garantir que o usuário existe e é superadmin
    let user = await User.findOne({ email });
    const passwordHash = await bcrypt.hash(password, 10);

    if (user) {
      user.role = 'superadmin';
      user.passwordHash = passwordHash;
      user.approved = true;
      user.organizationId = org._id;
      await user.save();
      console.log('Usuário existente atualizado para superadmin.');
    } else {
      user = await User.create({
        email,
        passwordHash,
        name,
        role: 'superadmin',
        organizationId: org._id,
        approved: true
      });
      console.log('Novo usuário superadmin criado.');
    }

    // 3. Vincular owner se necessário
    if (!org.ownerId) {
      org.ownerId = user._id;
      await org.save();
    }

    console.log('Sucesso! Agora você pode logar em /saas-admin');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao criar superadmin:', error);
    process.exit(1);
  }
}

createSuperadmin();
