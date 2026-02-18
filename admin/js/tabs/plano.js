import { apiGet, apiPost } from '../utils/api.js';

export async function renderPlano(container) {
  const { subscription, planDetails } = await apiGet('/api/billing/subscription');
  const { plans } = await apiGet('/api/billing/plans');

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:2rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Seu Plano</h2>

      <!-- Plano Atual -->
      <div style="background:#1f2937; padding:2rem; border-radius:0.5rem; border:2px solid #2563eb;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:bold; color:#f3f4f6;">${planDetails.name}</h3>
            <p style="color:#9ca3af; margin-top:0.5rem;">
              ${subscription.plan === 'free' ? 'Gratuito' : `R$ ${(planDetails.price / 100).toFixed(2)}/mês`}
            </p>
          </div>
          ${subscription.plan !== 'pro' ? `
            <button id="upgradeBtn" style="background:#2563eb; color:white; padding:0.75rem 1.5rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:600;">
              Fazer Upgrade
            </button>
          ` : ''}
        </div>

        <!-- Uso atual -->
        <div style="margin-top:2rem; display:grid; gap:1rem;">
          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
              <span style="color:#d1d5db;">Sessões</span>
              <span style="color:#f3f4f6;">${subscription.usage.sessions} / ${subscription.limits.maxSessions === -1 ? '∞' : subscription.limits.maxSessions}</span>
            </div>
            <div style="background:#374151; height:0.5rem; border-radius:9999px; overflow:hidden;">
              <div style="background:#2563eb; height:100%; width:${subscription.limits.maxSessions === -1 ? 0 : (subscription.usage.sessions / subscription.limits.maxSessions * 100)}%;"></div>
            </div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
              <span style="color:#d1d5db;">Fotos</span>
              <span style="color:#f3f4f6;">${subscription.usage.photos} / ${subscription.limits.maxPhotos === -1 ? '∞' : subscription.limits.maxPhotos}</span>
            </div>
            <div style="background:#374151; height:0.5rem; border-radius:9999px; overflow:hidden;">
              <div style="background:#2563eb; height:100%; width:${subscription.limits.maxPhotos === -1 ? 0 : (subscription.usage.photos / subscription.limits.maxPhotos * 100)}%;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Planos Disponíveis -->
      <h3 style="font-size:1.25rem; font-weight:bold; color:#f3f4f6;">Planos Disponíveis</h3>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1.5rem;">
        ${Object.entries(plans).map(([key, plan]) => `
          <div style="background:#1f2937; padding:2rem; border-radius:0.5rem; border:1px solid ${subscription.plan === key ? '#2563eb' : '#374151'};">
            <h4 style="font-size:1.125rem; font-weight:bold; color:#f3f4f6;">${plan.name}</h4>
            <p style="font-size:2rem; font-weight:bold; color:#f3f4f6; margin:1rem 0;">
              ${plan.price === 0 ? 'Grátis' : `R$ ${(plan.price / 100).toFixed(2)}`}
            </p>
            <ul style="list-style:none; padding:0; margin:1.5rem 0; display:flex; flex-direction:column; gap:0.75rem;">
              ${plan.features.map(f => `<li style="color:#9ca3af;">✓ ${f}</li>`).join('')}
            </ul>
            ${subscription.plan === key ? `
              <button disabled style="background:#374151; color:#9ca3af; padding:0.75rem; border-radius:0.375rem; border:none; width:100%; cursor:not-allowed;">
                Plano Atual
              </button>
            ` : plan.price > 0 ? `
              <button class="selectPlanBtn" data-plan="${key}" style="background:#2563eb; color:white; padding:0.75rem; border-radius:0.375rem; border:none; width:100%; cursor:pointer; font-weight:600;">
                Selecionar
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Event listeners
  container.querySelectorAll('.selectPlanBtn').forEach(btn => {
    btn.onclick = async () => {
      const plan = btn.dataset.plan;
      try {
        const { checkoutUrl } = await apiPost('/api/billing/checkout', { plan });
        window.location.href = checkoutUrl;
      } catch (error) {
        alert('Erro: ' + error.message);
      }
    };
  });
  
  const upgradeBtn = container.querySelector('#upgradeBtn');
  if (upgradeBtn) {
    upgradeBtn.onclick = () => {
        container.querySelector('h3:nth-of-type(2)').scrollIntoView({ behavior: 'smooth' });
    };
  }
}