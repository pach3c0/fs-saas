import { apiGet, apiPost } from '../utils/api.js';

// ── SDK do Mercado Pago (CardForm) ──────────────────────────────────────────
// Loader idempotente (mesmo padrão de loadCropperJs no photoEditor): carrega o
// MercadoPago.js v2 uma única vez, sob demanda, só quando o cliente vai pagar.
let _mpSdkPromise = null;
function loadMercadoPagoSdk() {
  if (window.MercadoPago) return Promise.resolve();
  if (_mpSdkPromise) return _mpSdkPromise;
  _mpSdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://sdk.mercadopago.com/js/v2';
    s.onload = () => resolve();
    s.onerror = () => { _mpSdkPromise = null; reject(new Error('Falha ao carregar o Mercado Pago.')); };
    document.head.appendChild(s);
  });
  return _mpSdkPromise;
}

// Abre o checkout de cartão in-page (CardForm). O cartão é tokenizado NO BROWSER pelo
// MP (campos sensíveis são iframes do próprio MP — PCI fica com eles); só o token uso-único
// chega ao nosso backend. Sem conta MP, sem redirect.
// NOTA DE TEMA: o cartão do modal é forçado a paleta CLARA (hexcodes), de propósito —
// os iframes seguros do MP renderizam texto escuro e ficariam invisíveis sobre o tema dark.
async function openCardCheckout({ plan, planName, amountReais, publicKey, ownerEmail, onDone }) {
  await loadMercadoPagoSdk();

  const _inp = 'width:100%; height:42px; box-sizing:border-box; padding:0 0.75rem; border:1px solid #d0d0d5; border-radius:0.5rem; background:#ffffff; color:#1a1a1a; font-size:0.95rem;';
  const _box = 'height:42px; box-sizing:border-box; padding:0 0.75rem; border:1px solid #d0d0d5; border-radius:0.5rem; background:#ffffff; display:flex; align-items:center;';
  const _lbl = 'display:block; font-size:0.78rem; font-weight:600; color:#444; margin:0 0 0.3rem;';
  const _fld = (label, inner) => `<div style="margin-bottom:0.85rem;"><label style="${_lbl}">${label}</label>${inner}</div>`;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:10000; padding:1rem;';
  overlay.innerHTML = `
    <div style="background:#ffffff; color:#1a1a1a; border-radius:0.75rem; width:100%; max-width:440px; max-height:92vh; overflow:auto; padding:1.5rem; box-shadow:0 12px 40px rgba(0,0,0,0.3);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
        <h3 style="margin:0; font-size:1.1rem; font-weight:700; color:#1a1a1a;">Assinar ${planName}</h3>
        <button type="button" id="czCardClose" style="background:transparent; border:none; color:#888; font-size:1.6rem; line-height:1; cursor:pointer;">&times;</button>
      </div>
      <p style="font-size:0.8rem; color:#666; margin:0 0 1.25rem;">Mensal recorrente · <strong>R$ ${amountReais.toFixed(2)}/mês</strong>. Dados do cartão protegidos pelo Mercado Pago.</p>
      <form id="czCardForm">
        ${_fld('Número do cartão', `<div id="form-checkout__cardNumber" style="${_box}"></div>`)}
        <div style="display:flex; gap:0.75rem;">
          <div style="flex:1;">${_fld('Validade', `<div id="form-checkout__expirationDate" style="${_box}"></div>`)}</div>
          <div style="flex:1;">${_fld('CVV', `<div id="form-checkout__securityCode" style="${_box}"></div>`)}</div>
        </div>
        ${_fld('Nome impresso no cartão', `<input id="form-checkout__cardholderName" type="text" autocomplete="cc-name" style="${_inp}" />`)}
        <!-- E-mail do pagador: pré-preenchido com o e-mail da conta e travado (fora da tela).
             O fotógrafo não digita e-mail — o MP exige o campo só p/ associar o recibo. -->
        <input id="form-checkout__cardholderEmail" type="email" value="${ownerEmail || ''}" readonly tabindex="-1" aria-hidden="true" style="position:absolute; left:-9999px; width:1px; height:1px; opacity:0;" />
        ${ownerEmail ? `<p style="font-size:0.72rem; color:#777; margin:-0.2rem 0 0.85rem;">Recibo e cobrança no e-mail <strong>${ownerEmail}</strong> da sua conta.</p>` : ''}
        <div style="display:flex; gap:0.75rem;">
          <div style="width:130px;">${_fld('Documento', `<select id="form-checkout__identificationType" style="${_inp}"></select>`)}</div>
          <div style="flex:1;">${_fld('Número do documento', `<input id="form-checkout__identificationNumber" type="text" inputmode="numeric" style="${_inp}" />`)}</div>
        </div>
        <select id="form-checkout__issuer" style="display:none;"></select>
        <select id="form-checkout__installments" style="display:none;"></select>
        <div id="czCardError" style="color:#c0392b; font-size:0.82rem; margin:0.25rem 0 0; display:none;"></div>
        <!-- Aceite explícito de cobrança recorrente (CDC Art. 39 III): submit travado até marcar. -->
        <label for="czConsent" style="display:flex; align-items:flex-start; gap:0.55rem; margin-top:1rem; font-size:0.8rem; color:#444; line-height:1.4; cursor:pointer;">
          <input type="checkbox" id="czConsent" style="margin-top:0.15rem; flex:0 0 auto; width:16px; height:16px; cursor:pointer;" />
          <span>Autorizo a cobrança automática mensal de <strong>R$ ${amountReais.toFixed(2)}</strong> neste cartão, renovada a cada mês, até que eu cancele a assinatura.</span>
        </label>
        <button type="submit" id="czCardSubmit" disabled style="width:100%; margin-top:1.1rem; padding:0.8rem; border-radius:0.5rem; border:none; background:#1a1a1a; color:#ffffff; font-weight:700; font-size:0.95rem; cursor:pointer; opacity:0.6;">Carregando…</button>
      </form>
    </div>`;
  document.body.appendChild(overlay);

  const errBox = overlay.querySelector('#czCardError');
  const submitBtn = overlay.querySelector('#czCardSubmit');
  const consentEl = overlay.querySelector('#czConsent');
  const showErr = (msg) => { errBox.textContent = msg; errBox.style.display = 'block'; };
  let mp, cardForm, closed = false, formMounted = false;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    try { cardForm && cardForm.unmount && cardForm.unmount(); } catch (_) {}
    overlay.remove();
  };
  // O submit só libera quando o form do cartão montou E o titular marcou o aceite de
  // cobrança recorrente (CDC Art. 39 III). Sem o aceite, não dá pra assinar.
  const syncSubmit = () => {
    const ready = formMounted && consentEl.checked;
    submitBtn.disabled = !ready;
    submitBtn.style.opacity = ready ? '1' : '0.6';
    submitBtn.textContent = formMounted ? 'Assinar agora' : 'Carregando…';
  };
  const resetSubmit = () => { formMounted = true; syncSubmit(); };
  consentEl.addEventListener('change', syncSubmit);

  overlay.querySelector('#czCardClose').onclick = cleanup;
  overlay.onclick = (e) => { if (e.target === overlay) cleanup(); };

  try {
    mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
    cardForm = mp.cardForm({
      amount: String(amountReais.toFixed(2)),
      iframe: true,
      form: {
        id: 'czCardForm',
        cardNumber:           { id: 'form-checkout__cardNumber', placeholder: '0000 0000 0000 0000' },
        expirationDate:       { id: 'form-checkout__expirationDate', placeholder: 'MM/AA' },
        securityCode:         { id: 'form-checkout__securityCode', placeholder: 'CVV' },
        cardholderName:       { id: 'form-checkout__cardholderName', placeholder: 'Como está no cartão' },
        cardholderEmail:      { id: 'form-checkout__cardholderEmail', placeholder: 'seu@email.com' },
        issuer:               { id: 'form-checkout__issuer' },
        installments:         { id: 'form-checkout__installments' },
        identificationType:   { id: 'form-checkout__identificationType' },
        identificationNumber: { id: 'form-checkout__identificationNumber', placeholder: 'CPF' },
      },
      callbacks: {
        onFormMounted: (error) => {
          if (error) { showErr('Não foi possível carregar o formulário de cartão. Tente novamente.'); return; }
          resetSubmit();
        },
        onSubmit: async (event) => {
          event.preventDefault();
          // Defesa em profundidade: o botão já fica travado sem o aceite, mas reconferimos aqui.
          if (!consentEl.checked) { showErr('Marque a autorização de cobrança mensal para continuar.'); return; }
          submitBtn.disabled = true;
          submitBtn.style.opacity = '0.6';
          submitBtn.textContent = 'Processando…';
          errBox.style.display = 'none';
          const d = cardForm.getCardFormData();
          if (!d || !d.token) { showErr('Confira os dados do cartão.'); resetSubmit(); return; }
          try {
            const result = await apiPost('/api/billing/checkout', {
              plan,
              cardTokenId: d.token,
              payerEmail: d.cardholderEmail,
              identificationType: d.identificationType,
              identificationNumber: d.identificationNumber,
              recurringConsent: true,
              consentAmountCents: Math.round(amountReais * 100),
            });
            cleanup();
            const ok = result && (result.status === 'authorized' || result.status === 'active');
            window.showToast(
              ok ? 'Assinatura ativada! Pode levar alguns minutos para refletir.'
                 : 'Pagamento recebido — estamos confirmando, pode levar alguns minutos.',
              'success'
            );
            onDone && onDone();
          } catch (e) {
            showErr(e.message || 'Falha ao processar o pagamento. Confira os dados e tente de novo.');
            resetSubmit();
          }
        },
        onError: () => { showErr('Confira os dados do cartão e tente novamente.'); resetSubmit(); },
      },
    });
  } catch (e) {
    showErr('Não foi possível iniciar o pagamento. Tente novamente.');
  }
}

export async function renderPlano(container) {
  container.innerHTML = `<div style="color:var(--ad-text); padding:2rem;">Carregando...</div>`;

  try {
    const [subRes, plansRes] = await Promise.all([
      apiGet('/api/billing/subscription'),
      apiGet('/api/billing/plans')
    ]);

    const { subscription, planDetails, usage, stripeConfigured, maxStorageMB, storageAddon, limits, mpPublicKey, ownerEmail, refund } = subRes;
    const { plans } = plansRes;

    _render(container, { subscription, planDetails, usage, plans, stripeAtivo: !!stripeConfigured, maxStorageMB, storageAddon, effLimits: limits, mpPublicKey, ownerEmail, refund });
  } catch (error) {
    container.innerHTML = `<div style="color:var(--ad-red); padding:2rem;">Erro ao carregar: ${error.message}</div>`;
  }
}

function _render(container, { subscription, planDetails, usage, plans, stripeAtivo, maxStorageMB, storageAddon, effLimits, mpPublicKey, ownerEmail, refund }) {
  // Limites efetivos vêm do backend (derivam de plans.js); fallback ao gravado.
  const limites = effLimits || subscription.limits;
  const uso     = subscription.usage;
  const planoKey = subscription.plan;
  const isCortesia = !!subscription.isCourtesy;
  // Cobrança iniciada pelo super-admin (saiu da cortesia / conversão): plano pago, sem
  // assinatura viva ainda → mostra o CTA "Pagar agora" pra ativar o pagamento do plano atual.
  const aguardandoPagamento = subscription.status === 'pending' && planoKey !== 'free' && !isCortesia;
  // Preço personalizado da org (centavos) — sobrescreve o preço do catálogo na exibição.
  const customCents = subscription.customPriceCents > 0 ? subscription.customPriceCents : null;
  // Limite efetivo de storage = base do plano + adicional recorrente (vem pronto do backend).
  const effMaxStorage = Number.isFinite(maxStorageMB) ? maxStorageMB : limites.maxStorage;
  const addonGB = storageAddon?.gb || 0;
  const addonPriceCents = storageAddon?.priceCents || 0;

  const pct = (usado, max) => max === -1 ? 0 : Math.min(100, Math.round((usado / max) * 100));
  const fmtMax = (v) => v === -1 ? '∞' : v.toLocaleString('pt-BR');

  const barColor = (p) => p >= 90 ? 'var(--ad-red)' : p >= 70 ? 'var(--ad-yellow)' : 'var(--ad-accent)';

  const _bar = (label, usado, max) => {
    const p = pct(usado, max);
    return `
      <div>
        <div style="display:flex; justify-content:space-between; margin-bottom:0.375rem;">
          <span style="color:var(--ad-text); opacity:0.7; font-size:0.875rem;">${label}</span>
          <span style="color:var(--ad-text); font-size:0.875rem; font-weight:600;">${usado.toLocaleString('pt-BR')} / ${fmtMax(max)}</span>
        </div>
        <div style="background:color-mix(in srgb, var(--ad-text) 12%, transparent); height:6px; border-radius:9999px; overflow:hidden;">
          <div style="background:${barColor(p)}; height:100%; width:${p}%; transition:width 0.4s ease; border-radius:9999px;"></div>
        </div>
        ${p >= 90 && max !== -1 ? `<p style="font-size:0.75rem; color:var(--ad-red); margin-top:0.25rem;">⚠ Limite quase atingido</p>` : ''}
      </div>`;
  };

  // Armazenamento contra o limite = SÓ as fotos das sessões (decisão de produto).
  // Logo/site e vídeos NÃO contam no limite — aparecem só no detalhamento abaixo.
  const fotosMB = usage?.breakdown?.sessionsMB ?? usage?.storageMB ?? 0;

  const _planCard = (key, plan) => {
    const isCurrent = key === planoKey;
    const isFree    = plan.price === 0;
    const preco     = isFree ? 'Grátis' : `R$ ${(plan.price / 100).toFixed(2)}<span style="font-size:0.875rem; font-weight:400;">/mês</span>`;

    let btnHtml = '';
    if (isCurrent) {
      const rotulo = isCortesia ? 'Plano Atual · cortesia' : 'Plano Atual';
      btnHtml = `<button disabled style="width:100%; padding:0.625rem; border-radius:0.375rem; border:1px solid color-mix(in srgb, var(--ad-text) 20%, transparent); background:transparent; color:var(--ad-text); opacity:0.5; cursor:not-allowed; font-size:0.9rem;">${rotulo}</button>`;
    } else if (!isFree && isCortesia) {
      // Cortesia enxerga todos os planos, mas a troca encerra a cortesia e passa
      // a cobrar — não dispara checkout silencioso (viraria "paga e segue cortesia").
      // Roteia pela conversa com o suporte (fluxo definido pelo dono).
      btnHtml = `
        <button class="cortesiaUpgradeBtn" data-plan="${key}" data-planname="${plan.name}" style="width:100%; padding:0.625rem; border-radius:0.375rem; border:1px solid var(--ad-accent); background:transparent; color:var(--ad-accent); cursor:pointer; font-weight:600; font-size:0.9rem;">Mudar para este plano</button>
        <p style="text-align:center; font-size:0.72rem; color:var(--ad-text); opacity:0.55; margin-top:0.4rem;">Encerra sua cortesia e inicia a cobrança</p>`;
    } else if (!isFree) {
      if (stripeAtivo) {
        btnHtml = `<button class="selectPlanBtn" data-plan="${key}" style="width:100%; padding:0.625rem; border-radius:0.375rem; border:none; background:var(--ad-accent); color:var(--ad-bg-base); cursor:pointer; font-weight:600; font-size:0.9rem;">Selecionar</button>`;
      } else {
        btnHtml = `
          <button disabled title="Pagamentos em breve" style="width:100%; padding:0.625rem; border-radius:0.375rem; border:none; background:var(--ad-accent); color:var(--ad-bg-base); opacity:0.45; cursor:not-allowed; font-weight:600; font-size:0.9rem;">Em Breve</button>
          <p style="text-align:center; font-size:0.75rem; color:var(--ad-text); opacity:0.5; margin-top:0.5rem;">Pagamentos online em breve</p>`;
      }
    }

    return `
      <div style="background:var(--ad-bg-surface); padding:1.75rem; border-radius:0.5rem; border:2px solid ${isCurrent ? 'var(--ad-accent)' : 'color-mix(in srgb, var(--ad-text) 15%, transparent)'}; position:relative; display:flex; flex-direction:column; gap:1rem;">
        ${isCurrent ? `<span style="position:absolute; top:-1px; right:1rem; background:var(--ad-accent); color:var(--ad-bg-base); font-size:0.7rem; font-weight:700; padding:0.2rem 0.6rem; border-radius:0 0 0.375rem 0.375rem; letter-spacing:0.05em;">ATUAL</span>` : ''}
        <div>
          <h4 style="font-size:1.125rem; font-weight:700; color:var(--ad-text); margin:0 0 0.25rem;">${plan.name}</h4>
          <p style="font-size:1.75rem; font-weight:700; color:var(--ad-text); margin:0;">${preco}</p>
        </div>
        <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.5rem; flex:1;">
          ${plan.features.map(f => `<li style="color:var(--ad-text); opacity:0.8; font-size:0.875rem; display:flex; gap:0.5rem; align-items:flex-start;"><span style="color:var(--ad-green); flex-shrink:0;">✓</span>${f}</li>`).join('')}
        </ul>
        ${btnHtml}
      </div>`;
  };

  // ── Mini-vitrine "bloqueado-mas-visível" ─────────────────────────────────
  // Mostra, de forma honesta, o que o plano ATUAL não entrega e em qual tier
  // desbloqueia — alimenta a evolução de plano sem esconder nada. Aparece para
  // TODOS (inclusive cortesia: ela precisa enxergar o que ganha ao sair da
  // cortesia) sempre que houver algo travado.
  const _curCaps = planDetails.capabilities || {};
  // Planos por ordem de preço (mais barato → mais caro) p/ achar o 1º que libera.
  const _ordered = Object.values(plans).sort((a, b) => (a.price || 0) - (b.price || 0));
  const CAP_VITRINE = [
    { label: 'Galeria sem o selo CliqueZoom', has: c => c.selo === false },
    { label: 'CRM completo',                  has: c => c.crm === 'full' },
    { label: 'Lembrete de aniversário',       has: c => !!c.aniversario },
    { label: 'Domínio próprio',               has: c => !!c.dominioProprio },
    { label: 'Tarefas e metas',               has: c => !!c.tarefasMetas },
    { label: 'Finanças da empresa',           has: c => !!c.financasEmpresa },
    { label: 'Finanças pessoais',             has: c => !!c.financasPessoal },
    { label: 'Gestão no modo "misto"',        has: c => !!c.gestaoMista },
  ];
  const travados = CAP_VITRINE
    .filter(cap => !cap.has(_curCaps))
    .map(cap => {
      const tier = _ordered.find(p => cap.has(p.capabilities || {}));
      return tier ? { label: cap.label, planName: tier.name } : null;
    })
    .filter(Boolean);
  // Usuários inclusos (seats) — numérico, não boolean.
  const _curSeats = planDetails.seats || 1;
  const tierSeats = _ordered.find(p => (p.seats || 1) > _curSeats);
  if (tierSeats) travados.push({ label: `${tierSeats.seats} usuários na equipe`, planName: tierSeats.name });

  const vitrineHtml = travados.length ? `
    <div style="background:var(--ad-bg-surface); padding:1.25rem 1.5rem; border-radius:0.5rem; border:1px solid color-mix(in srgb, var(--ad-accent) 25%, transparent);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.875rem;">
        <h3 style="font-size:1rem; font-weight:700; color:var(--ad-text); margin:0;">Desbloqueie mais ao subir de plano</h3>
        <button id="verPlansBtn2" style="background:transparent; border:1px solid var(--ad-accent); color:var(--ad-accent); padding:0.4rem 0.9rem; border-radius:0.375rem; cursor:pointer; font-size:0.8rem; font-weight:600;">Ver planos ↓</button>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
        ${travados.map(it => `
          <span style="display:inline-flex; align-items:center; gap:0.4rem; background:color-mix(in srgb, var(--ad-text) 6%, transparent); border:1px solid color-mix(in srgb, var(--ad-text) 12%, transparent); border-radius:9999px; padding:0.3rem 0.7rem; font-size:0.8rem; color:var(--ad-text);">
            <span style="opacity:0.5;">🔒</span>
            ${it.label}
            <span style="font-size:0.65rem; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; color:var(--ad-accent); background:color-mix(in srgb, var(--ad-accent) 14%, transparent); border-radius:9999px; padding:0.1rem 0.45rem;">${it.planName}</span>
          </span>
        `).join('')}
      </div>
    </div>` : '';

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:2rem; max-width:900px;">
      <h2 style="font-size:1.5rem; font-weight:700; color:var(--ad-text); margin:0;">Seu Plano</h2>

      ${aguardandoPagamento ? `
      <!-- Cobrança pendente (super-admin iniciou a cobrança): CTA pra ativar o pagamento -->
      <div style="padding:1.25rem 1.5rem; background:color-mix(in srgb, var(--ad-yellow) 12%, var(--ad-bg-surface)); border:1px solid color-mix(in srgb, var(--ad-yellow) 45%, transparent); border-radius:0.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
        <div>
          <p style="font-weight:700; color:var(--ad-text); margin:0 0 0.25rem;">Ative o pagamento do seu plano ${planDetails.name}</p>
          <p style="font-size:0.85rem; color:var(--ad-text); opacity:0.75; margin:0;">Sua conta está com a cobrança pendente. Cadastre seu cartão para manter o acesso completo${customCents ? ` por R$ ${(customCents / 100).toFixed(2)}/mês` : (planDetails.price ? ` por R$ ${(planDetails.price / 100).toFixed(2)}/mês` : '')}.</p>
        </div>
        <button id="payNowBtn" style="background:var(--ad-accent); color:var(--ad-bg-base); border:none; padding:0.6rem 1.25rem; border-radius:0.375rem; cursor:pointer; font-size:0.9rem; font-weight:700; white-space:nowrap;">Pagar agora</button>
      </div>` : ''}

      <!-- Plano atual + uso -->
      <div style="background:var(--ad-bg-surface); padding:1.75rem; border-radius:0.5rem; border:2px solid var(--ad-accent);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:700; color:var(--ad-text); margin:0 0 0.25rem; display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
              ${planDetails.name}
              ${isCortesia ? `<span style="font-size:0.7rem; font-weight:700; background:color-mix(in srgb, var(--ad-green) 18%, transparent); color:var(--ad-green); border:1px solid color-mix(in srgb, var(--ad-green) 40%, transparent); border-radius:9999px; padding:0.15rem 0.6rem; letter-spacing:0.02em;">🎁 Cortesia</span>` : ''}
            </h3>
            <p style="color:var(--ad-text); opacity:0.6; margin:0; font-size:0.9rem;">
              ${isCortesia
                ? 'Conta cortesia · sem cobrança'
                : (customCents
                    ? `R$ ${(customCents / 100).toFixed(2)}/mês <span style="font-size:0.7rem; font-weight:700; background:color-mix(in srgb, var(--ad-accent) 14%, transparent); color:var(--ad-accent); border:1px solid color-mix(in srgb, var(--ad-accent) 35%, transparent); border-radius:9999px; padding:0.1rem 0.5rem; letter-spacing:0.02em;">preço especial</span>`
                    : (planDetails.price === 0 ? 'Gratuito' : `R$ ${(planDetails.price / 100).toFixed(2)}/mês`))}
              ${!isCortesia && subscription.currentPeriodEnd ? ` · Renova em ${new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}` : ''}
              ${!isCortesia && subscription.cancelAtPeriodEnd ? ` <span style="color:var(--ad-red); font-weight:600;">· Cancelamento agendado</span>` : ''}
            </p>
          </div>
          ${planoKey !== 'pro' || isCortesia ? `<button id="verPlansBtn" style="background:transparent; border:1px solid var(--ad-accent); color:var(--ad-accent); padding:0.5rem 1rem; border-radius:0.375rem; cursor:pointer; font-size:0.875rem; font-weight:600;">Ver planos ↓</button>` : ''}
        </div>

        <div style="display:grid; gap:1rem;">
          ${_bar('Sessões', uso.sessions, limites.maxSessions)}
          ${_bar('Fotos', uso.photos, limites.maxPhotos)}
          ${_bar('Armazenamento — fotos (MB)', fotosMB, effMaxStorage)}
        </div>
        ${addonGB > 0 ? `
        <p style="font-size:0.75rem; color:var(--ad-text); opacity:0.6; margin:0.5rem 0 0;">
          Inclui <strong>+${addonGB} GB</strong> de armazenamento adicional${addonPriceCents > 0 ? ` (R$ ${(addonPriceCents / 100).toFixed(2)}/mês)` : ''}.
        </p>` : ''}

        ${usage?.breakdown ? `
        <div style="display:flex; flex-wrap:wrap; align-items:center; gap:1rem; margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid color-mix(in srgb, var(--ad-text) 10%, transparent);">
          <span style="color:var(--ad-text); opacity:0.55; font-size:0.75rem;">Fotos das sessões: ${usage.breakdown.sessionsMB} MB</span>
          <span style="color:var(--ad-text); opacity:0.55; font-size:0.75rem;">Site/logo: ${usage.breakdown.siteMB} MB</span>
          <span style="color:var(--ad-text); opacity:0.55; font-size:0.75rem;">Vídeos: ${usage.breakdown.videosMB} MB</span>
          <span style="color:var(--ad-text); opacity:0.4; font-size:0.7rem; font-style:italic;">(site/logo e vídeos não contam no limite)</span>
        </div>` : ''}
      </div>

      ${vitrineHtml}

      ${isCortesia ? `
      <!-- Conta cortesia: enxerga TUDO; upgrade/compra encerra a cortesia -->
      <div style="padding:1rem 1.25rem; background:color-mix(in srgb, var(--ad-green) 8%, transparent); border:1px solid color-mix(in srgb, var(--ad-green) 30%, transparent); border-radius:0.5rem;">
        <p style="font-weight:600; color:var(--ad-text); margin:0 0 0.25rem;">🎁 Conta cortesia · plano ${planDetails.name}</p>
        <p style="font-size:0.85rem; color:var(--ad-text); opacity:0.75; margin:0;">Você tem acesso liberado sem cobrança. Veja abaixo o que cada plano oferece — ao fazer <strong>upgrade</strong> ou comprar um <strong>adicional</strong>, a cortesia é encerrada e a cobrança começa. Fale com o suporte quando quiser trocar.</p>
      </div>
      ` : ''}

      <!-- Planos disponíveis (todos enxergam, inclusive cortesia) -->
      <div>
        <h3 id="planosSection" style="font-size:1.125rem; font-weight:700; color:var(--ad-text); margin:0 0 1rem;">Planos Disponíveis</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:1.25rem;">
          ${Object.entries(plans).map(([key, plan]) => _planCard(key, plan)).join('')}
        </div>
      </div>

      ${!isCortesia && planoKey !== 'free' ? `
      <!-- Cancelamento -->
      <div style="padding:1rem 1.25rem; background:color-mix(in srgb, var(--ad-red) 8%, transparent); border:1px solid color-mix(in srgb, var(--ad-red) 30%, transparent); border-radius:0.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
        <div>
          <p style="font-weight:600; color:var(--ad-text); margin:0 0 0.25rem;">Cancelar assinatura</p>
          <p style="font-size:0.8rem; color:var(--ad-text); opacity:0.6; margin:0;">Seu plano permanece ativo até o final do período pago.</p>
        </div>
        <button id="cancelBtn" style="background:transparent; border:1px solid var(--ad-red); color:var(--ad-red); padding:0.5rem 1rem; border-radius:0.375rem; cursor:pointer; font-size:0.875rem; font-weight:600;">Cancelar Plano</button>
      </div>` : ''}

      ${refund?.canRefund ? `
      <!-- Arrependimento (CDC Art. 49 — 7 dias): reembolso integral + volta pro Free -->
      <div style="padding:1rem 1.25rem; background:color-mix(in srgb, var(--ad-red) 8%, transparent); border:1px solid color-mix(in srgb, var(--ad-red) 30%, transparent); border-radius:0.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
        <div>
          <p style="font-weight:600; color:var(--ad-text); margin:0 0 0.25rem;">Cancelar e pedir reembolso</p>
          <p style="font-size:0.8rem; color:var(--ad-text); opacity:0.6; margin:0;">Você está no prazo de arrependimento${refund.refundWindowEndsAt ? ` (até ${new Date(refund.refundWindowEndsAt).toLocaleDateString('pt-BR')})` : ''}. Reembolso integral no cartão e sua conta volta ao plano gratuito.</p>
        </div>
        <button id="refundBtn" style="background:var(--ad-red); border:1px solid var(--ad-red); color:#fff; padding:0.5rem 1rem; border-radius:0.375rem; cursor:pointer; font-size:0.875rem; font-weight:600;">Cancelar e reembolsar</button>
      </div>` : ''}
    </div>
  `;

  // Scroll para planos
  const verBtn = container.querySelector('#verPlansBtn');
  if (verBtn) {
    verBtn.onclick = () => container.querySelector('#planosSection').scrollIntoView({ behavior: 'smooth' });
  }
  const verBtn2 = container.querySelector('#verPlansBtn2');
  if (verBtn2) {
    verBtn2.onclick = () => container.querySelector('#planosSection')?.scrollIntoView({ behavior: 'smooth' });
  }

  // "Pagar agora" (cobrança pendente): assina o PLANO ATUAL. Como não há assinatura viva
  // (status pending, sem mpPreapprovalId), é o caminho de assinatura nova → CardForm in-page;
  // sem Public Key, cai no checkout hospedado legado. Espelha o ramo "ASSINATURA NOVA" abaixo.
  const payNowBtn = container.querySelector('#payNowBtn');
  if (payNowBtn) {
    payNowBtn.onclick = async () => {
      const planObj = plans[planoKey] || {};
      const cents = customCents || planObj.price || 0;
      if (mpPublicKey) {
        await openCardCheckout({
          plan: planoKey,
          planName: planObj.name || planDetails.name || 'plano',
          amountReais: cents / 100,
          publicKey: mpPublicKey,
          ownerEmail,
          onDone: () => renderPlano(container),
        });
        return;
      }
      payNowBtn.textContent = 'Aguarde...';
      payNowBtn.disabled = true;
      try {
        const { checkoutUrl } = await apiPost('/api/billing/checkout', { plan: planoKey });
        if (checkoutUrl) window.location.href = checkoutUrl;
        else { window.showToast('Não foi possível iniciar o checkout.', 'error'); payNowBtn.textContent = 'Pagar agora'; payNowBtn.disabled = false; }
      } catch (error) {
        window.showToast('Erro: ' + error.message, 'error');
        payNowBtn.textContent = 'Pagar agora';
        payNowBtn.disabled = false;
      }
    };
  }

  // Cortesia querendo trocar de plano: explica a fronteira (encerra a cortesia)
  // e roteia pelo suporte — não dispara checkout (evita "paga e segue cortesia").
  container.querySelectorAll('.cortesiaUpgradeBtn').forEach(btn => {
    btn.onclick = async () => {
      const nome = btn.dataset.planname || 'este plano';
      // showConfirm (toast.js) usa o 1º arg como MENSAGEM e `title` como cabeçalho —
      // a explicação vai no 1º arg (não em `{ message }`, que seria ignorado).
      await window.showConfirm(
        `Sua conta é uma cortesia da plataforma. Trocar para o ${nome} encerra a cortesia e inicia a cobrança do plano. Fale com o suporte para confirmar a troca — assim ajustamos tudo certinho pra você.`,
        { title: `Mudar para o ${nome}?`, confirmText: 'Entendi', cancelText: 'Voltar' }
      );
    };
  });

  // Selecionar plano. Com a Public Key do MP disponível → CardForm in-page (cartão direto,
  // sem conta MP). Sem ela → fluxo hospedado legado (redirect ao init_point).
  container.querySelectorAll('.selectPlanBtn').forEach(btn => {
    btn.onclick = async () => {
      const plan = btn.dataset.plan;
      const planObj = plans[plan] || {};
      const nomePlano = planObj.name || 'plano';

      // ── TROCA de plano de quem JÁ é assinante ativo → caminho update() (SEM pró-rata) ──
      // NÃO abre o CardForm: o cartão já está atrelado à assinatura viva. Só confirma e faz
      // POST sem token; o backend (createCheckoutSession) ajusta o valor da recorrência e
      // retorna { mode:'updated' }. O novo valor passa a valer no PRÓXIMO ciclo — nada é
      // cobrado agora. Espelha o gate do backend (status active + mpPreapprovalId vivo).
      const jaAssinante = subscription.status === 'active' && !!subscription.mpPreapprovalId;
      if (jaAssinante) {
        // Valor efetivo = base (preço custom OU do plano) + adicional de storage recorrente,
        // espelhando effectiveMonthlyCents do backend — senão a copy subnotifica quem tem add-on.
        const centsNovo = (customCents || planObj.price || 0) + addonPriceCents;
        // showConfirm (toast.js) usa o 1º arg como MENSAGEM e `title` como cabeçalho —
        // por isso a explicação vai no 1º arg (não em `{ message }`, que seria ignorado).
        const ok = await window.showConfirm(
          `Seu plano muda para o ${nomePlano} agora. O novo valor de R$ ${(centsNovo / 100).toFixed(2)}/mês passa a valer na sua próxima cobrança — nada é cobrado neste momento.`,
          { title: `Mudar para o ${nomePlano}?`, confirmText: 'Confirmar troca', cancelText: 'Voltar' }
        );
        if (!ok) return;
        btn.textContent = 'Alterando...';
        btn.disabled = true;
        try {
          const result = await apiPost('/api/billing/checkout', { plan });
          if (result && result.mode === 'updated') {
            window.showToast('Plano alterado — o novo valor passa a valer na próxima cobrança.', 'success');
            renderPlano(container);
          } else {
            // Backend não entrou no caminho de troca (estado inesperado) → recarrega pra
            // refletir o real, sem forçar nada na tela.
            window.showToast('Não foi possível alterar o plano agora. Tente novamente.', 'error');
            btn.textContent = 'Selecionar'; btn.disabled = false;
          }
        } catch (error) {
          window.showToast('Erro: ' + error.message, 'error');
          btn.textContent = 'Selecionar'; btn.disabled = false;
        }
        return;
      }

      // ── ASSINATURA NOVA (free→pago ou re-assinatura): CardForm in-page (cartão direto) ──
      if (mpPublicKey) {
        // Preço a exibir: custom da org (se houver) tem prioridade; o backend recalcula o
        // valor real cobrado de qualquer forma — aqui é só o rótulo do modal.
        const cents = customCents || planObj.price || 0;
        await openCardCheckout({
          plan,
          planName: nomePlano,
          amountReais: cents / 100,
          publicKey: mpPublicKey,
          ownerEmail,
          onDone: () => renderPlano(container),
        });
        return;
      }

      // Fallback legado (sem CardForm): redirect ao checkout hospedado.
      btn.textContent = 'Aguarde...';
      btn.disabled = true;
      try {
        const { checkoutUrl } = await apiPost('/api/billing/checkout', { plan });
        if (checkoutUrl) window.location.href = checkoutUrl;
        else { window.showToast('Não foi possível iniciar o checkout.', 'error'); btn.textContent = 'Selecionar'; btn.disabled = false; }
      } catch (error) {
        window.showToast('Erro: ' + error.message, 'error');
        btn.textContent = 'Selecionar';
        btn.disabled = false;
      }
    };
  });

  // Cancelar plano
  const cancelBtn = container.querySelector('#cancelBtn');
  if (cancelBtn) {
    cancelBtn.onclick = async () => {
      // showConfirm (toast.js) usa o 1º arg como MENSAGEM e `title` como cabeçalho.
      const ok = await window.showConfirm(
        'Seu plano permanece ativo até o final do período atual. Após isso você voltará para o plano gratuito.',
        { title: 'Cancelar assinatura?', confirmText: 'Cancelar Plano', cancelText: 'Manter Plano' }
      );
      if (!ok) return;
      cancelBtn.textContent = 'Cancelando...';
      cancelBtn.disabled = true;
      try {
        await apiPost('/api/billing/cancel', {});
        window.showToast('Cancelamento agendado com sucesso.', 'success');
        renderPlano(container);
      } catch (error) {
        window.showToast('Erro: ' + error.message, 'error');
        cancelBtn.textContent = 'Cancelar Plano';
        cancelBtn.disabled = false;
      }
    };
  }

  // Arrependimento (CDC 7 dias): cancela E reembolsa integral, conta volta pro Free na hora.
  const refundBtn = container.querySelector('#refundBtn');
  if (refundBtn) {
    refundBtn.onclick = async () => {
      const ok = await window.showConfirm(
        'Você receberá o reembolso integral no seu cartão (pelo Mercado Pago) e sua conta voltará ao plano gratuito imediatamente. Os envios de novas fotos e a venda automática ficam congelados até você assinar de novo. Deseja continuar?',
        { title: 'Cancelar e reembolsar?', confirmText: 'Sim, reembolsar', cancelText: 'Voltar' }
      );
      if (!ok) return;
      refundBtn.textContent = 'Processando...';
      refundBtn.disabled = true;
      try {
        const r = await apiPost('/api/billing/refund', {});
        window.showToast(r?.message || 'Reembolso solicitado.', 'success');
        renderPlano(container);
      } catch (error) {
        window.showToast('Erro: ' + error.message, 'error');
        refundBtn.textContent = 'Cancelar e reembolsar';
        refundBtn.disabled = false;
      }
    };
  }
}
