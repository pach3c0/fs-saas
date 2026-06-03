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

// Textos padrão de e-mail por tipo de evento (parágrafo editável pelo fotógrafo).
const EMAIL_SHARE_INTROS = {
  casamento: 'As fotos do seu casamento já estão disponíveis para visualização. Use o código abaixo para acessar sua galeria.',
  aniversario: 'As fotos do seu aniversário já estão disponíveis na galeria. Use o código abaixo para acessar.',
  formatura: 'As fotos da sua formatura estão prontas! Use o código abaixo para acessar sua galeria.',
  corporativo: 'As fotos do evento estão disponíveis. Acesse sua galeria com o código abaixo.',
  show: 'As fotos do show estão disponíveis na galeria. Use o código abaixo para acessar.',
  ensaio: 'As fotos do seu ensaio já estão prontas! Acesse com o código abaixo.',
  gestante: 'As fotos do ensaio gestante estão disponíveis. Use o código abaixo.',
  newborn: 'As fotos do newborn estão prontas. Use o código abaixo para acessar.',
  debutante: 'As fotos dos seus 15 anos estão disponíveis. Use o código abaixo para acessar sua galeria.',
  batizado: 'As fotos do batizado estão prontas. Use o código abaixo para acessar.',
  outro: 'Suas fotos já estão disponíveis para visualização. Use o código abaixo para acessar.'
};

const EMAIL_DELIVERY_INTROS = {
  casamento: 'As fotos editadas do seu casamento estão prontas para download em alta resolução.',
  aniversario: 'As fotos do seu aniversário estão prontas para download em alta resolução.',
  formatura: 'As fotos da sua formatura estão prontas para download.',
  corporativo: 'As fotos editadas do evento estão prontas para download.',
  show: 'As fotos do show estão prontas para download.',
  ensaio: 'As fotos do seu ensaio estão prontas para download.',
  gestante: 'As fotos do ensaio gestante estão prontas para download.',
  newborn: 'As fotos do newborn estão prontas para download.',
  debutante: 'As fotos dos 15 anos estão prontas para download em alta resolução.',
  batizado: 'As fotos do batizado estão prontas para download.',
  outro: 'Suas fotos editadas estão prontas para download em alta resolução.'
};

// Retorna o texto padrão do parágrafo de e-mail de envio de código (editável).
export function buildShareEmailIntro(session) {
  if (session.customShareEmailIntro) return session.customShareEmailIntro;
  return EMAIL_SHARE_INTROS[session.eventType] || EMAIL_SHARE_INTROS.outro;
}

// Retorna o texto padrão do parágrafo de e-mail de entrega (editável).
export function buildDeliveryEmailIntro(session) {
  if (session.customDeliverEmailIntro) return session.customDeliverEmailIntro;
  return EMAIL_DELIVERY_INTROS[session.eventType] || EMAIL_DELIVERY_INTROS.outro;
}

// Retorna o texto completo da mensagem WhatsApp de envio de código (sem encoding).
export function buildShareWhatsAppText({ session, accessCode, recipientName, orgName }) {
  if (session.customShareWhatsAppText) return session.customShareWhatsAppText;
  const url = buildGalleryUrlForCode(session, accessCode);
  const firstName = String(recipientName || '').split(' ')[0] || 'Olá';
  const opener = (WA_OPENINGS[session.eventType] || WA_OPENINGS.outro)(firstName);
  const name = orgName || appState.appData?.organization?.name || '';
  return [opener, '', `Acesse sua galeria: ${url}`, '', `Código de acesso: ${accessCode}`, '', `— ${name}`].join('\n');
}

// Retorna o texto completo da mensagem WhatsApp de entrega (sem encoding).
export function buildDeliveryWhatsAppText({ session, accessCode, recipientName, orgName }) {
  if (session.customDeliverWhatsAppText) return session.customDeliverWhatsAppText;
  const url = buildGalleryUrlForCode(session, accessCode);
  const firstName = String(recipientName || '').split(' ')[0] || 'Olá';
  const opener = (WA_DELIVERY_OPENINGS[session.eventType] || WA_DELIVERY_OPENINGS.outro)(firstName);
  const name = orgName || appState.appData?.organization?.name || '';
  return [opener, '', `Acesse para baixar: ${url}`, '', `Código de acesso: ${accessCode}`, '', `— ${name}`].join('\n');
}

// Componente reutilizável: toggle + textarea para personalizar mensagens antes de enviar.
// `onTextareaReady(textarea)` é chamado imediatamente com a referência ao elemento.
export function buildMessageCustomizer({ label, defaultText, onTextareaReady, onInput }) {
  const section = document.createElement('div');
  section.style.cssText = 'display:flex; flex-direction:column; gap:0.25rem;';

  const topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex; align-items:center; justify-content:space-between; width:100%;';

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  let expanded = false;
  toggleBtn.textContent = `✏️ ${label} ▼`;
  toggleBtn.style.cssText = `
    background: transparent; border: none; padding: 0; cursor: pointer;
    color: var(--text-muted); font-size: 0.75rem; text-align: left;
    text-decoration: underline; text-underline-offset: 2px;
  `;

  const statusBadge = document.createElement('span');
  statusBadge.style.cssText = 'font-size:0.7rem; color:var(--text-muted); opacity:0; transition:opacity 0.2s; white-space:nowrap;';
  statusBadge.textContent = 'Salvando...';

  topRow.appendChild(toggleBtn);
  topRow.appendChild(statusBadge);
  section.appendChild(topRow);

  const textareaWrap = document.createElement('div');
  textareaWrap.style.display = 'none';

  const textarea = document.createElement('textarea');
  textarea.value = defaultText;
  textarea.rows = 4;
  textarea.style.cssText = `
    width: 100%; box-sizing: border-box; resize: vertical; margin-top: 0.25rem;
    background: var(--bg-base); border: 1px solid var(--border);
    border-radius: 0.375rem; padding: 0.5rem 0.625rem;
    color: var(--text-primary); font-size: 0.8125rem;
    font-family: inherit; line-height: 1.5;
  `;

  if (typeof onTextareaReady === 'function') onTextareaReady(textarea);
  if (typeof onInput === 'function') {
    let timeout;
    textarea.oninput = (e) => {
      clearTimeout(timeout);
      statusBadge.textContent = 'Salvando...';
      statusBadge.style.color = 'var(--text-muted)';
      statusBadge.style.opacity = '1';
      timeout = setTimeout(async () => {
        try {
          await onInput(e.target.value);
          statusBadge.textContent = '✓ Salvo automaticamente';
          statusBadge.style.color = 'var(--green)';
          setTimeout(() => { statusBadge.style.opacity = '0'; }, 3000);
        } catch (err) {
          statusBadge.textContent = '❌ Erro ao salvar';
          statusBadge.style.color = 'var(--red)';
        }
      }, 600);
    };
  }
  textareaWrap.appendChild(textarea);

  toggleBtn.onclick = () => {
    expanded = !expanded;
    textareaWrap.style.display = expanded ? 'block' : 'none';
    toggleBtn.textContent = `✏️ ${label} ${expanded ? '▲' : '▼'}`;
  };

  section.appendChild(textareaWrap);
  return section;
}

// Gera link wa.me com mensagem pré-preenchida para um destinatário específico.
// Aceita `customText` para usar mensagem editada pelo fotógrafo.
export function buildWhatsAppLink({ session, accessCode, recipientName, recipientPhone, orgName, customText }) {
  const message = customText || buildShareWhatsAppText({ session, accessCode, recipientName, orgName });
  let phone = String(recipientPhone || '').replace(/\D/g, '');
  if (phone && (phone.length === 10 || phone.length === 11)) phone = '55' + phone;
  const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}

// Versão para a etapa Entregar. Aceita `customText` para mensagem editada.
export function buildWhatsAppDeliveryLink({ session, accessCode, recipientName, recipientPhone, orgName, customText }) {
  const message = customText || buildDeliveryWhatsAppText({ session, accessCode, recipientName, orgName });
  let phone = String(recipientPhone || '').replace(/\D/g, '');
  if (phone && (phone.length === 10 || phone.length === 11)) phone = '55' + phone;
  const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}
