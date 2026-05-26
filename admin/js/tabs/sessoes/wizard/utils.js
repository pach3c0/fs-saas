// Utilitários compartilhados entre os passos do wizard.

import { appState } from '../../../state.js';

// Constrói a URL da galeria para um código específico (sessão ou participante).
// Em produção: usa subdomínio (slug.cliquezoom.com.br).
// Em localhost: usa origin atual + ?_tenant=<slug> (resolveTenant do backend exige isto).
export function buildGalleryUrlForCode(session, accessCode) {
  const slug = appState.orgSlug || session.organizationId?.slug || '';
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (isLocalhost) {
    const params = new URLSearchParams({ code: accessCode });
    if (slug) params.set('_tenant', slug);
    return `${window.location.origin}/cliente/?${params.toString()}`;
  }

  if (slug) {
    return `https://${slug}.cliquezoom.com.br/cliente/?code=${accessCode}`;
  }

  return `${window.location.origin}/cliente/?code=${accessCode}`;
}

// Atalho — usa o código principal da sessão.
export function buildGalleryUrl(session) {
  return buildGalleryUrlForCode(session, session.accessCode);
}

// Templates de saudação WhatsApp por tipo de evento (espelha o backend em email.js).
const WA_OPENINGS = {
  casamento: name => `Olá ${name}! 💍 As fotos do seu casamento já estão prontas para você visualizar e escolher suas favoritas.`,
  aniversario: name => `Olá ${name}! 🎉 As fotos do seu aniversário já estão disponíveis na sua galeria.`,
  formatura: name => `Olá ${name}! 🎓 As fotos da sua formatura já estão prontas. Bora celebrar essa conquista!`,
  corporativo: name => `Olá ${name}! As fotos do evento já estão disponíveis para visualização.`,
  show: name => `Olá ${name}! 🎤 As fotos do show já estão na sua galeria.`,
  ensaio: name => `Olá ${name}! 📸 As fotos do seu ensaio já estão prontas — vem ver!`,
  gestante: name => `Olá ${name}! 🤰 As fotos do seu ensaio gestante já estão disponíveis.`,
  newborn: name => `Olá ${name}! 👶 As fotos do ensaio newborn já estão prontas.`,
  debutante: name => `Olá ${name}! 👑 As fotos dos seus 15 anos já estão na sua galeria.`,
  batizado: name => `Olá ${name}! ⛪ As fotos do batizado já estão disponíveis.`,
  outro: name => `Olá ${name}! 📸 Suas fotos já estão prontas para você visualizar.`
};

// Templates de saudação WhatsApp para entrega final (cliente baixa as fotos editadas).
// Tom de "entrega concluída" — espelha tom dos OPENINGS, mas focado em download.
const WA_DELIVERY_OPENINGS = {
  casamento: name => `Olá ${name}! 💍 As fotos editadas do seu casamento estão prontas para download em alta resolução!`,
  aniversario: name => `Olá ${name}! 🎉 As fotos do seu aniversário estão prontas para baixar.`,
  formatura: name => `Olá ${name}! 🎓 As fotos da formatura estão prontas — pode baixar todas em alta resolução.`,
  corporativo: name => `Olá ${name}! As fotos do evento estão prontas para download.`,
  show: name => `Olá ${name}! 🎤 As fotos do show estão prontas para você baixar.`,
  ensaio: name => `Olá ${name}! 📸 Seu ensaio está pronto — fotos editadas disponíveis para download.`,
  gestante: name => `Olá ${name}! 🤰 As fotos do seu ensaio gestante estão prontas para baixar.`,
  newborn: name => `Olá ${name}! 👶 As fotos do newborn estão prontas para download.`,
  debutante: name => `Olá ${name}! 👑 Suas fotos dos 15 anos estão prontas para baixar.`,
  batizado: name => `Olá ${name}! ⛪ As fotos do batizado estão prontas para download.`,
  outro: name => `Olá ${name}! 📸 Suas fotos editadas estão prontas para download.`
};

// Abre um modal antigo (do sessoes/) escondendo o wizard temporariamente.
// Evita o problema de stacking-context onde o modal aparece atrás do wizard.
// `opener` é a função que abre o modal (ex: () => window.viewParticipants(id)).
// `modalSelector` é o seletor do modal alvo, pra detectar quando fechar.
// `onClose` (opcional) é chamado quando o modal fecha — útil pra refresh.
export function openOverlayModal({ modalSelector, opener, onClose }) {
  const wizardEl = document.getElementById('sessionWizardModal');
  const wasDisplay = wizardEl ? wizardEl.style.display : null;
  if (wizardEl) wizardEl.style.display = 'none';

  opener();

  const modal = document.querySelector(modalSelector);
  if (!modal) {
    if (wizardEl) wizardEl.style.display = wasDisplay || 'flex';
    return;
  }

  // Polling: detecta quando o modal alvo é escondido (display:none) ou removido.
  const obs = setInterval(() => {
    const stillOpen =
      document.body.contains(modal) &&
      modal.style.display !== 'none' &&
      modal.style.display !== '';
    if (!stillOpen) {
      clearInterval(obs);
      if (wizardEl) wizardEl.style.display = wasDisplay || 'flex';
      if (typeof onClose === 'function') {
        try { onClose(); } catch (_) {}
      }
    }
  }, 400);

  // Failsafe — se algo der errado, desliga em 5min.
  setTimeout(() => {
    clearInterval(obs);
    if (wizardEl && wizardEl.style.display === 'none') {
      wizardEl.style.display = wasDisplay || 'flex';
    }
  }, 5 * 60 * 1000);
}

// Gera link wa.me com mensagem pré-preenchida para um destinatário específico.
export function buildWhatsAppLink({ session, accessCode, recipientName, recipientPhone, orgName }) {
  const url = buildGalleryUrlForCode(session, accessCode);
  const firstName = String(recipientName || '').split(' ')[0] || 'Olá';
  const opener = (WA_OPENINGS[session.eventType] || WA_OPENINGS.outro)(firstName);

  const message = [
    opener,
    '',
    `Acesse sua galeria: ${url}`,
    '',
    `Código de acesso: ${accessCode}`,
    '',
    `— ${orgName || appState.appData?.organization?.name || 'CliqueZoom'}`
  ].join('\n');

  let phone = String(recipientPhone || '').replace(/\D/g, '');
  if (phone && (phone.length === 10 || phone.length === 11)) phone = '55' + phone;
  const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}

// Versão para a etapa Entregar: avisa que as fotos editadas estão prontas para download.
export function buildWhatsAppDeliveryLink({ session, accessCode, recipientName, recipientPhone, orgName }) {
  const url = buildGalleryUrlForCode(session, accessCode);
  const firstName = String(recipientName || '').split(' ')[0] || 'Olá';
  const opener = (WA_DELIVERY_OPENINGS[session.eventType] || WA_DELIVERY_OPENINGS.outro)(firstName);

  const message = [
    opener,
    '',
    `Acesse para baixar: ${url}`,
    '',
    `Código de acesso: ${accessCode}`,
    '',
    `— ${orgName || appState.appData?.organization?.name || 'CliqueZoom'}`
  ].join('\n');

  let phone = String(recipientPhone || '').replace(/\D/g, '');
  if (phone && (phone.length === 10 || phone.length === 11)) phone = '55' + phone;
  const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}
