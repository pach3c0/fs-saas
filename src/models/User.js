const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  // 'member' = usuário adicional da equipe (assento), criado pelo dono na aba Equipe.
  // Na Fase 1 o membro NÃO loga no CliqueZoom (passwordHash aleatório); ele é espelhado
  // no Rhyno e o login do membro é decisão da Fase 2. Ver src/routes/team.js.
  role: { type: String, enum: ['admin', 'superadmin', 'member'], default: 'admin' },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  // `approved:false` desabilita o login (auth.js) E libera o assento — é a flag de
  // ativo/inativo do membro, espelhando o `is_active` do usuário no Rhyno.
  approved: { type: Boolean, default: false },
  // Vínculo por-membro com o usuário espelhado no Rhyno (cordão umbilical).
  // `rhynoUserEmail` é a base da Fase 2 (SSO-por-usuário). Ver src/utils/rhynoClient.js.
  rhynoUserId: { type: Number, default: null },
  rhynoUserEmail: { type: String, default: null },
  // Cordão umbilical — quem MANDA no usuário do Rhyno: `true` só quando o CZ CRIOU o
  // usuário lá; `false` quando AMARROU a um usuário pré-existente (ex.: co-dono que já
  // era admin de outro tenant — a bolha FS Fotografias). Só propagamos desativar/restaurar
  // ao Rhyno quando `rhynoManaged === true` — assim o painel NUNCA destrói (soft-delete)
  // um usuário que não criou, e nunca tranca o dono fora do próprio ERP. Default `false` =
  // fail-safe: registro antigo (sem o campo) é tratado como amarrado → protegido.
  rhynoManaged: { type: Boolean, default: false },
  // Estado do espelho no Rhyno: 'synced' ok · 'pending' criado no CZ mas ainda não
  // espelhado (retry pela UI) · 'error' última tentativa falhou. Nunca faz rollback do
  // User do CZ (fonte da verdade) por soluço do vizinho.
  rhynoSyncStatus: { type: String, enum: ['synced', 'pending', 'error'], default: 'synced' },
  rhynoSyncError: { type: String, default: null },
  // Permissões por-módulo do membro (Slice 2). Dict { chave: bool } — espelha o JSON de
  // permissões do Rhyno (Role.permissions), mas por-USUÁRIO (o dono personaliza por pessoa
  // na aba Equipe) e por-MÓDULO (1 flag por área). Chave ausente cai no PADRÃO (baseline
  // "Operador"); ver src/services/memberPermissions.js. O dono (admin) ignora o mapa = tudo.
  permissions: { type: Map, of: Boolean, default: {} }
}, { timestamps: true });

userSchema.index({ organizationId: 1 });

module.exports = mongoose.model('User', userSchema);
