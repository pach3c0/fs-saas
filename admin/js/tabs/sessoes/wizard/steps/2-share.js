// Passo 2 do wizard — Compartilhar.
// Combina o display do código de acesso (com link da galeria) e os canais de envio
// (e-mail, WhatsApp, copiar). Em multi-seleção, mostra a lista de participantes em vez
// dos cards do cliente principal.
// A visualização desse passo já marca codeViewedAt no servidor (feito no switchStep).

import { apiPost, apiPut } from '../../../../utils/api.js';
import { icon } from '../../../../utils/icons.js';
import {
  buildGalleryUrl, buildGalleryUrlForCode, buildWhatsAppLink, buildWhatsAppDeliveryLink, openOverlayModal,
  buildShareEmailIntro, buildShareWhatsAppText, buildMessageCustomizer,
  buildDeliveryEmailIntro, buildDeliveryWhatsAppText
} from '../utils.js';
import { nextStepIdAfter } from '../stepper.js';
import { appState } from '../../../../state.js';

export function renderStepShare({ session, refresh, switchStep }) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.5rem; max-width:720px;';

  const isGallery = session.mode === 'gallery';
  const isMulti = session.mode === 'multi_selection' || session.mode === 'multi_instant';

  // Header
  const subtitle = isGallery
    ? 'Compartilhe a galeria. O cliente vai visualizar e baixar diretamente — não há etapa de seleção.'
    : isMulti
      ? 'Cada participante tem um código próprio. Envie individualmente abaixo.'
      : 'O código já foi gerado quando a sessão foi criada. Compartilhe com o cliente pelo canal que preferir.';
  const header = document.createElement('div');
  header.style.cssText = 'text-align:center; display:flex; flex-direction:column; align-items:center;';
  header.innerHTML = `
    <h2 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin:0 0 0.25rem;">Compartilhar</h2>
    <p style="color:var(--text-secondary); font-size:0.875rem; margin:0; max-width:600px;">${subtitle}</p>
  `;
  wrap.appendChild(header);

  // Status do envio (selection/gallery)
  if (!isMulti && session.codeSentAt) {
    const sentBadge = document.createElement('div');
    sentBadge.style.cssText = `
      background: color-mix(in srgb, var(--green) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--green) 30%, transparent);
      border-radius:var(--r-card); padding: 0.75rem 1rem;
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
      wrap.appendChild(buildAdvanceButton(session, switchStep, refresh));
    }
    return wrap;
  }

  // Bloco 1: Grid de botões circulares
  const btnGrid = document.createElement('div');
  btnGrid.style.cssText = 'display:flex; justify-content:center; gap:2.5rem; flex-wrap:wrap; margin:1.5rem 0;';

  const channels = [
    { id: 'code', icon: icon('cadeado', 24), label: 'Código' },
    { id: 'link', icon: icon('link', 24), label: 'Link' },
    { id: 'email', icon: icon('email', 24), label: 'E-mail' },
    { id: 'whatsapp', icon: icon('whatsapp', 24), label: 'WhatsApp' }
  ];

  channels.forEach((ch, idx) => {
    const btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:0.5rem;';
    
    const circle = document.createElement('button');
    circle.type = 'button';
    circle.style.cssText = `
      width:64px; height:64px; border-radius:50%;
      background:var(--bg-surface); border:2px solid var(--border);
      color:var(--text-primary);
      display:flex; align-items:center; justify-content:center;
      cursor:pointer;
      transition:transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s, box-shadow 0.2s;
    `;
    circle.innerHTML = ch.icon;
    circle.onmouseenter = () => { 
      circle.style.transform = 'scale(1.05)'; 
      circle.style.borderColor = 'var(--accent)'; 
      circle.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
    };
    circle.onmouseleave = () => { 
      circle.style.transform = 'scale(1)'; 
      circle.style.borderColor = 'var(--border)'; 
      circle.style.boxShadow = 'none';
    };
    circle.onclick = () => openShareLightbox(session, refresh, idx);

    const lbl = document.createElement('span');
    lbl.textContent = ch.label;
    lbl.style.cssText = 'font-size:0.875rem; font-weight:500; color:var(--text-primary);';

    btnWrap.appendChild(circle);
    btnWrap.appendChild(lbl);
    btnGrid.appendChild(btnWrap);
  });

  wrap.appendChild(btnGrid);

  wrap.appendChild(buildPreviewButton(session));
  if (session.codeSentAt) wrap.appendChild(buildAdvanceButton(session, switchStep, refresh));

  return wrap;
}

async function markCodeShared(session, refresh) {
  if (session.codeSentAt) return;
  try {
    await apiPost(`/api/sessions/${session._id}/send-code`, { channel: 'copy' });
    session.codeSentAt = new Date().toISOString();
    await refresh?.();
  } catch (err) {
    console.warn('Não foi possível registrar o compartilhamento:', err.message);
  }
}

// ==========================================
// LIGHTBOX DE COMPARTILHAMENTO
// ==========================================
function openShareLightbox(session, refresh, startIndex) {
  if (!document.getElementById('cz-share-lb-styles')) {
    const s = document.createElement('style');
    s.id = 'cz-share-lb-styles';
    s.textContent = `
      #czShareLb {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(0,0,0,0.85);
        backdrop-filter: saturate(180%) blur(12px);
        -webkit-backdrop-filter: saturate(180%) blur(12px);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 1rem;
        animation: czLbFadeIn 0.2s ease;
      }
      .cz-share-lb-content {
        background: var(--bg-base);
        border: 1px solid var(--border);
        border-radius: var(--r-card);
        padding: 2rem;
        width: 100%; max-width: 480px;
        box-shadow: 0 24px 60px rgba(0,0,0,0.6);
        animation: czLbIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      }
      @keyframes czLbIn {
        from { opacity: 0; transform: translateY(20px) scale(0.98); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(s);
  }

  document.getElementById('czShareLb')?.remove();
  
  let current = startIndex;

  const lb = document.createElement('div');
  lb.id = 'czShareLb';

  const lbIcon = (paths, size = 20) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0">${paths}</svg>`;
  const ICON_X        = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
  const ICON_PREV     = '<polyline points="15 18 9 12 15 6"/>';
  const ICON_NEXT     = '<polyline points="9 18 15 12 9 6"/>';

  const closeBtn = document.createElement('button');
  closeBtn.title = 'Fechar (ESC)';
  closeBtn.innerHTML = lbIcon(ICON_X, 24);
  closeBtn.style.cssText = `
    position: absolute; top: 1.5rem; right: 1.5rem;
    background: transparent; color: white; border: none; cursor: pointer;
    padding: 0.5rem; border-radius: 50%; opacity: 0.7; transition: opacity 0.2s, background 0.2s;
  `;
  closeBtn.onmouseenter = () => { closeBtn.style.opacity = '1'; closeBtn.style.background = 'rgba(255,255,255,0.1)'; };
  closeBtn.onmouseleave = () => { closeBtn.style.opacity = '0.7'; closeBtn.style.background = 'transparent'; };
  closeBtn.onclick = () => lb.remove();

  const navRow = document.createElement('div');
  navRow.style.cssText = 'display:flex; align-items:center; gap:1.5rem; width:100%; max-width:640px; justify-content:space-between;';

  const makeNavBtn = (iconSvg, isNext) => {
    const b = document.createElement('button');
    b.innerHTML = lbIcon(iconSvg, 28);
    b.style.cssText = `
      background: rgba(255,255,255,0.1); color: white; border: none; cursor: pointer;
      width: 48px; height: 48px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s, transform 0.2s;
    `;
    b.onmouseenter = () => { b.style.background = 'rgba(255,255,255,0.2)'; b.style.transform = isNext ? 'translateX(4px)' : 'translateX(-4px)'; };
    b.onmouseleave = () => { b.style.background = 'rgba(255,255,255,0.1)'; b.style.transform = 'translateX(0)'; };
    return b;
  };

  const prevBtn = makeNavBtn(ICON_PREV, false);
  const nextBtn = makeNavBtn(ICON_NEXT, true);

  const contentWrap = document.createElement('div');
  contentWrap.className = 'cz-share-lb-content';

  const slides = [
    () => buildCodeSlide(session, refresh),
    () => buildLinkSlide(session, refresh),
    () => buildEmailSlide(session, refresh),
    () => buildWhatsAppSlide(session, refresh)
  ];

  function goTo(idx) {
    if (idx < 0) idx = slides.length - 1;
    if (idx >= slides.length) idx = 0;
    current = idx;
    contentWrap.innerHTML = '';
    contentWrap.appendChild(slides[current]());
  }

  prevBtn.onclick = () => goTo(current - 1);
  nextBtn.onclick = () => goTo(current + 1);

  navRow.appendChild(prevBtn);
  navRow.appendChild(contentWrap);
  navRow.appendChild(nextBtn);

  lb.appendChild(closeBtn);
  lb.appendChild(navRow);

  lb.addEventListener('click', (e) => {
    if (e.target === lb) lb.remove();
  });

  const onKey = (e) => {
    if (!document.getElementById('czShareLb')) { document.removeEventListener('keydown', onKey); return; }
    if (e.key === 'Escape') lb.remove();
    if (e.key === 'ArrowLeft') goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  };
  document.addEventListener('keydown', onKey);

  document.body.appendChild(lb);
  goTo(startIndex);
}

// ==========================================
// SLIDES INDIVIDUAIS
// ==========================================

function buildCodeSlide(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.5rem; align-items:center; text-align:center;';
  
  const iconEl = document.createElement('div');
  iconEl.innerHTML = icon('cadeado', 48);
  iconEl.style.color = 'var(--text-primary)';
  wrap.appendChild(iconEl);

  const title = document.createElement('h3');
  title.textContent = 'Código de Acesso';
  title.style.cssText = 'margin:0; font-size:1.25rem; font-weight:600; color:var(--text-primary);';
  wrap.appendChild(title);

  const codeValue = document.createElement('div');
  codeValue.textContent = session.accessCode;
  codeValue.style.cssText = `
    font-family: monospace; font-size: 2.5rem; font-weight: 700;
    letter-spacing: 0.5rem; color: var(--accent);
    user-select: none; -webkit-user-select: none;
    background: var(--bg-surface); padding: 1rem 2rem; border-radius: var(--r-card);
    border: 1px solid var(--border); width: 100%; box-sizing: border-box;
  `;
  wrap.appendChild(codeValue);

  const copyCodeBtn = document.createElement('button');
  copyCodeBtn.type = 'button';
  copyCodeBtn.textContent = 'Copiar código';
  copyCodeBtn.style.cssText = `
    background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border);
    padding: 0.75rem 1.5rem; border-radius:var(--r-field);
    cursor: pointer; font-size: 0.875rem; font-weight:500;
    width: 100%; transition: background 0.2s;
  `;
  copyCodeBtn.onmouseenter = () => { copyCodeBtn.style.background = 'var(--bg-hover)'; };
  copyCodeBtn.onmouseleave = () => { copyCodeBtn.style.background = 'var(--bg-surface)'; };
  copyCodeBtn.onclick = async () => {
    await navigator.clipboard.writeText(session.accessCode);
    copyCodeBtn.textContent = '✓ Copiado!';
    setTimeout(() => { copyCodeBtn.textContent = 'Copiar código'; }, 2000);
    markCodeShared(session, refresh);
  };
  wrap.appendChild(copyCodeBtn);

  return wrap;
}

function buildLinkSlide(session, refresh) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.5rem; align-items:center; text-align:center;';
  
  const iconEl = document.createElement('div');
  iconEl.innerHTML = icon('link', 48);
  iconEl.style.color = 'var(--text-primary)';
  wrap.appendChild(iconEl);

  const title = document.createElement('h3');
  title.textContent = 'Link Direto';
  title.style.cssText = 'margin:0; font-size:1.25rem; font-weight:600; color:var(--text-primary);';
  wrap.appendChild(title);

  const desc = document.createElement('p');
  desc.textContent = 'O link completo já inclui o código de acesso.';
  desc.style.cssText = 'margin:0; font-size:0.875rem; color:var(--text-secondary);';
  wrap.appendChild(desc);

  const linkInput = document.createElement('input');
  linkInput.type = 'text';
  linkInput.readOnly = true;
  linkInput.value = buildGalleryUrl(session);
  linkInput.style.cssText = `
    background: var(--bg-surface); border: 1px solid var(--border);
    color: var(--text-primary); font-family: monospace; font-size: 0.8125rem;
    padding: 1rem; border-radius: var(--r-field); width: 100%; box-sizing: border-box;
    text-align: center;
  `;
  wrap.appendChild(linkInput);

  const copyLinkBtn = document.createElement('button');
  copyLinkBtn.type = 'button';
  copyLinkBtn.textContent = 'Copiar link';
  copyLinkBtn.style.cssText = `
    background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border);
    padding: 0.75rem 1.5rem; border-radius:var(--r-field);
    cursor: pointer; font-size: 0.875rem; font-weight:500;
    width: 100%; transition: background 0.2s;
  `;
  copyLinkBtn.onmouseenter = () => { copyLinkBtn.style.background = 'var(--bg-hover)'; };
  copyLinkBtn.onmouseleave = () => { copyLinkBtn.style.background = 'var(--bg-surface)'; };
  copyLinkBtn.onclick = async () => {
    await navigator.clipboard.writeText(linkInput.value);
    copyLinkBtn.textContent = '✓ Copiado!';
    setTimeout(() => { copyLinkBtn.textContent = 'Copiar link'; }, 2000);
    markCodeShared(session, refresh);
  };
  wrap.appendChild(copyLinkBtn);

  return wrap;
}

function buildEmailSlide(session, refresh) {
  const clientEmail = session.clientId?.email || session.clientEmail || '';
  
  return buildEditableChannelCard({
    icon: icon('email', 32),
    title: 'E-mail',
    subtitle: clientEmail || 'Sem e-mail cadastrado (não é possível enviar)',
    disabled: !clientEmail,
    primary: true,
    actionLabel: session.codeSentAt ? 'Reenviar E-mail' : 'Enviar E-mail',
    defaultMessage: buildShareEmailIntro(session),
    messageLabel: 'Personalizar mensagem do e-mail',
    onInput: async (val) => {
      await apiPut(`/api/sessions/${session._id}/custom-messages`, { customShareEmailIntro: val });
      session.customShareEmailIntro = val;
    },
    onClick: async (text) => {
      const emailIntro = text?.trim() || undefined;
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
  });
}

function buildWhatsAppSlide(session, refresh) {
  const clientPhone = session.clientId?.phone || session.clientPhone || '';
  const clientName = session.clientId?.name || session.clientName || session.name || 'Cliente';
  const orgName = appState.appData?.organization?.name || '';

  return buildEditableChannelCard({
    icon: icon('whatsapp', 32),
    title: 'WhatsApp',
    subtitle: clientPhone ? formatPhone(clientPhone) : 'Sem telefone cadastrado — o app abrirá vazio',
    disabled: false,
    primary: true, // both can be primary in the modal
    actionLabel: 'Abrir WhatsApp',
    defaultMessage: buildShareWhatsAppText({ session, accessCode: session.accessCode, recipientName: clientName, orgName }),
    messageLabel: 'Personalizar mensagem do WhatsApp',
    onInput: async (val) => {
      await apiPut(`/api/sessions/${session._id}/custom-messages`, { customShareWhatsAppText: val });
      session.customShareWhatsAppText = val;
    },
    onClick: async (text) => {
      const customText = text?.trim() || undefined;
      try {
        const res = await apiPost(`/api/sessions/${session._id}/send-code`, { channel: 'whatsapp' });
        if (res.whatsappUrl) {
          let url = res.whatsappUrl;
          if (customText) {
            let phone = String(clientPhone || '').replace(/\\D/g, '');
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
  });
}

// Card de canal genérico usado para E-mail e WhatsApp no modal
function buildEditableChannelCard({ icon, title, subtitle, disabled, primary, actionLabel, defaultMessage, messageLabel, onClick, onInput }) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.5rem; text-align:left;';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex; align-items:center; gap:0.75rem;';
  const iconEl = document.createElement('div');
  iconEl.innerHTML = icon;
  iconEl.style.color = 'var(--text-primary)';
  const titleWrap = document.createElement('div');
  const tEl = document.createElement('div');
  tEl.textContent = title;
  tEl.style.cssText = 'font-size:1.125rem; font-weight:600; color:var(--text-primary);';
  const sEl = document.createElement('div');
  sEl.textContent = subtitle;
  sEl.style.cssText = 'font-size:0.875rem; color:var(--text-muted);';
  titleWrap.appendChild(tEl);
  titleWrap.appendChild(sEl);
  header.appendChild(iconEl);
  header.appendChild(titleWrap);
  wrap.appendChild(header);

  let textareaEl = null;

  wrap.appendChild(buildMessageCustomizer({ 
    label: messageLabel, 
    defaultText: defaultMessage, 
    onTextareaReady: el => { textareaEl = el; }, 
    onInput 
  }));

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = actionLabel;
  btn.disabled = disabled;
  btn.style.cssText = `
    background: var(--bg-surface);
    color: var(--text-primary);
    border: 1px solid var(--border);
    padding: 0.75rem; border-radius:var(--r-field); width: 100%;
    cursor: ${disabled ? 'not-allowed' : 'pointer'}; font-size: 0.875rem; font-weight: 500;
    transition: background 0.2s, opacity 0.2s; opacity: ${disabled ? '0.5' : '1'};
  `;
  btn.onmouseenter = () => { if(!disabled) btn.style.background = 'var(--bg-hover)'; };
  btn.onmouseleave = () => { if(!disabled) btn.style.background = 'var(--bg-surface)'; };
  btn.onclick = () => onClick(textareaEl?.value);
  wrap.appendChild(btn);

  return wrap;
}

// ==========================================
// OUTROS COMPONENTES
// ==========================================

function buildPreviewButton(session) {
  const previewWrap = document.createElement('div');
  previewWrap.style.cssText = 'padding-top:1.5rem; border-top:1px solid var(--border); display:flex; justify-content:center;';
  const previewBtn = document.createElement('button');
  previewBtn.type = 'button';
  previewBtn.innerHTML = `<span style="display:flex; align-items:center; justify-content:center; gap:0.5rem;">${icon('olho', 16)} Ver como cliente (preview)</span>`;
  previewBtn.title = 'Abre a galeria em nova aba como se você fosse o cliente';
  previewBtn.style.cssText = `
    background: transparent; border: 1px solid var(--border);
    color: var(--text-secondary); padding: 0.5rem 1.25rem; border-radius:9999px;
    cursor: pointer; font-size: 0.8125rem;
    transition: background 0.2s, color 0.2s;
  `;
  previewBtn.onmouseenter = () => { previewBtn.style.background = 'var(--bg-hover)'; };
  previewBtn.onmouseleave = () => { previewBtn.style.background = 'transparent'; };
  previewBtn.onclick = () => {
    const base = buildGalleryUrl(session);
    const token = appState.authToken || '';
    const url = token ? `${base}&_ap=${encodeURIComponent(token)}` : base;
    window.open(url, '_blank');
  };
  previewWrap.appendChild(previewBtn);
  return previewWrap;
}

function buildAdvanceButton(session, switchStep, refresh) {
  const isGallery = session.mode === 'gallery';
  const nextId = nextStepIdAfter(session.mode, 2);
  if (!nextId && !isGallery) return document.createDocumentFragment();

  const isDelivered = Boolean(session.deliveredAt) || session.selectionStatus === 'delivered';
  const labelByStep = { 4: 'Acompanhar seleção', 5: 'Subir editadas', 6: 'Entregar' };
  
  const advance = document.createElement('div');
  advance.style.cssText = 'display:flex; justify-content:center; padding-top: 1rem;';
  
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.style.cssText = `
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 0;
    height: 44px;
    width: auto;
    min-width: 44px;
    flex-shrink: 0;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 9999px;
    cursor: pointer;
    overflow: hidden;
    white-space: nowrap;
    background: var(--bg-surface);
    color: var(--text-primary);
    transition: background 0.15s, border-color 0.15s, color 0.15s;
    margin: 0 auto;
  `;

  const iconDiv = document.createElement('div');
  iconDiv.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    flex-shrink: 0;
  `;

  const labelDiv = document.createElement('div');
  labelDiv.style.cssText = `
    max-width: 0;
    opacity: 0;
    overflow: hidden;
    white-space: nowrap;
    display: inline-block;
    vertical-align: middle;
    transition: max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-weight: 500;
    font-size: 0.875rem;
  `;

  if (isGallery) {
    iconDiv.innerHTML = icon('check', 20);
    labelDiv.textContent = isDelivered ? 'Re-entregar (notificar novamente)' : 'Entregar e notificar cliente';

    btn.onmouseenter = () => {
      btn.style.background = 'var(--bg-hover)';
      labelDiv.style.maxWidth = isDelivered ? '18rem' : '15rem';
      labelDiv.style.opacity = '1';
      labelDiv.style.paddingRight = '1.25rem';
    };
    btn.onmouseleave = () => {
      btn.style.background = 'var(--bg-surface)';
      labelDiv.style.maxWidth = '0';
      labelDiv.style.opacity = '0';
      labelDiv.style.paddingRight = '0';
    };

    btn.onclick = async () => {
      const payload = await showDeliveryModal(session);
      if (!payload) return;

      try {
        const apiPayload = {};
        if (payload.sendEmail) apiPayload.emailIntro = payload.emailIntro;
        else apiPayload.skipEmail = true;

        await apiPut(`/api/sessions/${session._id}/deliver`, apiPayload);
        
        window.showToast?.(isDelivered ? 'Cliente notificado novamente' : 'Sessão entregue! Cliente notificado.', 'success');
        
        if (payload.sendWhatsapp) {
          const orgName = appState.appData?.organization?.name || 'CliqueZoom';
          const url = buildWhatsAppDeliveryLink({
            session,
            accessCode: session.accessCode,
            recipientName: session.clientName || session.name,
            recipientPhone: session.clientPhone,
            orgName,
            customText: payload.whatsappText
          });
          window.open(url, '_blank');
        }

        await refresh();
      } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
    };
  } else {
    iconDiv.innerHTML = icon('chevronDireita', 20);
    labelDiv.textContent = `Próximo: ${labelByStep[nextId] || 'continuar'}`;
    
    btn.onmouseenter = () => {
      btn.style.background = 'var(--bg-hover)';
      labelDiv.style.maxWidth = '16rem';
      labelDiv.style.opacity = '1';
      labelDiv.style.paddingRight = '1.25rem';
    };
    btn.onmouseleave = () => {
      btn.style.background = 'var(--bg-surface)';
      labelDiv.style.maxWidth = '0';
      labelDiv.style.opacity = '0';
      labelDiv.style.paddingRight = '0';
    };
    btn.onclick = () => switchStep(nextId);
  }

  btn.appendChild(iconDiv);
  btn.appendChild(labelDiv);
  advance.appendChild(btn);
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
  manageBtn.className = 'header-expand-btn';
  manageBtn.title = 'Gerenciar participantes';
  manageBtn.style.cssText = 'cursor: pointer;';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'header-expand-icon';
  iconWrap.style.cssText = 'display:flex !important; align-items:center !important; justify-content:center !important; width:34px !important; height:34px !important;';
  iconWrap.innerHTML = icon('config', 16);

  const labelSpan = document.createElement('span');
  labelSpan.className = 'header-expand-label';
  labelSpan.textContent = 'Gerenciar participantes';

  manageBtn.appendChild(iconWrap);
  manageBtn.appendChild(labelSpan);
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
      border: 2px dashed var(--border); border-radius:var(--r-card);
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
      border-radius:var(--r-card); padding: 0.75rem 1rem;
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

    actions.appendChild(miniBtn(`<span style="display:flex;align-items:center;gap:0.375rem;">${icon('link', 14)} Link</span>`, async () => {
      const url = buildGalleryUrlForCode(session, p.accessCode);
      await navigator.clipboard.writeText(url);
      window.showToast?.(`Link de ${p.name} copiado`, 'success');
    }));

    actions.appendChild(miniBtn(`<span style="display:flex;align-items:center;gap:0.375rem;">${icon('whatsapp', 14)} WhatsApp</span>`, () => {
      const url = buildWhatsAppLink({
        session,
        accessCode: p.accessCode,
        recipientName: p.name,
        recipientPhone: p.phone,
        orgName
      });
      window.open(url, '_blank');
    }));

    actions.appendChild(miniBtn(`<span style="display:flex;align-items:center;gap:0.375rem;">${icon('cadeado', 14)} Copiar código</span>`, async () => {
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
  b.innerHTML = label;
  b.style.cssText = `
    background: var(--bg-base); color: var(--text-primary);
    border: 1px solid var(--border);
    padding: 0.375rem 0.625rem; border-radius:var(--r-field);
    cursor: pointer; font-size: 0.75rem;
  `;
  b.onclick = onClick;
  return b;
}

function escapeText(s) {
  return String(s || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
}

function formatPhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

export function showDeliveryModal(session) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:99999;
      display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background:var(--bg-surface); border:1px solid var(--border);
      border-radius:var(--r-card); padding:1.5rem; width:450px; max-width:90vw;
      box-shadow:0 20px 60px rgba(0,0,0,0.4); display:flex; flex-direction:column; gap:1.25rem;
    `;

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-size:1.125rem; font-weight:700; color:var(--text-primary);';
    titleEl.textContent = 'Confirmar entrega?';

    const desc = document.createElement('p');
    desc.style.cssText = 'font-size:0.875rem; color:var(--text-secondary); margin:0;';
    desc.textContent = 'Selecione abaixo como notificar o cliente quando clicar em entregar:';

    const optionsContainer = document.createElement('div');
    optionsContainer.style.cssText = 'display:flex; flex-direction:column; gap:0.75rem;';

    // Opção E-mail
    let emailTextareaEl = null;
    const emailOpt = document.createElement('div');
    emailOpt.style.cssText = 'display:flex; flex-direction:column; gap:0.5rem; background:var(--bg-base); border:1px solid var(--border); border-radius:var(--r-field); padding:0.75rem;';
    
    const emailRow = document.createElement('label');
    emailRow.style.cssText = 'display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.875rem; color:var(--text-primary); font-weight:500;';
    const emailCheckbox = document.createElement('input');
    emailCheckbox.type = 'checkbox';
    emailCheckbox.checked = !!session.clientEmail;
    emailCheckbox.style.accentColor = 'var(--accent)';
    emailRow.appendChild(emailCheckbox);
    emailRow.insertAdjacentHTML('beforeend', `${icon('email', 16)} Notificar por E-mail`);
    
    const emailEditorWrap = document.createElement('div');
    emailEditorWrap.style.display = emailCheckbox.checked ? 'block' : 'none';
    emailEditorWrap.appendChild(buildMessageCustomizer({
      label: 'Editar mensagem do e-mail',
      defaultText: buildDeliveryEmailIntro(session),
      onTextareaReady: el => { emailTextareaEl = el; },
      onInput: () => {}
    }));

    emailCheckbox.onchange = () => {
      emailEditorWrap.style.display = emailCheckbox.checked ? 'block' : 'none';
    };

    emailOpt.appendChild(emailRow);
    emailOpt.appendChild(emailEditorWrap);

    // Opção WhatsApp
    let waTextareaEl = null;
    const waOpt = document.createElement('div');
    waOpt.style.cssText = 'display:flex; flex-direction:column; gap:0.5rem; background:var(--bg-base); border:1px solid var(--border); border-radius:var(--r-field); padding:0.75rem;';
    
    const waRow = document.createElement('label');
    waRow.style.cssText = 'display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.875rem; color:var(--text-primary); font-weight:500;';
    const waCheckbox = document.createElement('input');
    waCheckbox.type = 'checkbox';
    waCheckbox.checked = !!session.clientPhone;
    waCheckbox.style.accentColor = 'var(--accent)';
    waRow.appendChild(waCheckbox);
    waRow.insertAdjacentHTML('beforeend', `${icon('whatsapp', 16)} Notificar por WhatsApp`);

    const waEditorWrap = document.createElement('div');
    waEditorWrap.style.display = waCheckbox.checked ? 'block' : 'none';
    const orgName = appState.appData?.organization?.name || 'CliqueZoom';
    waEditorWrap.appendChild(buildMessageCustomizer({
      label: 'Editar mensagem do WhatsApp',
      defaultText: buildDeliveryWhatsAppText({
        session,
        accessCode: session.accessCode,
        recipientName: session.clientName || session.name,
        orgName
      }),
      onTextareaReady: el => { waTextareaEl = el; },
      onInput: () => {}
    }));

    waCheckbox.onchange = () => {
      waEditorWrap.style.display = waCheckbox.checked ? 'block' : 'none';
    };

    waOpt.appendChild(waRow);
    waOpt.appendChild(waEditorWrap);

    optionsContainer.appendChild(emailOpt);
    optionsContainer.appendChild(waOpt);

    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.5rem;';

    const close = () => { overlay.remove(); resolve(null); };

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.style.cssText = `
      background:transparent; color:var(--text-secondary); border:1px solid var(--border);
      padding:0.5rem 1rem; border-radius:var(--r-field); cursor:pointer; font-size:0.875rem;
    `;
    cancelBtn.onclick = close;

    const proceedBtn = document.createElement('button');
    proceedBtn.type = 'button';
    proceedBtn.textContent = 'Entregar';
    proceedBtn.style.cssText = `
      background:var(--accent); color:var(--bg-base); border:none;
      padding:0.5rem 1rem; border-radius:var(--r-field); cursor:pointer;
      font-size:0.875rem; font-weight:600;
    `;
    proceedBtn.onclick = () => {
      overlay.remove();
      resolve({
        sendEmail: emailCheckbox.checked,
        emailIntro: emailTextareaEl?.value,
        sendWhatsapp: waCheckbox.checked,
        whatsappText: waTextareaEl?.value
      });
    };

    btns.appendChild(cancelBtn);
    btns.appendChild(proceedBtn);

    box.appendChild(titleEl);
    box.appendChild(desc);
    box.appendChild(optionsContainer);
    box.appendChild(btns);
    
    overlay.appendChild(box);
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    document.body.appendChild(overlay);
  });
}
