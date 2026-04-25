import { apiGet, apiPost } from '../utils/api.js';

export async function renderPlano(container) {
  const { subscription, planDetails, usage } = await apiGet('/api/billing/subscription');
  const { plans } = await apiGet('/api/billing/plans');

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:2rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:var(--text-primary);">Seu Plano</h2>

      <!-- Plano Atual -->
      <div style="background:var(--bg-surface); padding:2rem; border-radius:0.5rem; border:2px solid var(--accent);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:bold; color:var(--text-primary);">${planDetails.name}</h3>
            <p style="color:var(--text-secondary); margin-top:0.5rem;">
              ${subscription.plan === 'free' ? 'Gratuito' : `R$ ${(planDetails.price / 100).toFixed(2)}/mês`}
            </p>
          </div>
          ${subscription.plan !== 'pro' ? `
            <button id="upgradeBtn" class="btn btn-primary">
              Fazer Upgrade
            </button>
          ` : ''}
        </div>

        <!-- Uso atual -->
        <div style="margin-top:2rem; display:grid; gap:1rem;">
          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
              <span style="color:var(--text-secondary);">Sessões</span>
              <span style="color:var(--text-primary);">${subscription.usage.sessions} / ${subscription.limits.maxSessions === -1 ? '∞' : subscription.limits.maxSessions}</span>
            </div>
            <div style="background:var(--bg-hover); height:0.5rem; border-radius:9999px; overflow:hidden;">
              <div style="background:var(--accent); height:100%; width:${subscription.limits.maxSessions === -1 ? 0 : (subscription.usage.sessions / subscription.limits.maxSessions * 100)}%;"></div>
            </div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
              <span style="color:var(--text-secondary);">Fotos</span>
              <span style="color:var(--text-primary);">${subscription.usage.photos} / ${subscription.limits.maxPhotos === -1 ? '∞' : subscription.limits.maxPhotos}</span>
            </div>
            <div style="background:var(--bg-hover); height:0.5rem; border-radius:9999px; overflow:hidden;">
              <div style="background:var(--accent); height:100%; width:${subscription.limits.maxPhotos === -1 ? 0 : (subscription.usage.photos / subscription.limits.maxPhotos * 100)}%;"></div>
            </div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
              <span style="color:var(--text-secondary);">Armazenamento</span>
              <span style="color:var(--text-primary);">${usage?.storageMB || 0} MB / ${subscription.limits.maxStorage} MB</span>
            </div>
            <div style="background:var(--bg-hover); height:0.5rem; border-radius:9999px; overflow:hidden;">
              <div style="background:var(--accent); height:100%; width:${Math.min(100, (usage?.storageMB || 0) / subscription.limits.maxStorage * 100)}%;"></div>
            </div>
            ${usage?.breakdown ? `
            <div style="display:flex; flex-wrap:wrap; gap:1rem; margin-top:0.5rem; font-size:0.75rem; color:var(--text-muted);">
              <span>📁 Sessões: ${usage.breakdown.sessionsMB} MB</span>
              <span>🌐 Site: ${usage.breakdown.siteMB} MB</span>
              <span>🎬 Vídeos: ${usage.breakdown.videosMB} MB</span>
            </div>` : ''}
          </div>
        </div>
      </div>

      <!-- Planos Disponíveis -->
      <h3 style="font-size:1.25rem; font-weight:bold; color:var(--text-primary);">Planos Disponíveis</h3>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1.5rem;">
        ${Object.entries(plans).map(([key, plan]) => `
          <div style="background:var(--bg-surface); padding:2rem; border-radius:0.5rem; border:1px solid ${subscription.plan === key ? 'var(--accent)' : 'var(--border)'};">
            <h4 style="font-size:1.125rem; font-weight:bold; color:var(--text-primary);">${plan.name}</h4>
            <p style="font-size:2rem; font-weight:bold; color:var(--text-primary); margin:1rem 0;">
              ${plan.price === 0 ? 'Grátis' : `R$ ${(plan.price / 100).toFixed(2)}`}
            </p>
            <ul style="list-style:none; padding:0; margin:1.5rem 0; display:flex; flex-direction:column; gap:0.75rem;">
              ${plan.features.map(f => `<li style="color:var(--text-secondary);">✓ ${f}</li>`).join('')}
            </ul>
            ${subscription.plan === key ? `
              <button disabled class="btn" style="width:100%;">
                Plano Atual
              </button>
            ` : plan.price > 0 ? `
              <button class="btn btn-primary selectPlanBtn" data-plan="${key}" style="width:100%;">
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
        window.showToast?.('Erro: ' + error.message, 'error');
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