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

            <div id="metrics-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
                ${renderMetricSkeleton()}
            </div>

            <div style="display:grid; grid-template-columns: 1fr 300px; gap:1.5rem; align-items: start;">
                <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; overflow:hidden;">
                    <div style="padding:1.25rem; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                        <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary);">Sessões Recentes</h3>
                        <button onclick="switchTab('sessoes')" style="background:none; border:none; color:var(--accent); font-size:0.8125rem; cursor:pointer; font-weight:500;">Ver todas</button>
                    </div>
                    <div id="recent-sessions-list" style="min-height:200px;">
                        <p style="padding:2rem; text-align:center; color:var(--text-muted);">Carregando sessões...</p>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:1rem;">
                    <h3 style="font-size:0.875rem; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">Ações Rápidas</h3>

                    <button onclick="switchTab('sessoes')" style="display:flex; align-items:center; gap:0.75rem; width:100%; padding:1rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:10px; color:var(--text-primary); cursor:pointer; transition:all 0.2s;" onmouseenter="this.style.borderColor='var(--accent)'; this.style.background='var(--bg-hover)'" onmouseleave="this.style.borderColor='var(--border)'; this.style.background='var(--bg-surface)'">
                        <div style="width:32px; height:32px; border-radius:8px; background:rgba(47,129,247,0.15); color:var(--accent); display:flex; align-items:center; justify-content:center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                        </div>
                        <span style="font-weight:500;">Nova Sessão</span>
                    </button>

                    <button onclick="toggleSitePreview()" style="display:flex; align-items:center; gap:0.75rem; width:100%; padding:1rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:10px; color:var(--text-primary); cursor:pointer; transition:all 0.2s;" onmouseenter="this.style.borderColor='var(--purple)'; this.style.background='var(--bg-hover)'" onmouseleave="this.style.borderColor='var(--border)'; this.style.background='var(--bg-surface)'">
                        <div style="width:32px; height:32px; border-radius:8px; background:rgba(188,140,255,0.15); color:var(--purple); display:flex; align-items:center; justify-content:center;">
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
}

async function loadDashboardData(container) {
    try {
        const data = await apiGet('/api/sessions');
        const sessions = data.sessions || [];

        const metricsGrid = container.querySelector('#metrics-grid');
        const sessionsList = container.querySelector('#recent-sessions-list');

        // Processar métricas
        const total = sessions.length;
        const pending = sessions.filter(s => s.selectionStatus === 'submitted').length;
        const delivered = sessions.filter(s => s.selectionStatus === 'delivered').length;

        metricsGrid.innerHTML = `
            ${renderMetricCard('Total de Sessões', total, 'var(--accent)', 'layers')}
            ${renderMetricCard('Aguardando Revisão', pending, 'var(--orange)', 'clock')}
            ${renderMetricCard('Entregues', delivered, 'var(--green)', 'check-circle')}
        `;

        // Renderizar lista de sessões
        if (sessions.length === 0) {
            sessionsList.innerHTML = `<p style="padding:3rem; text-align:center; color:var(--text-muted);">Nenhuma sessão encontrada. Comece criando uma!</p>`;
        } else {
            sessionsList.innerHTML = sessions.slice(0, 5).map(session => `
                <div style="padding:1rem 1.25rem; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:1rem; transition:background 0.2s;" onmouseenter="this.style.background='var(--bg-hover)'" onmouseleave="this.style.background='transparent'">
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

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        window.showToast?.('Erro ao carregar dados do dashboard', 'error');
    }
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
    return Array(3).fill(0).map(() => `
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
    };
    return icons[icon] || '';
}
