import { apiGet, apiPost } from '../utils/api.js';

export async function renderPlano(container) {
  container.innerHTML = `<div style="color:var(--ad-text); padding:2rem;">Carregando...</div>`;

  try {
    const [subRes, plansRes] = await Promise.all([
      apiGet('/api/billing/subscription'),
      apiGet('/api/billing/plans')
    ]);

    const { subscription, planDetails, usage, stripeConfigured, maxStorageMB, storageAddon, limits } = subRes;
    const { plans } = plansRes;

    _render(container, { subscription, planDetails, usage, plans, stripeAtivo: !!stripeConfigured, maxStorageMB, storageAddon, effLimits: limits });
  } catch (error) {
    container.innerHTML = `<div style="color:var(--ad-red); padding:2rem;">Erro ao carregar: ${error.message}</div>`;
  }
}

function _render(container, { subscription, planDetails, usage, plans, stripeAtivo, maxStorageMB, storageAddon, effLimits }) {
  // Limites efetivos vêm do backend (derivam de plans.js); fallback ao gravado.
  const limites = effLimits || subscription.limits;
  const uso     = subscription.usage;
  const planoKey = subscription.plan;
  const isCortesia = !!subscription.isCourtesy;
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
      btnHtml = `<button disabled style="width:100%; padding:0.625rem; border-radius:0.375rem; border:1px solid color-mix(in srgb, var(--ad-text) 20%, transparent); background:transparent; color:var(--ad-text); opacity:0.5; cursor:not-allowed; font-size:0.9rem;">Plano Atual</button>`;
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
  // desbloqueia — alimenta a evolução de plano sem esconder nada. Só aparece
  // para contas pagas (cortesia não tem upgrade) e quando há algo travado.
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
          ${!isCortesia && planoKey !== 'pro' ? `<button id="verPlansBtn" style="background:transparent; border:1px solid var(--ad-accent); color:var(--ad-accent); padding:0.5rem 1rem; border-radius:0.375rem; cursor:pointer; font-size:0.875rem; font-weight:600;">Ver planos ↓</button>` : ''}
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

      ${!isCortesia ? vitrineHtml : ''}

      ${isCortesia ? `
      <!-- Conta cortesia: sem upgrade -->
      <div style="padding:1rem 1.25rem; background:color-mix(in srgb, var(--ad-green) 8%, transparent); border:1px solid color-mix(in srgb, var(--ad-green) 30%, transparent); border-radius:0.5rem;">
        <p style="font-weight:600; color:var(--ad-text); margin:0 0 0.25rem;">🎁 Conta cortesia</p>
        <p style="font-size:0.85rem; color:var(--ad-text); opacity:0.7; margin:0;">Sua conta é uma cortesia da plataforma — você tem acesso liberado sem cobrança. Qualquer dúvida sobre limites, fale com o suporte.</p>
      </div>
      ` : `
      <!-- Planos disponíveis -->
      <div>
        <h3 id="planosSection" style="font-size:1.125rem; font-weight:700; color:var(--ad-text); margin:0 0 1rem;">Planos Disponíveis</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:1.25rem;">
          ${Object.entries(plans).map(([key, plan]) => _planCard(key, plan)).join('')}
        </div>
      </div>
      `}

      ${!isCortesia && planoKey !== 'free' ? `
      <!-- Cancelamento -->
      <div style="padding:1rem 1.25rem; background:color-mix(in srgb, var(--ad-red) 8%, transparent); border:1px solid color-mix(in srgb, var(--ad-red) 30%, transparent); border-radius:0.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
        <div>
          <p style="font-weight:600; color:var(--ad-text); margin:0 0 0.25rem;">Cancelar assinatura</p>
          <p style="font-size:0.8rem; color:var(--ad-text); opacity:0.6; margin:0;">Seu plano permanece ativo até o final do período pago.</p>
        </div>
        <button id="cancelBtn" style="background:transparent; border:1px solid var(--ad-red); color:var(--ad-red); padding:0.5rem 1rem; border-radius:0.375rem; cursor:pointer; font-size:0.875rem; font-weight:600;">Cancelar Plano</button>
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

  // Selecionar plano (só quando Stripe ativo)
  container.querySelectorAll('.selectPlanBtn').forEach(btn => {
    btn.onclick = async () => {
      const plan = btn.dataset.plan;
      btn.textContent = 'Aguarde...';
      btn.disabled = true;
      try {
        const { checkoutUrl } = await apiPost('/api/billing/checkout', { plan });
        window.location.href = checkoutUrl;
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
      const ok = await window.showConfirm('Cancelar assinatura?', {
        message: 'Seu plano permanece ativo até o final do período atual. Após isso você voltará para o plano gratuito.',
        confirmText: 'Cancelar Plano',
        cancelText: 'Manter Plano'
      });
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
}
