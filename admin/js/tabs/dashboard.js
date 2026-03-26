/**
 * Tab: Dashboard — visão geral da conta
 */

import { appState } from '../state.js';
import { apiGet } from '../utils/api.js';

export async function renderDashboard(container) {
  // Skeleton enquanto carrega
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1.5rem;">
      <div>
        <h2 style="font-size:1.25rem;font-weight:600;color:var(--text-primary,#e6edf3);">Dashboard</h2>
        <p style="color:var(--text-secondary,#8b949e);font-size:0.875rem;margin-top:0.25rem;">Visão geral da sua conta</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem;">
        ${[1,2,3,4].map(() => `<div class="skeleton" style="height:96px;border-radius:8px;"></div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="skeleton" style="height:220px;border-radius:8px;"></div>
        <div class="skeleton" style="height:220px;border-radius:8px;"></div>
      </div>
    </div>
  `;

  // Carregar dados em paralelo
  let sessions = [], clients = [], org = {};
  try {
    const [sessRes, cliRes, orgRes] = await Promise.allSettled([
      apiGet('/api/sessions'),
      apiGet('/api/clients'),
      apiGet('/api/organization/profile'),
    ]);

    if (sessRes.status === 'fulfilled') sessions = sessRes.value?.sessions || [];
    if (cliRes.status === 'fulfilled') clients = cliRes.value?.clients || [];
    if (orgRes.status === 'fulfilled') org = orgRes.value || {};
  } catch (e) { /* silencioso */ }

  // Calcular stats
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.isActive).length;
  const pendingSelections = sessions.filter(s => s.selectionStatus === 'submitted').length;
  const deliveredSessions = sessions.filter(s => s.selectionStatus === 'delivered').length;
  const totalClients = clients.length;

  // Atividade recente (últimas 5 sessões)
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const statusColor = {
    pending: { color: '#8b949e', label: 'Aguardando' },
    in_progress: { color: '#2f81f7', label: 'Em andamento' },
    submitted: { color: '#d29922', label: 'Seleção enviada' },
    delivered: { color: '#3fb950', label: 'Entregue' },
    expired: { color: '#f85149', label: 'Expirado' },
  };

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Bom dia' : greetingHour < 18 ? 'Boa tarde' : 'Boa noite';
  const orgName = org.name || 'fotógrafo';

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1.75rem;">

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;">
        <div>
          <h2 style="font-size:1.25rem;font-weight:600;color:var(--text-primary,#e6edf3);">${greeting}, ${orgName.split(' ')[0]}! 👋</h2>
          <p style="color:var(--text-secondary,#8b949e);font-size:0.875rem;margin-top:0.25rem;">Aqui está um resumo da sua conta</p>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button onclick="switchTab('sessoes')" style="display:flex;align-items:center;gap:0.375rem;padding:0.4375rem 0.875rem;background:#2f81f7;color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.8125rem;font-weight:500;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nova sessão
          </button>
          <button onclick="switchTab('meu-site')" style="display:flex;align-items:center;gap:0.375rem;padding:0.4375rem 0.875rem;background:var(--bg-elevated,#1c2128);color:var(--text-secondary,#8b949e);border:1px solid var(--border,#30363d);border-radius:6px;cursor:pointer;font-size:0.8125rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
            Editar site
          </button>
        </div>
      </div>

      <!-- Stats cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:0.875rem;">
        ${statCard('Sessões ativas', activeSessions, '#2f81f7', `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`, 'sessoes')}
        ${statCard('Seleções pendentes', pendingSelections, '#d29922', `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`, 'sessoes')}
        ${statCard('Entregues', deliveredSessions, '#3fb950', `<polyline points="20 6 9 17 4 12"/>`, 'sessoes')}
        ${statCard('Clientes', totalClients, '#bc8cff', `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`, 'clientes')}
      </div>

      <!-- Content grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">

        <!-- Atividade recente -->
        <div style="background:var(--bg-surface,#161b22);border:1px solid var(--border,#30363d);border-radius:8px;overflow:hidden;">
          <div style="padding:0.875rem 1rem;border-bottom:1px solid var(--border,#30363d);display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:0.875rem;font-weight:600;color:var(--text-primary,#e6edf3);">Sessões recentes</span>
            <button onclick="switchTab('sessoes')" style="font-size:0.75rem;color:#2f81f7;background:none;border:none;cursor:pointer;">Ver todas →</button>
          </div>
          <div style="padding:0.5rem 0;">
            ${recentSessions.length === 0 ? `
              <div style="padding:1.5rem;text-align:center;">
                <p style="color:var(--text-muted,#484f58);font-size:0.8125rem;">Nenhuma sessão criada ainda</p>
                <button onclick="switchTab('sessoes')" style="margin-top:0.75rem;padding:0.375rem 0.75rem;background:#2f81f7;color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.8125rem;">Criar primeira sessão</button>
              </div>
            ` : recentSessions.map(s => {
              const st = statusColor[s.selectionStatus] || statusColor.pending;
              const date = s.date ? new Date(s.date).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }) : '—';
              return `
                <div onclick="switchTab('sessoes')" style="display:flex;align-items:center;gap:0.75rem;padding:0.5625rem 1rem;cursor:pointer;transition:background 0.12s;" onmouseenter="this.style.background='var(--bg-hover,#21262d)'" onmouseleave="this.style.background='transparent'">
                  <div style="width:32px;height:32px;border-radius:50%;background:var(--bg-elevated,#1c2128);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.875rem;">
                    ${s.type === 'Casamento' ? '💍' : s.type === 'Família' ? '👨‍👩‍👧' : s.type === 'Evento' ? '🎉' : '📷'}
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:0.8125rem;font-weight:500;color:var(--text-primary,#e6edf3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.name}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted,#484f58);">${date} · ${s.photos?.length || 0} fotos</div>
                  </div>
                  <span style="font-size:0.6875rem;color:${st.color};white-space:nowrap;">${st.label}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Ações rápidas -->
        <div style="display:flex;flex-direction:column;gap:0.875rem;">

          <!-- Status do site -->
          <div style="background:var(--bg-surface,#161b22);border:1px solid var(--border,#30363d);border-radius:8px;padding:1rem;">
            <div style="font-size:0.875rem;font-weight:600;color:var(--text-primary,#e6edf3);margin-bottom:0.875rem;">Status do site</div>
            <div style="display:flex;flex-direction:column;gap:0.625rem;">
              ${siteStatusRow('Site público', org.siteEnabled, 'meu-site')}
              ${siteStatusRow('Perfil completo', !!(org.name && org.email), 'perfil')}
              ${siteStatusRow('Watermark configurado', !!(org.watermarkText || org.logo), 'perfil')}
            </div>
          </div>

          <!-- Ações rápidas -->
          <div style="background:var(--bg-surface,#161b22);border:1px solid var(--border,#30363d);border-radius:8px;padding:1rem;">
            <div style="font-size:0.875rem;font-weight:600;color:var(--text-primary,#e6edf3);margin-bottom:0.875rem;">Ações rápidas</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;">
              ${quickAction('Sessões', 'sessoes', '#2f81f7')}
              ${quickAction('Clientes', 'clientes', '#bc8cff')}
              ${quickAction('Meu Site', 'meu-site', '#3fb950')}
              ${quickAction('Integrações', 'integracoes', '#ffa657')}
            </div>
          </div>

        </div>
      </div>

    </div>
  `;
}

function statCard(label, value, color, iconPath, tab) {
  return `
    <div onclick="switchTab('${tab}')" style="background:var(--bg-surface,#161b22);border:1px solid var(--border,#30363d);border-radius:8px;padding:1rem;cursor:pointer;transition:border-color 0.15s,background 0.15s;" onmouseenter="this.style.borderColor='${color}40';this.style.background='var(--bg-elevated,#1c2128)'" onmouseleave="this.style.borderColor='var(--border,#30363d)';this.style.background='var(--bg-surface,#161b22)'">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;">
        <div style="width:32px;height:32px;background:${color}20;border-radius:6px;display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>
        </div>
      </div>
      <div style="font-size:1.625rem;font-weight:700;color:var(--text-primary,#e6edf3);line-height:1;">${value}</div>
      <div style="font-size:0.75rem;color:var(--text-secondary,#8b949e);margin-top:0.25rem;">${label}</div>
    </div>
  `;
}

function siteStatusRow(label, ok, tab) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:0.8125rem;color:var(--text-secondary,#8b949e);">${label}</span>
      <button onclick="switchTab('${tab}')" style="display:flex;align-items:center;gap:0.375rem;background:none;border:none;cursor:pointer;font-size:0.75rem;color:${ok ? '#3fb950' : '#8b949e'};">
        <span>${ok ? '✓ Ativo' : '○ Configurar'}</span>
      </button>
    </div>
  `;
}

function quickAction(label, tab, color) {
  return `
    <button onclick="switchTab('${tab}')" style="padding:0.5rem;background:${color}12;border:1px solid ${color}30;border-radius:6px;cursor:pointer;font-size:0.8125rem;color:${color};font-weight:500;transition:background 0.12s;" onmouseenter="this.style.background='${color}25'" onmouseleave="this.style.background='${color}12'">
      ${label}
    </button>
  `;
}
