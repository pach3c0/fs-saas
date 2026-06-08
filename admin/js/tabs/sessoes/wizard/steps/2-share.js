// Passo 2 do wizard — Compartilhar.
// Combina o display do código de acesso (com link da galeria) e os canais de envio
// (e-mail, WhatsApp, copiar). Em multi-seleção, mostra a lista de participantes em vez
// dos cards do cliente principal.
// A visualização desse passo já marca codeViewedAt no servidor (feito no switchStep).

import { apiPost, apiPut } from '../../../../utils/api.js';
import {
  buildGalleryUrl, buildGalleryUrlForCode, buildWhatsAppLink, openOverlayModal,
  buildShareEmailIntro, buildShareWhatsAppText, buildMessageCustomizer
} from '../utils.js';
import { nextStepIdAfter } from '../stepper.js';
import { appState } from '../../../../state.js';

export function renderStepShare({ session, refresh, switchStep }) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.5rem; max-width:720px;';

  const isGallery = session.mode === 'gallery';
  const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';

  // Galeria sem escolha de fluxo: mostra a tela de decisão antes de qualquer coisa.
  if (isGallery && !session.galleryDeliveryMode) {
    return renderGalleryChoice({ session, refresh, switchStep });
  }

  // Header
  const subtitle = isGallery
    ? 'Compartilhe a galeria. O cliente vai visualizar e baixar diretamente — não há etapa de seleção.'
    : isMulti
      ? 'Cada participante tem um código próprio. Envie individualmente abaixo.'
      : 'O código já foi gerado quando a sessão foi criada. Compartilhe com o cliente pelo canal que preferir.';
  const header = document.createElement('div');
  header.innerHTML = `
    <h2 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin:0 0 0.25rem;">Compartilhar</h2>
    <p style="color:var(--text-secondary); font-size:0.875rem; margin:0;">${subtitle}</p>
  `;
  wrap.appendChild(header);

  // Status do envio (selection/gallery)
  if (!isMulti && session.codeSentAt) {
    const sentBadge = document.createElement('div');
    sentBadge.style.cssText = `
      background: color-mix(in srgb, var(--green) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--green) 30%, transparent);
      border-radius: 0.5rem; padding: 0.75rem 1rem;
      font-size: 0.875rem; color: var(--text-primary);
      display: flex; align-items: center; gap: 0.5rem;
    `;
    sentBadge.innerHTML = `
      <span style="color:var(--green); font-weight:600;">✓</span>
      <span>Código compartilhado em <strong>${new Date(session.codeSentAt).toLocaleString('pt-BR')}</strong>. Você pode reenviar quantas vezes precisar.</span>
    `;
    wrap.appendChild(sentBadge);
  }

  // Multi: pula bloco do código geral, vai direto para a lista de participantes
  if (isMulti) {
    wrap.appendChild(renderParticipantsPanel(session, refresh));
    wrap.appendChild(buildPreviewButton(session));
    if (((session.participants || []).length > 0)) {
      wrap.appendChild(buildAdvanceButton(session, switchStep));
    }
    return wrap;
  }

  // Bloco 1: código de acesso + link
  wrap.appendChild(renderCodeCard(session, refresh));

  // Bloco 2: canais de envio (e-mail, WhatsApp, copiar)
  wrap.appendChild(renderChannelCards(session, refresh));

  wrap.appendChild(buildPreviewButton(session));
  if (session.codeSentAt) wrap.appendChild(buildAdvanceButton(session, switchStep));

  return wrap;
}

// Tela de escolha (modo Galeria, antes de decidir o fluxo).
// "Compartilhar prévia" mantém o fluxo atual; "Entregar direto" pula este passo.
function renderGalleryChoice({ session, refresh, switchStep }) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.25rem; max-width:640px;';

  const header = document.createElement('div');
  header.innerHTML = `
    <h2 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin:0 0 0.25rem;">Como você quer compartilhar?</h2>
    <p style="color:var(--text-secondary); font-size:0.875rem; margin:0;">Escolha o fluxo desta galeria. Você pode mudar de ideia depois.</p>
  `;
  wrap.appendChild(header);

  const setMode = async (mode) => {
    try {
      await apiPut(`/api/sessions/${session._id}/gallery-delivery-mode`, { mode });
      session.galleryDeliveryMode = mode;
    } catch (err) {
      window.showToast?.('Erro ao salvar a escolha: ' + err.message, 'error');
      return false;
    }
    return true;
  };

  // Card "Compartilhar prévia" (recomendado)
  wrap.appendChild(buildChoiceCard({
    recommended: true,
    title: 'Compartilhar prévia',
    desc: 'O cliente visualiza as fotos com marca d\'água. Você libera o download em alta na etapa seguinte.',
    onClick: async () => {
      if (await setMode('preview')) await refresh();
    }
  }));

  // Card "Entregar direto"
  wrap.appendChild(buildChoiceCard({
    recommended: false,
    title: 'Entregar direto',
    desc: 'Pula a prévia. O cliente recebe o link já com o download liberado, sem marca d\'água.',
    onClick: async () => {
      if (await setMode('direct')) switchStep(6);
    }
  }));

  return wrap;
}

function buildChoiceCard({ recommended, title, desc, onClick }) {
  const card = document.createElement('button');
  card.type = 'button';
  card.style.cssText = `
    text-align: left; width: 100%; font: inherit; cursor: pointer;
    background: var(--bg-surface);
    border: 1px solid ${recommended ? 'var(--accent)' : 'var(--border)'};
    border-radius: 0.75rem; padding: 1.25rem 1.5rem;
    display: flex; flex-direction: column; gap: 0.375rem;
    transition: border-color 0.15s, background 0.15s;
  `;
  card.onmouseenter = () => { card.style.background = 'var(--bg-hover)'; };
  card.onmouseleave = () => { card.style.background = 'var(--bg-surface)'; };

  const titleRow = document.createElement('div');
  titleRow.style.cssText = 'display:flex; align-items:center; gap:0.5rem;';
  const titleEl = document.createElement('span');
  titleEl.textContent = title;
  titleEl.style.cssText = 'font-size:1rem; font-weight:600; color:var(--text-primary);';
  titleRow.appendChild(titleEl);
  if (recommended) {
    const badge = document.createElement('span');
    badge.textContent = '⭐ Recomendado';
    badge.style.cssText = `
      font-size:0.6875rem; font-weight:600; color:var(--accent);
      background: color-mix(in srgb, var(--accent) 12%, transparent);
      border-radius: 999px; padding: 0.125rem 0.5rem;
    `;
    titleRow.appendChild(badge);
  }
  card.appendChild(titleRow);

  const descEl = document.createElement('div');
  descEl.textContent = desc;
  descEl.style.cssText = 'font-size:0.8125rem; color:var(--text-secondary); line-height:1.5;';
  card.appendChild(descEl);

  card.onclick = onClick;
  return card;
}

// Registra que o fotógrafo compartilhou o código/link (clicou num botão de copiar).
// Como o código e o link não são selecionáveis por mouse, toda extração passa por um botão —
// então codeSentAt vira sinal confiável de "o cliente recebeu". Idempotente: só age na 1ª vez.
async function markCodeShared(session, refresh) {
  if (session.codeSentAt) return;
  try {
    await apiPost(`/api/sessions/${session._id}/send-code`, { channel: 'copy' });
    session.codeSentAt = new Date().toISOString();
    await refresh?.();
  } catch (err) {
    // Não atrapalhar a cópia se o registro falhar — o conteúdo já foi para a área de transferência.
    console.warn('Não foi possível registrar o compartilhamento:', err.message);
  }
}

function renderCodeCard(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:0.75rem;';

  const codeCard = document.createElement('div');
  codeCard.style.cssText = `
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    padding: 1.5rem;
    display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
  `;
  const codeLabel = document.createElement('div');
  codeLabel.textContent = 'CÓDIGO DE ACESSO';
  codeLabel.style.cssText = 'font-size:0.6875rem; font-weight:600; letter-spacing:0.1em; color:var(--text-muted);';
  codeCard.appendChild(codeLabel);

  const codeValue = document.createElement('div');
  codeValue.textContent = session.accessCode;
  codeValue.style.cssText = `
    font-family: monospace; font-size: 2rem; font-weight: 700;
    letter-spacing: 0.25rem; color: var(--accent);
    user-select: none; -webkit-user-select: none;
  `;
  codeCard.appendChild(codeValue);

  const copyCodeBtn = document.createElement('button');
  copyCodeBtn.type = 'button';
  copyCodeBtn.textContent = 'Copiar código';
  copyCodeBtn.style.cssText = `
    background: var(--bg-base); border: 1px solid var(--border);
    color: var(--text-primary); padding: 0.375rem 0.875rem; border-radius: 0.375rem;
    cursor: pointer; font-size: 0.75rem;
  `;
  copyCodeBtn.onclick = async () => {
    await navigator.clipboard.writeText(session.accessCode);
    copyCodeBtn.textContent = '✓ Copiado!';
    setTimeout(() => { copyCodeBtn.textContent = 'Copiar código'; }, 2000);
    markCodeShared(session, refresh);
  };
  codeCard.appendChild(copyCodeBtn);
  wrap.appendChild(codeCard);

  // Link completo
  const linkLabel = document.createElement('div');
  linkLabel.textContent = 'Link completo da galeria';
  linkLabel.style.cssText = 'font-size:0.8125rem; font-weight:500; color:var(--text-secondary);';
  wrap.appendChild(linkLabel);

  const linkRow = document.createElement('div');
  linkRow.style.cssText = `
    display: flex; gap: 0.5rem; align-items: stretch;
    background: var(--bg-surface); border: 1px solid var(--border);
    border-radius: 0.5rem; padding: 0.5rem; overflow: hidden;
  `;
  const linkInput = document.createElement('input');
  linkInput.type = 'text';
  linkInput.readOnly = true;
  linkInput.value = buildGalleryUrl(session);
  linkInput.style.cssText = `
    flex: 1; background: transparent; border: none; outline: none;
    color: var(--text-primary); font-family: monospace; font-size: 0.8125rem;
    padding: 0 0.5rem; min-width: 0;
    user-select: none; -webkit-user-select: none; pointer-events: none;
  `;
  linkRow.appendChild(linkInput);

  const copyLinkBtn = document.createElement('button');
  copyLinkBtn.type = 'button';
  copyLinkBtn.textContent = 'Copiar link';
  copyLinkBtn.style.cssText = `
    background: var(--accent); color: white; border: none;
    padding: 0.5rem 1rem; border-radius: 0.375rem;
    cursor: pointer; font-size: 0.8125rem; font-weight: 500;
    white-space: nowrap;
  `;
  copyLinkBtn.onclick = async () => {
    await navigator.clipboard.writeText(linkInput.value);
    copyLinkBtn.textContent = '✓ Copiado!';
    setTimeout(() => { copyLinkBtn.textContent = 'Copiar link'; }, 2000);
    markCodeShared(session, refresh);
  };
  linkRow.appendChild(copyLinkBtn);
  wrap.appendChild(linkRow);

  return wrap;
}

function renderChannelCards(session, refresh) {
  const clientEmail = session.clientId?.email || session.clientEmail || '';
  const clientPhone = session.clientId?.phone || '';
  const clientName = session.clientId?.name || session.name || 'Cliente';
  const orgName = appState.appData?.organization?.name || '';

  let emailTextareaEl = null;
  let waTextareaEl = null;

  const cards = document.createElement('div');
  cards.style.cssText = 'display:flex; flex-direction:column; gap:0.75rem;';

  // Card E-mail com mensagem editável
  cards.appendChild(buildEditableChannelCard({
    icon: '📧',
    title: 'E-mail',
    subtitle: clientEmail || 'Sem e-mail cadastrado',
    disabled: !clientEmail,
    primary: true,
    actionLabel: session.codeSentAt ? 'Reenviar' : 'Enviar',
    defaultMessage: buildShareEmailIntro(session),
    messageLabel: 'Personalizar mensagem do e-mail',
    onTextareaReady: el => { emailTextareaEl = el; },
    onInput: async (val) => {
      await apiPut(`/api/sessions/${session._id}/custom-messages`, { customShareEmailIntro: val });
      session.customShareEmailIntro = val;
    },
    onClick: async () => {
      const emailIntro = emailTextareaEl?.value?.trim() || undefined;
      try {
        const payload = { channel: 'email' };
        if (emailIntro) payload.emailIntro = emailIntro;
        const res = await apiPost(`/api/sessions/${session._id}/send-code`, payload);
        window.showToast?.(`E-mail enviado para ${res.emailSentTo}`, 'success');
        await refresh();
      } catch (err) {
        window.showToast?.('Erro ao enviar: ' + err.message, 'error');
      }
    }
  }));

  // Card WhatsApp com mensagem editável
  cards.appendChild(buildEditableChannelCard({
    icon: '💬',
    title: 'WhatsApp',
    subtitle: clientPhone ? formatPhone(clientPhone) : 'Sem telefone — abrirá vazio',
    disabled: false,
    primary: false,
    actionLabel: 'Abrir WhatsApp',
    defaultMessage: buildShareWhatsAppText({ session, accessCode: session.accessCode, recipientName: clientName, orgName }),
    messageLabel: 'Personalizar mensagem do WhatsApp',
    onTextareaReady: el => { waTextareaEl = el; },
    onInput: async (val) => {
      await apiPut(`/api/sessions/${session._id}/custom-messages`, { customShareWhatsAppText: val });
      session.customShareWhatsAppText = val;
    },
    onClick: async () => {
      const customText = waTextareaEl?.value?.trim() || undefined;
      try {
        const res = await apiPost(`/api/sessions/${session._id}/send-code`, { channel: 'whatsapp' });
        if (res.whatsappUrl) {
          let url = res.whatsappUrl;
          if (customText) {
            let phone = String(clientPhone || '').replace(/\D/g, '');
            if (phone && (phone.length === 10 || phone.length === 11)) phone = '55' + phone;
            const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
            url = `${base}?text=${encodeURIComponent(customText)}`;
          }
          window.open(url, '_blank');
          window.showToast?.(res.hasPhone ? 'Abrindo WhatsApp...' : 'WhatsApp aberto (sem número — digite ao abrir)', 'info');
          await refresh();
        }
      } catch (err) {
        window.showToast?.('Erro ao gerar link: ' + err.message, 'error');
      }
    }
  }));

  // Card copiar link (sem textarea)
  cards.appendChild(makeChannelCard({
    icon: '🔗',
    title: 'Copiar link',
    subtitle: 'Cole onde quiser (DM, e-mail próprio, SMS)',
    disabled: false,
    primary: false,
    onClick: async () => {
      const url = buildGalleryUrl(session);
      await navigator.clipboard.writeText(url);
      window.showToast?.('Link copiado para a área de transferência', 'success');
      markCodeShared(session, refresh);
    },
    actionLabel: 'Copiar'
  }));

  return cards;
}

function buildPreviewButton(session) {
  const previewWrap = document.createElement('div');
  previewWrap.style.cssText = 'padding-top:0.5rem; border-top:1px solid var(--border);';
  const previewBtn = document.createElement('button');
  previewBtn.type = 'button';
  previewBtn.textContent = '👁️ Ver como cliente (preview)';
  previewBtn.title = 'Abre a galeria em nova aba como se você fosse o cliente';
  previewBtn.style.cssText = `
    background: transparent; border: 1px solid var(--border);
    color: var(--text-secondary); padding: 0.5rem 1rem; border-radius: 0.375rem;
    cursor: pointer; font-size: 0.8125rem;
  `;
  previewBtn.onclick = () => {
    const base = buildGalleryUrl(session);
    const token = appState.authToken || '';
    const url = token ? `${base}&_ap=${encodeURIComponent(token)}` : base;
    window.open(url, '_blank');
  };
  previewWrap.appendChild(previewBtn);
  return previewWrap;
}

function buildAdvanceButton(session, switchStep) {
  const nextId = nextStepIdAfter(session.mode, 2);
  const labelByStep = { 4: 'Acompanhar seleção', 5: 'Subir editadas', 6: 'Entregar' };
  const advance = document.createElement('div');
  advance.style.cssText = 'display:flex; justify-content:flex-end;';
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.textContent = `Próximo: ${labelByStep[nextId] || 'continuar'} →`;
  nextBtn.style.cssText = `
    background: var(--accent); color: white; border: none;
    padding: 0.625rem 1.25rem; border-radius: 0.5rem;
    cursor: pointer; font-weight: 500; font-size: 0.875rem;
  `;
  nextBtn.onclick = () => switchStep(nextId || 4);
  advance.appendChild(nextBtn);
  return advance;
}

// Painel de participantes para multi_selection / multi_instant.
function renderParticipantsPanel(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:0.75rem;';

  const head = document.createElement('div');
  head.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:0.5rem;';
  const headLeft = document.createElement('div');
  headLeft.innerHTML = `
    <div style="font-size:0.875rem; font-weight:600; color:var(--text-primary);">Participantes (${(session.participants || []).length})</div>
    <div style="font-size:0.75rem; color:var(--text-muted);">Cada um tem código próprio. Envie individualmente.</div>
  `;
  const manageBtn = document.createElement('button');
  manageBtn.type = 'button';
  manageBtn.textContent = '+ Gerenciar participantes';
  manageBtn.style.cssText = `
    background: var(--accent); color: white; border: none;
    padding: 0.5rem 0.875rem; border-radius: 0.375rem;
    cursor: pointer; font-size: 0.8125rem; font-weight: 500;
  `;
  manageBtn.onclick = () => {
    if (!window.viewParticipants) return;
    openOverlayModal({
      modalSelector: '#participantsModal',
      opener: () => window.viewParticipants(session._id),
      onClose: refresh
    });
  };
  head.appendChild(headLeft);
  head.appendChild(manageBtn);
  wrap.appendChild(head);

  const participants = session.participants || [];
  if (participants.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = `
      border: 2px dashed var(--border); border-radius: 0.5rem;
      padding: 1.5rem; text-align: center;
      color: var(--text-muted); font-size: 0.875rem;
    `;
    empty.textContent = 'Nenhum participante ainda. Clique em "Gerenciar participantes" para adicionar.';
    wrap.appendChild(empty);
    return wrap;
  }

  const orgName = appState.appData?.organization?.name || 'CliqueZoom';

  participants.forEach(p => {
    const row = document.createElement('div');
    row.style.cssText = `
      background: var(--bg-surface); border: 1px solid var(--border);
      border-radius: 0.5rem; padding: 0.75rem 1rem;
      display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
    `;

    const info = document.createElement('div');
    info.style.cssText = 'flex:1; min-width:200px;';
    info.innerHTML = `
      <div style="font-weight:600; color:var(--text-primary); font-size:0.875rem;">${escapeText(p.name)}</div>
      <div style="font-size:0.6875rem; color:var(--text-muted); display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center; margin-top:0.125rem;">
        <span style="font-family:monospace; color:var(--accent);">${p.accessCode}</span>
        ${p.email ? `<span>· ${escapeText(p.email)}</span>` : ''}
        ${p.phone ? `<span>· ${escapeText(p.phone)}</span>` : ''}
      </div>
    `;
    row.appendChild(info);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex; gap:0.25rem; flex-wrap:wrap;';

    actions.appendChild(miniBtn('🔗 Link', async () => {
      const url = buildGalleryUrlForCode(session, p.accessCode);
      await navigator.clipboard.writeText(url);
      window.showToast?.(`Link de ${p.name} copiado`, 'success');
    }));

    actions.appendChild(miniBtn('💬 WhatsApp', () => {
      const url = buildWhatsAppLink({
        session,
        accessCode: p.accessCode,
        recipientName: p.name,
        recipientPhone: p.phone,
        orgName
      });
      window.open(url, '_blank');
    }));

    actions.appendChild(miniBtn('Copiar código', async () => {
      await navigator.clipboard.writeText(p.accessCode);
      window.showToast?.('Código copiado', 'success');
    }));

    row.appendChild(actions);
    wrap.appendChild(row);
  });

  return wrap;
}

function miniBtn(label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.style.cssText = `
    background: var(--bg-base); color: var(--text-primary);
    border: 1px solid var(--border);
    padding: 0.375rem 0.625rem; border-radius: 0.375rem;
    cursor: pointer; font-size: 0.75rem;
  `;
  b.onclick = onClick;
  return b;
}

function escapeText(s) {
  return String(s || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

// Card de canal com toggle de personalização de mensagem (email ou WhatsApp).
function buildEditableChannelCard({ icon, title, subtitle, disabled, primary, actionLabel, defaultMessage, messageLabel, onTextareaReady, onClick, onInput }) {
  const card = document.createElement('div');
  card.style.cssText = `
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 1rem;
    display: flex; flex-direction: column; gap: 0.5rem;
    opacity: ${disabled ? '0.5' : '1'};
  `;

  const top = document.createElement('div');
  top.style.cssText = 'display:flex; align-items:center; gap:0.5rem;';
  const iconEl = document.createElement('span');
  iconEl.textContent = icon;
  iconEl.style.cssText = 'font-size:1.25rem;';
  const titleEl = document.createElement('div');
  titleEl.textContent = title;
  titleEl.style.cssText = 'font-weight:600; color:var(--text-primary); font-size:0.875rem;';
  top.appendChild(iconEl);
  top.appendChild(titleEl);
  card.appendChild(top);

  const sub = document.createElement('div');
  sub.textContent = subtitle;
  sub.style.cssText = 'font-size:0.75rem; color:var(--text-muted); min-height:1.5em;';
  card.appendChild(sub);

  card.appendChild(buildMessageCustomizer({ label: messageLabel, defaultText: defaultMessage, onTextareaReady, onInput }));

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = actionLabel;
  btn.disabled = disabled;
  btn.style.cssText = `
    background: ${primary ? 'var(--accent)' : 'var(--bg-base)'};
    color: ${primary ? 'white' : 'var(--text-primary)'};
    border: ${primary ? 'none' : '1px solid var(--border)'};
    padding: 0.5rem; border-radius: 0.375rem;
    cursor: ${disabled ? 'not-allowed' : 'pointer'}; font-size: 0.8125rem; font-weight: 500;
  `;
  btn.onclick = onClick;
  card.appendChild(btn);

  return card;
}

function makeChannelCard({ icon, title, subtitle, disabled, primary, onClick, actionLabel }) {
  const card = document.createElement('div');
  card.style.cssText = `
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 1rem;
    display: flex; flex-direction: column; gap: 0.5rem;
    opacity: ${disabled ? '0.5' : '1'};
  `;

  const top = document.createElement('div');
  top.style.cssText = 'display:flex; align-items:center; gap:0.5rem;';
  const iconEl = document.createElement('span');
  iconEl.textContent = icon;
  iconEl.style.cssText = 'font-size:1.25rem;';
  const titleEl = document.createElement('div');
  titleEl.textContent = title;
  titleEl.style.cssText = 'font-weight:600; color:var(--text-primary); font-size:0.875rem;';
  top.appendChild(iconEl);
  top.appendChild(titleEl);
  card.appendChild(top);

  const sub = document.createElement('div');
  sub.textContent = subtitle;
  sub.style.cssText = 'font-size:0.75rem; color:var(--text-muted); min-height:1.5em;';
  card.appendChild(sub);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = actionLabel;
  btn.disabled = disabled;
  btn.style.cssText = `
    margin-top: 0.5rem;
    background: ${primary ? 'var(--accent)' : 'var(--bg-base)'};
    color: ${primary ? 'white' : 'var(--text-primary)'};
    border: ${primary ? 'none' : '1px solid var(--border)'};
    padding: 0.5rem; border-radius: 0.375rem;
    cursor: ${disabled ? 'not-allowed' : 'pointer'}; font-size: 0.8125rem; font-weight: 500;
  `;
  btn.onclick = onClick;
  card.appendChild(btn);

  return card;
}

function formatPhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}
