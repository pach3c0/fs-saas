/**
 * Tab: Dashboard
 * Fornece uma visão geral do negócio e atalhos rápidos.
 */

import { appState } from '../state.js';
import { apiGet } from '../utils/api.js';
import { formatDate } from '../utils/helpers.js';

export async function renderDashboard(container) {
    // 1. Estrutura Base com Spinner de Carregamento
    container.innerHTML = `
        <div id="dashboard-content" style="display:flex; flex-direction:column; gap:2rem; animation: fadeInUp 0.3s ease;">
            <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                <div>
                    <h2 style="font-size:1.5rem; font-weight:700; color:var(--text-primary); margin:0;">Olá, ${appState.user?.name || 'Fotógrafo'}!</h2>
                    <p style="color:var(--text-secondary); margin-top:0.25rem;">Aqui está o resumo do seu estúdio hoje.</p>
                </div>
                <div id="last-update" style="font-size:0.75rem; color:var(--text-muted);"></div>
            </div>

            <div id="onboarding-container"></div>

            <div id="metrics-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
                ${renderMetricSkeleton()}
            </div>

            <div style="display:grid; grid-template-columns: 1fr 300px; gap:1.5rem; align-items: start;">
                <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; overflow:hidden;">
                    <div style="padding:1.25rem; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary);">Sessões Recentes</h3>
                        <button onclick="switchTab('sessoes')" class="btn btn-ghost btn-sm" style="color:var(--accent);">Ver todas</button>
                    </div>
                    <div id="recent-sessions-list" style="min-height:200px;">
                        <p style="padding:2rem; text-align:center; color:var(--text-muted);">Carregando sessões...</p>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:1rem;">
                    <h3 style="font-size:0.875rem; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">Ações Rápidas</h3>

                    <button onclick="switchTab('sessoes').then(() => { const m = document.getElementById('newSessionModal'); if(m) m.style.display='flex'; })" style="display:flex; align-items:center; gap:0.75rem; width:100%; padding:1rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:10px; color:var(--text-primary); cursor:pointer; transition:all 0.2s;" onmouseenter="this.style.borderColor='var(--accent)'; this.style.background='var(--bg-hover)'" onmouseleave="this.style.borderColor='var(--border)'; this.style.background='var(--bg-surface)'">
                        <div style="width:32px; height:32px; border-radius:8px; background:rgba(47,129,247,0.15); color:var(--accent); display:flex; align-items:center; justify-content:center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                        </div>
                        <span style="font-weight:500;">Nova Sessão</span>
                    </button>

                    <button onclick="openMySite()" style="display:flex; align-items:center; gap:0.75rem; width:100%; padding:1rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:10px; color:var(--text-primary); cursor:pointer; transition:all 0.2s;" onmouseenter="this.style.borderColor='var(--accent)'; this.style.background='var(--bg-hover)'" onmouseleave="this.style.borderColor='var(--border)'; this.style.background='var(--bg-surface)'">
                        <div style="width:32px; height:32px; border-radius:8px; background:rgba(47,129,247,0.1); color:var(--accent); display:flex; align-items:center; justify-content:center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </div>
                        <span style="font-weight:500;">Ver meu Site</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    // 2. Carregar Dados Reais
    loadDashboardData(container);

    // Global listeners para onboarding
    window.dismissOnboarding = async () => {
        try {
            await apiPost('/api/onboarding/dismiss');
            const el = document.getElementById('onboarding-section');
            if (el) el.style.display = 'none';
        } catch (e) { console.error(e); }
    };
}

async function apiPost(url, body = {}) {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${appState.authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    return res.json();
}

async function loadDashboardData(container) {
    try {
        const [sessionsData, billingData] = await Promise.all([
            apiGet('/api/sessions'),
            apiGet('/api/billing/subscription')
        ]);
        const sessions = sessionsData.sessions || [];
        const storageMB = billingData.usage?.storageMB || 0;

        const metricsGrid = container.querySelector('#metrics-grid');
        const sessionsList = container.querySelector('#recent-sessions-list');

        // Processar métricas
        const total = sessions.length;
        const pending = sessions.filter(s => s.selectionStatus === 'submitted').length;
        const delivered = sessions.filter(s => s.selectionStatus === 'delivered').length;

        metricsGrid.innerHTML = `
            ${renderMetricCard('Total de Sessões', total, 'var(--accent)', 'layers')}
            ${renderMetricCard('Fotos Upadas', sessions.reduce((s, p) => s + (p.photos?.length || 0), 0), 'var(--purple)', 'image')}
            ${renderMetricCard('Espaço Usado', `${storageMB} MB`, 'var(--orange)', 'hard-drive')}
            ${renderMetricCard('Entregues', delivered, 'var(--green)', 'check-circle')}
        `;

        // Renderizar lista de sessões
        if (sessions.length === 0) {
            sessionsList.innerHTML = `<p style="padding:3rem; text-align:center; color:var(--text-muted);">Você ainda não tem sessões. Crie a primeira para começar.</p>`;
        } else {
            sessionsList.innerHTML = sessions.slice(0, 5).map(session => `
                <div style="padding:1rem 1.25rem; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:1rem;">
                    <div style="width:40px; height:40px; border-radius:8px; background:var(--bg-elevated); display:flex; align-items:center; justify-content:center; overflow:hidden;">
                        ${session.coverPhoto ? `<img src="${session.coverPhoto}" style="width:100%; height:100%; object-fit:cover;">` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`}
                    </div>
                    <div style="flex:1;">
                        <div style="font-weight:600; color:var(--text-primary);">${session.name}</div>
                        <div style="font-size:0.75rem; color:var(--text-secondary);">${formatDate(session.date)} • ${session.type}</div>
                    </div>
                    <div style="padding:0.25rem 0.625rem; border-radius:20px; font-size:0.75rem; font-weight:600; background:${getStatusColor(session.selectionStatus).bg}; color:${getStatusColor(session.selectionStatus).text};">
                        ${getStatusLabel(session.selectionStatus)}
                    </div>
                </div>
            `).join('');
        }

        container.querySelector('#last-update').innerText = `Atualizado às ${new Date().toLocaleTimeString()}`;

        // Carregar Onboarding
        const onboardingData = await apiGet('/api/onboarding');
        if (onboardingData.success && !onboardingData.onboarding?.completed) {
            renderOnboardingChecklist(container, onboardingData.onboarding.steps);
        }

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        window.showToast?.('Erro ao carregar dados do dashboard', 'error');
    }
}

function renderOnboardingChecklist(container, steps) {
    const target = container.querySelector('#onboarding-container');
    if (!target) return;

    const items = [
        { key: 'sessionCreated', label: 'Criar sua primeira sessão', hint: 'Clique em "Nova Sessão" no menu' },
        { key: 'photosUploaded', label: 'Subir as primeiras fotos', hint: 'Acesse a sessão e arraste seus arquivos' },
        { key: 'clientLinked',   label: 'Vincular um cliente', hint: 'Defina para quem as fotos serão enviadas' },
        { key: 'linkSent',       label: 'Enviar link de acesso', hint: 'Mande o código de acesso por e-mail' }
    ];

    const completedCount = items.filter(i => steps[i.key]).length;
    const progress = Math.round((completedCount / items.length) * 100);

    target.innerHTML = `
        <div id="onboarding-section" style="background:var(--bg-surface); border:1px solid var(--accent); border-radius:12px; padding:1.5rem; animation: slideIn 0.4s ease; border-left: 4px solid var(--accent);">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:1.5rem;">
                <div>
                    <h3 style="font-size:1.125rem; font-weight:700; color:var(--text-primary); margin:0;">Comece por aqui</h3>
                    <p style="color:var(--text-secondary); font-size:0.875rem; margin-top:0.25rem;">Complete estes passos para dominar o CliqueZoom.</p>
                </div>
                <button onclick="dismissOnboarding()" class="btn btn-ghost btn-sm" style="color:var(--text-muted); text-decoration:underline;">Ocultar guia</button>
            </div>

            <div style="margin-bottom:1.5rem;">
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem; font-weight:600;">
                    <span>Progresso do Setup</span>
                    <span>${progress}%</span>
                </div>
                <div style="height:6px; background:var(--bg-elevated); border-radius:3px; overflow:hidden;">
                    <div style="height:100%; width:${progress}%; background:var(--accent); transition:width 0.6s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:1rem;">
                ${items.map(item => {
                    const isDone = steps[item.key];
                    return `
                        <div style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem; background:var(--bg-elevated); border-radius:8px; opacity:${isDone ? '0.6' : '1'};">
                            <div style="width:20px; height:20px; border-radius:50%; border:2px solid ${isDone ? 'var(--green)' : 'var(--border)'}; background:${isDone ? 'var(--green)' : 'transparent'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                ${isDone ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                            </div>
                            <div>
                                <div style="font-size:0.875rem; font-weight:600; color:var(--text-primary); text-decoration:${isDone ? 'line-through' : 'none'};">${item.label}</div>
                                <div style="font-size:0.7rem; color:var(--text-secondary);">${isDone ? 'Concluído!' : item.hint}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function renderMetricCard(label, value, color, icon) {
    return `
        <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:1.25rem; display:flex; align-items:center; gap:1rem;">
            <div style="width:44px; height:44px; border-radius:10px; background:var(--bg-elevated); color:${color}; display:flex; align-items:center; justify-content:center; border:1px solid var(--border);">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    ${getIconPath(icon)}
                </svg>
            </div>
            <div>
                <div style="font-size:0.8125rem; color:var(--text-secondary); font-weight:500;">${label}</div>
                <div style="font-size:1.5rem; font-weight:700; color:var(--text-primary);">${value}</div>
            </div>
        </div>
    `;
}

function renderMetricSkeleton() {
    return Array(4).fill(0).map(() => `
        <div class="skeleton" style="height:88px; border-radius:12px;"></div>
    `).join('');
}

function getStatusColor(status) {
    const map = {
        'pending':     { bg: 'rgba(210,153,34,0.15)',  text: 'var(--yellow)'  },
        'submitted':   { bg: 'rgba(47,129,247,0.15)',   text: 'var(--accent)'  },
        'delivered':   { bg: 'rgba(63,185,80,0.15)',    text: 'var(--green)'   },
        'in_progress': { bg: 'rgba(188,140,255,0.15)',  text: 'var(--purple)'  },
    };
    return map[status] || { bg: 'var(--bg-elevated)', text: 'var(--text-secondary)' };
}

function getStatusLabel(status) {
    const map = {
        'pending':     'Pendente',
        'submitted':   'Revisar',
        'delivered':   'Entregue',
        'in_progress': 'Em Seleção',
    };
    return map[status] || status;
}

function getIconPath(icon) {
    const icons = {
        'layers':       '<polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />',
        'clock':        '<circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />',
        'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />',
        'image':        '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
        'hard-drive':   '<line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/>'
    };
    return icons[icon] || '';
}
