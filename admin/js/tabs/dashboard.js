/**
 * Tab: Dashboard
 * Fornece uma visão geral do negócio e atalhos rápidos.
 */

import { appState } from '../state.js';
import { apiGet, apiPost } from '../utils/api.js';
import { formatDate } from '../utils/helpers.js';

export async function renderDashboard(container) {
    // 1. Estrutura Base com Spinner de Carregamento
    container.innerHTML = `
        <!-- Estilos de Abas com reveal/morph animation em formato de bolinha -->
        <style id="dash-tabs-styles">
            .dashboard-tabs {
                display: flex;
                justify-content: center;
                gap: 0.75rem;
                padding-bottom: 0.5rem;
            }
            .dash-tab-btn {
                box-sizing: border-box;
                display: inline-flex !important;
                align-items: center;
                gap: 0 !important;
                height: 40px !important;
                width: auto !important;
                min-width: 40px !important;
                flex-shrink: 0 !important;
                padding: 0 !important;
                border: 1px solid var(--border);
                border-radius: 9999px !important;
                cursor: pointer;
                overflow: visible;
                white-space: nowrap;
                font-family: inherit;
                font-weight: 600;
                font-size: 0.875rem;
                outline: none;
                position: relative;
                background: var(--bg-elevated);
                color: var(--text-secondary);
                transition: background 0.15s, border-color 0.15s, color 0.15s;
            }
            .dash-tab-btn:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
                border-color: var(--text-muted);
            }
            .dash-tab-btn.active {
                background: var(--bg-hover);
                color: var(--text-primary);
                border-color: var(--accent);
            }
            .dash-tab-btn .dash-tab-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 38px;
                height: 38px;
                flex-shrink: 0;
            }
            .dash-tab-btn .dash-tab-label {
                overflow: hidden;
                white-space: nowrap;
                display: inline-block;
                vertical-align: middle;
                padding-right: 1.15rem;
            }
        </style>

        <div id="dashboard-content" style="display:flex; flex-direction:column; gap:1.5rem; animation: fadeInUp 0.3s ease;">
            
            <!-- Container de Banners de Parceiros -->
            <div id="dashboard-banners"></div>

            <!-- Menu de Abas do Dashboard -->
            <div class="dashboard-tabs">
                <button class="dash-tab-btn active" onclick="switchDashboardTab('overview')">
                    <span class="dash-tab-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    </span>
                    <span class="dash-tab-label">Visão Geral</span>
                </button>
                <button class="dash-tab-btn" onclick="switchDashboardTab('events')">
                    <span class="dash-tab-icon" style="position: relative;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        <span id="events-badge" style="display:none; background:var(--red); color:#fff; border-radius:50%; width:14px; height:14px; font-size:0.65rem; font-weight:800; align-items:center; justify-content:center; position:absolute; top:-5px; right:-5px; z-index: 10;"></span>
                    </span>
                    <span class="dash-tab-label">Eventos</span>
                </button>
            </div>

            <!-- Aba 1: Visão Geral -->
            <div id="dashboard-tab-overview" style="display:flex; flex-direction:column; gap:1.5rem;">
                <div id="onboarding-container"></div>

                <div id="metrics-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
                    ${renderMetricSkeleton()}
                </div>

                <div style="display:grid; grid-template-columns: 1fr 300px; gap:1.5rem; align-items: start;">
                    <div id="recent-sessions-panel" style="background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--r-card); overflow:hidden;">
                        <div style="padding:1.25rem; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; align-items:baseline; gap:0.75rem;">
                                <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary);">Sessões Recentes</h3>
                                <span id="last-update" style="font-size:0.6875rem; color:var(--text-muted);"></span>
                            </div>
                            <button onclick="switchTab('sessoes')" class="btn btn-ghost btn-sm" style="color:var(--accent);">Ver todas</button>
                        </div>
                        <div id="recent-sessions-list" style="min-height:200px; display:flex; flex-direction:column; gap:4px; padding:8px;">
                            <p style="padding:2rem; text-align:center; color:var(--text-muted);">Carregando sessões...</p>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:1rem;">
                        <h3 style="font-size:0.875rem; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">Ações Rápidas</h3>

                        <button id="qa-new-session" onclick="switchTab('sessoes')" style="display:flex; align-items:center; gap:0.75rem; width:100%; padding:1rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--r-card); color:var(--text-primary); cursor:pointer; transition:all 0.2s;" onmouseenter="this.style.borderColor='var(--accent)'; this.style.background='var(--bg-hover)'" onmouseleave="this.style.borderColor='var(--border)'; this.style.background='var(--bg-surface)'">
                            <div style="width:32px; height:32px; border-radius:50%; background:var(--bg-elevated); color:var(--text-primary); display:flex; align-items:center; justify-content:center;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                            </div>
                            <span style="font-weight:500;">Nova Sessão</span>
                        </button>

                        <button id="qa-view-site" onclick="openMySite()" style="display:flex; align-items:center; gap:0.75rem; width:100%; padding:1rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--r-card); color:var(--text-primary); cursor:pointer; transition:all 0.2s;" onmouseenter="this.style.borderColor='var(--accent)'; this.style.background='var(--bg-hover)'" onmouseleave="this.style.borderColor='var(--border)'; this.style.background='var(--bg-surface)'">
                            <div style="width:32px; height:32px; border-radius:50%; background:var(--bg-elevated); color:var(--text-primary); display:flex; align-items:center; justify-content:center;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </div>
                            <span style="font-weight:500;">Ver meu Site</span>
                        </button>

                        <div id="clients-online-card"></div>
                    </div>
                </div>
                <!-- Container de Novidades da Plataforma -->
                <div id="dashboard-news" style="margin-top:0.5rem;"></div>
            </div>

            <!-- Aba 2: Eventos da Plataforma -->
            <div id="dashboard-tab-events" style="display:none; flex-direction:column; gap:1rem;">
                <p style="padding:2rem; text-align:center; color:var(--text-muted);">Carregando comunicados...</p>
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
        } catch (e) { window.showToast?.('Erro ao ocultar guia', 'error'); }
    };
}

async function loadDashboardData(container) {
    try {
        const [sessionsData, billingData, bannersData, annData, updatesData, cardBgData] = await Promise.all([
            apiGet('/api/sessions'),
            apiGet('/api/billing/subscription'),
            apiGet('/api/banners').catch(() => ({ success: true, banners: [] })),
            apiGet('/api/announcements').catch(() => ({ success: true, announcements: [] })),
            apiGet('/api/platform-updates').catch(() => ({ success: true, version: '1.0.0', updates: [] })),
            apiGet('/api/dashboard-cards').catch(() => ({ success: true, cards: {} }))
        ]);
        const sessions = sessionsData.sessions || [];
        // Espaço usado = só fotos das sessões (logo/site e vídeos não contam — ver aba Plano).
        const storageMB = billingData.usage?.breakdown?.sessionsMB ?? billingData.usage?.storageMB ?? 0;
        const banners = bannersData.banners || [];
        const announcements = annData.announcements || [];
        const updates = updatesData?.updates || [];
        const version = updatesData?.version || '1.0.0';
        // Imagens de fundo geridas no Super Admin (NÃO hardcoded).
        // Formato: { <key>: { imageUrl, opacity }, ... }. Chave ausente => estilo sólido.
        //  - Métricas (sessions/photos/storage/delivered): véu escuro + texto branco (só imageUrl).
        //  - Superfícies (recentSessions/quickActionNew/quickActionSite): imagem suave atrás do conteúdo, com opacity.
        const cardBg = cardBgData?.cards || {};

        // Atualizar versão no header
        const versionEl = document.getElementById('platform-version');
        if (versionEl) {
            versionEl.textContent = `v${version}`;
            versionEl.style.display = 'inline-block';
        }

        // Renderizar banners se houver cadastrados
        const bannersContainer = container.querySelector('#dashboard-banners');
        if (bannersContainer) {
            bannersContainer.innerHTML = renderBanners(banners, bannersData.accentColor);
            setupBannersCarousel(bannersContainer, banners.length, bannersData.interval || 0);
        }

        // Renderizar comunicados da plataforma na aba correspondente
        const eventsContainer = container.querySelector('#dashboard-tab-events');
        if (eventsContainer) {
            eventsContainer.innerHTML = renderPlatformEvents(announcements);
        }

        // Renderizar novidades se houver cadastradas
        const newsContainer = container.querySelector('#dashboard-news');
        if (newsContainer) {
            newsContainer.innerHTML = renderPlatformNews(updates);
            setupNewsCarousel(newsContainer, updates.length);
            // Imagem de fundo suave do card de Novidades (gerida no Super Admin).
            newsContainer.querySelectorAll('.news-card').forEach(el => applySurfaceBg(el, cardBg.platformNews));
        }

        // Lógica de bolinha de notificação (novos eventos)
        const lastView = localStorage.getItem('cz-last-events-view');
        const lastViewTime = lastView ? parseInt(lastView) : 0;
        const unreadCount = announcements.filter(a => new Date(a.createdAt).getTime() > lastViewTime).length;

        const badge = container.querySelector('#events-badge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }

        const metricsGrid = container.querySelector('#metrics-grid');
        const sessionsList = container.querySelector('#recent-sessions-list');

        // Processar métricas
        const total = sessions.length;
        const delivered = sessions.filter(s => s.selectionStatus === 'delivered').length;

        metricsGrid.innerHTML = `
            ${renderMetricCard('Total de Sessões', total, 'layers', 'sessions', cardBg.sessions?.imageUrl)}
            ${renderMetricCard('Fotos Upadas', sessions.reduce((s, p) => s + (p.photos?.length || 0), 0), 'image', 'photos', cardBg.photos?.imageUrl)}
            ${renderMetricCard('Espaço Usado', formatStorage(storageMB), 'hard-drive', 'storage', cardBg.storage?.imageUrl)}
            ${renderMetricCard('Entregues', delivered, 'check-circle', 'delivered', cardBg.delivered?.imageUrl)}
        `;

        // Superfícies com imagem de fundo suave (geridas no Super Admin, com opacidade).
        applySurfaceBg(container.querySelector('#recent-sessions-panel'), cardBg.recentSessions);
        applySurfaceBg(container.querySelector('#qa-new-session'), cardBg.quickActionNew);
        applySurfaceBg(container.querySelector('#qa-view-site'), cardBg.quickActionSite);

        // Renderizar lista de sessões
        if (sessions.length === 0) {
            sessionsList.innerHTML = `<p style="padding:3rem; text-align:center; color:var(--text-muted);">Você ainda não tem sessões. Crie a primeira para começar.</p>`;
        } else {
            sessionsList.innerHTML = sessions.slice(0, 5).map(session => `
                <div class="session" onclick="switchTab('sessoes').then(() => window.openSessionWizard?.('${session._id}'))">
                    <div style="width:80px; height:80px; border-radius:50%; background:var(--bg-elevated); display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">
                        ${session.coverPhoto ? `<img src="${session.coverPhoto}" style="width:100%; height:100%; object-fit:cover;">` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`}
                    </div>
                    <div style="flex:1;">
                        <div style="font-weight:600; color:var(--text-primary);">${session.name}</div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); display:flex; align-items:center; gap:0.5rem; margin-top:0.25rem;">
                            <span>${formatDate(session.date)}</span>
                            <span style="background:color-mix(in srgb, var(--cz-secondary) 14%, transparent); border:1px solid color-mix(in srgb, var(--cz-secondary) 32%, transparent); color:color-mix(in srgb, var(--cz-secondary) 80%, var(--text-primary)); font-size:0.65rem; padding:0.15rem 0.4rem; border-radius:var(--r-chip); font-weight:600;">${{ selection: 'Seleção', multi_selection: 'Seleção em Grupo', gallery: 'Galeria', multi_gallery: 'Galeria em Grupo', instant: 'Entrega Imediata', multi_instant: 'Imediata em Grupo' }[session.mode] || 'Sessão'}</span>
                            ${session.eventType && session.eventType !== 'outro' ? `<span style="background:color-mix(in srgb, var(--cz-secondary) 14%, transparent); border:1px solid color-mix(in srgb, var(--cz-secondary) 32%, transparent); color:color-mix(in srgb, var(--cz-secondary) 80%, var(--text-primary)); font-size:0.65rem; padding:0.15rem 0.4rem; border-radius:var(--r-chip); font-weight:600;">${{ aniversario: 'Aniversário', casamento: 'Casamento', formatura: 'Formatura', corporativo: 'Corporativo', show: 'Show', ensaio: 'Ensaio', gestante: 'Gestante', newborn: 'Newborn', debutante: 'Debutante', batizado: 'Batizado' }[session.eventType] || session.eventType}</span>` : ''}
                        </div>
                    </div>
                    <div style="padding:0.25rem 0.625rem; border-radius:var(--r-chip); font-size:0.75rem; font-weight:600; background:${getStatusColor(session.selectionStatus).bg}; color:${getStatusColor(session.selectionStatus).text};">
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

        // Card de clientes online (fire-and-forget: presença é cosmética)
        const clientsOnlineEl = container.querySelector('#clients-online-card');
        if (clientsOnlineEl) {
            apiGet('/api/presence/clients').then(data => {
                clientsOnlineEl.innerHTML = renderClientsOnlineCard(data);
                startClientsOnlinePoll();
            }).catch(() => {});
        }

    } catch (error) {
        window.showToast?.('Erro ao carregar dados do dashboard', 'error');
    }
}

function renderOnboardingChecklist(container, steps) {
    const target = container.querySelector('#onboarding-container');
    if (!target) return;

    const items = [
        { key: 'sessionCreated', label: 'Criar sua primeira sessão', hint: 'Clique em "Nova Sessão" no menu', category: 'sessoes', query: 'Sessão' },
        { key: 'photosUploaded', label: 'Subir as primeiras fotos', hint: 'Acesse a sessão e arraste seus arquivos', category: 'sessoes', query: 'Fotos' },
        { key: 'linkSent',       label: 'Enviar link de acesso', hint: 'Mande o código de acesso por e-mail', category: 'sessoes', query: 'Clientes' }
    ];

    const completedCount = items.filter(i => steps[i.key]).length;
    const progress = Math.round((completedCount / items.length) * 100);

    target.innerHTML = `
        <div id="onboarding-section" style="background:var(--bg-surface); border:1px solid var(--accent); border-radius:var(--r-card); padding:1.5rem; animation: slideIn 0.4s ease; border-left: 4px solid var(--accent);">
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
                        <div style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem; background:var(--bg-elevated); border-radius:var(--r-field); opacity:${isDone ? '0.6' : '1'};">
                            <div style="width:20px; height:20px; border-radius:50%; border:2px solid ${isDone ? 'var(--green)' : 'var(--border)'}; background:${isDone ? 'var(--green)' : 'transparent'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                                ${isDone ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                            </div>
                            <div>
                                <div style="font-size:0.875rem; font-weight:600; color:var(--text-primary); text-decoration:${isDone ? 'line-through' : 'none'};">${item.label}</div>
                                <div style="display:flex; align-items:center; gap:0.35rem; margin-top:0.15rem;">
                                    <div style="font-size:0.7rem; color:var(--text-secondary);">${isDone ? 'Concluído!' : item.hint}</div>
                                    ${!isDone ? `• <span onclick="openTutorialHelp('${item.category}', '${item.query}')" style="font-size:0.6875rem; color:var(--accent); cursor:pointer; font-weight:600; text-decoration:underline;">Ver Tutorial</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Aplica (ou remove) uma imagem de fundo suave atrás do conteúdo de um elemento.
// Usada nas superfícies do dashboard (painel Sessões Recentes, ações rápidas) cuja
// imagem é gerida no Super Admin. A camada vai em z-index:-1 dentro de um stacking
// context isolado (isolation:isolate) — fica ACIMA do fundo e ABAIXO do texto, então a
// legibilidade é preservada via opacidade ajustável. cfg = { imageUrl, opacity } ou undefined.
function applySurfaceBg(el, cfg) {
    if (!el) return;
    let layer = el.querySelector(':scope > .cz-surface-bg');
    if (!cfg || !cfg.imageUrl) {
        if (layer) layer.remove();
        return;
    }
    el.style.position = 'relative';
    el.style.isolation = 'isolate';
    el.style.overflow = 'hidden';
    if (!layer) {
        layer = document.createElement('div');
        layer.className = 'cz-surface-bg';
        el.insertBefore(layer, el.firstChild);
    }
    const opacity = (typeof cfg.opacity === 'number') ? cfg.opacity : 0.2;
    layer.style.cssText = `position:absolute; inset:0; z-index:-1; background-image:url('${cfg.imageUrl}'); background-size:cover; background-position:center; opacity:${opacity}; pointer-events:none;`;
}

// Card de métrica. A imagem de fundo (bgImage) vem do Super Admin via /api/dashboard-cards.
// Sem bgImage => estilo sólido padrão. NADA de imagem hardcoded aqui.
function renderMetricCard(label, value, icon, id = '', bgImage = '') {
    if (bgImage) {
        return `
            <div class="cz-metric cz-metric--photo" data-card-id="${esc(id)}" style="background-image:url('${esc(bgImage)}');">
                <div class="cz-metric__veil"></div>
                <div class="cz-metric__tile">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        ${getIconPath(icon)}
                    </svg>
                </div>
                <div class="cz-metric__body">
                    <div class="cz-metric__label">${label}</div>
                    <div class="cz-metric__value">${value}</div>
                </div>
            </div>
        `;
    }

    return `
        <div class="cz-metric" data-card-id="${esc(id)}">
            <div class="cz-metric__tile">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    ${getIconPath(icon)}
                </svg>
            </div>
            <div class="cz-metric__body">
                <div class="cz-metric__label">${label}</div>
                <div class="cz-metric__value">${value}</div>
            </div>
        </div>
    `;
}

// Formata o espaço usado de forma legível: GB a partir de 1 GB (evita o usuário converter
// "1240 MB" de cabeça), MB para valores pequenos (um usuário novo não vê "0.05 GB").
function formatStorage(mb) {
    const v = Number(mb) || 0;
    if (v >= 1024) return `${(v / 1024).toFixed(1)} GB`;
    return `${v} MB`;
}

function renderMetricSkeleton() {
    return Array(4).fill(0).map(() => `
        <div class="skeleton" style="height:88px; border-radius:var(--r-card);"></div>
    `).join('');
}

function getStatusColor(status) {
    // Paleta da marca: cinza por padrão, cor apenas funcional (alerta/sucesso).
    const map = {
        'pending':     { bg: 'rgba(210,153,34,0.15)',  text: 'var(--yellow)'  },
        'submitted':   { bg: 'var(--bg-elevated)',      text: 'var(--text-secondary)' },
        'delivered':   { bg: 'rgba(63,185,80,0.15)',    text: 'var(--green)'   },
        'in_progress': { bg: 'var(--bg-elevated)',      text: 'var(--text-secondary)' },
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

window.openTutorialHelp = async function(category, queryText = '') {
    // Sempre navegar para a aba ajuda primeiro
    await switchTab('ajuda');
    
    // Agora que a aba mudou e o módulo foi importado, chamamos a função real
    if (window._openTutorialHelpReal) {
        window._openTutorialHelpReal(category, queryText);
    }
};

function esc(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderBanners(banners, accentColor) {
    if (!banners || banners.length === 0) {
        return ''; // Oculta se não houver banners ativos
    }

    // Cor configurável no super admin (BannerConfig.accentColor). Só aceita hex #RRGGBB; senão verde padrão.
    const accent = /^#[0-9a-fA-F]{6}$/.test(String(accentColor || '').trim()) ? accentColor.trim() : '#3fb950';

    const styles = `
        <style>
            /* ── Banners de parceiros: cards horizontais com painel escuro + CTA (estilo "promo") ── */
            .banners-section { width: 100%; position: relative; margin-bottom: 0.25rem; --banner-accent: #3fb950; }
            .banners-wrapper { position: relative; width: 100%; }
            .banners-scroll-container {
                display: flex;
                gap: 1rem;
                overflow-x: auto;
                scroll-snap-type: x mandatory;
                scroll-behavior: smooth;
                -ms-overflow-style: none;
                scrollbar-width: none;
                padding-bottom: 2px;
            }
            .banners-scroll-container::-webkit-scrollbar { display: none; }

            .banner-card {
                flex: 0 0 100%;
                scroll-snap-align: start;
                position: relative;
                display: flex;
                align-items: stretch;
                min-height: 150px;
                border-radius: 16px;
                overflow: hidden;
                text-decoration: none;
                color: #fff;
                /* base escura + brilho verde à esquerda (independe do tema, igual referência) */
                background:
                    radial-gradient(135% 140% at 0% 50%, color-mix(in srgb, var(--banner-accent) 30%, transparent) 0%, color-mix(in srgb, var(--banner-accent) 7%, transparent) 34%, transparent 62%),
                    linear-gradient(120deg, color-mix(in srgb, var(--banner-accent) 14%, #0b0e13) 0%, color-mix(in srgb, var(--banner-accent) 6%, #0b0e13) 46%, #0b0e13 100%);
                border: 1px solid rgba(255,255,255,0.07);
                box-shadow: 0 6px 18px rgba(0,0,0,0.18);
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .banner-card.is-clickable { cursor: pointer; }
            .banner-card.is-clickable:hover {
                transform: translateY(-3px);
                box-shadow: 0 16px 32px rgba(0,0,0,0.28);
            }

            .banner-text {
                position: relative;
                z-index: 2;
                flex: 1 1 58%;
                min-width: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 0.4rem;
                padding: 1.1rem 1.25rem;
                font-family: 'Inter', sans-serif;
            }
            .banner-text h3 {
                margin: 0;
                font-size: 1.05rem;
                font-weight: 800;
                line-height: 1.2;
                letter-spacing: -0.01em;
                color: #fff;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .banner-text p {
                margin: 0;
                font-size: 0.8rem;
                line-height: 1.45;
                color: rgba(255,255,255,0.72);
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .banner-cta {
                margin-top: 0.35rem;
                align-self: flex-start;
                display: inline-flex;
                align-items: center;
                gap: 0.3rem;
                background: var(--banner-accent);
                color: #06120a;
                font-weight: 700;
                font-size: 0.78rem;
                padding: 0.42rem 0.85rem;
                border-radius: 9999px;
                transition: background 0.15s;
            }
            .banner-card.is-clickable:hover .banner-cta { background: color-mix(in srgb, var(--banner-accent) 82%, #ffffff); }

            .banner-media { position: relative; flex: 0 0 42%; min-width: 0; align-self: stretch; }
            .banner-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
            /* funde a imagem no painel escuro pela borda esquerda */
            .banner-media::before {
                content: '';
                position: absolute;
                inset: 0;
                z-index: 1;
                pointer-events: none;
                background: linear-gradient(90deg, #0b0e13 0%, rgba(11,14,19,0.55) 24%, transparent 64%);
            }

            .banners-dots { display: flex; justify-content: center; gap: 0.4rem; margin-top: 0.625rem; }
            .banner-dot {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: var(--border);
                border: none;
                cursor: pointer;
                padding: 0;
                transition: background 0.2s, transform 0.2s;
            }
            .banner-dot.active { background: var(--accent); transform: scale(1.25); }

            @media (min-width: 768px) {
                .banner-card { flex: 0 0 calc(33.333% - 0.667rem); }
            }
            @media (max-width: 767px) {
                .banner-card { min-height: 132px; }
                .banner-text h3 { font-size: 0.98rem; }
                .banner-text { padding: 0.9rem 1rem; }
            }
        </style>
    `;

    const isMobile = window.innerWidth < 768;
    const itemsPerPage = isMobile ? 1 : 3;
    const numPages = Math.ceil(banners.length / itemsPerPage);

    let dotsHtml = '';
    if (banners.length > itemsPerPage || (isMobile && banners.length > 1)) {
        dotsHtml = `
            <div class="banners-dots">
                ${Array(numPages).fill(0).map((_, idx) => `
                    <button class="banner-dot ${idx === 0 ? 'active' : ''}" data-idx="${idx}" aria-label="Ir para slide ${idx + 1}"></button>
                `).join('')}
            </div>
        `;
    }

    const cardsHtml = banners.map(banner => {
        const isClickable = !!banner.linkUrl;
        let tag = 'div';
        let linkAttr = '';

        if (isClickable) {
            const isInternal = banner.linkUrl.startsWith('#');
            if (isInternal) {
                const tabTarget = banner.linkUrl.substring(1);
                linkAttr = `onclick="switchTab('${esc(tabTarget)}')"`;
            } else {
                tag = 'a';
                linkAttr = `href="${esc(banner.linkUrl)}" target="_blank" rel="noopener"`;
            }
        }

        // Título da headline: usa o title; se vazio, cai no 1º heading da descrição.
        let headlineRaw = String(banner.title || '').trim();
        if (!headlineRaw) {
            const m = String(banner.description || '').match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
            if (m) headlineRaw = m[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
        const headline = esc(headlineRaw);

        // Excerpt limpo: remove headings (evita duplicar o título) e qualquer HTML/inline-style
        // colado pelo superadmin (era a causa dos "retângulos pretos" atrás do texto).
        const excerptRaw = String(banner.description || '')
            .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, ' ')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const excerpt = excerptRaw ? `<p>${esc(excerptRaw)}</p>` : '';

        const cta = isClickable
            ? `<span class="banner-cta">Saiba mais<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span>`
            : '';

        return `
            <${tag} ${linkAttr} class="banner-card${isClickable ? ' is-clickable' : ''}" title="${headline}">
                <div class="banner-text">
                    ${headline ? `<h3>${headline}</h3>` : ''}
                    ${excerpt}
                    ${cta}
                </div>
                <div class="banner-media">
                    <img src="${esc(banner.imageUrl)}" alt="${headline}" loading="lazy">
                </div>
            </${tag}>
        `;
    }).join('');

    return `
        ${styles}
        <div class="banners-section" style="--banner-accent:${accent};">
            <div class="banners-wrapper">
                <div class="banners-scroll-container">
                    ${cardsHtml}
                </div>
            </div>
            ${dotsHtml}
        </div>
    `;
}

function setupBannersCarousel(container, bannersCount, intervalSecs = 0) {
    const scrollContainer = container.querySelector('.banners-scroll-container');
    const dots = container.querySelectorAll('.banner-dot');
    if (!scrollContainer || dots.length === 0) return;

    const updateActiveDot = () => {
        const width = scrollContainer.clientWidth;
        const scrollLeft = scrollContainer.scrollLeft;
        const scrollWidth = scrollContainer.scrollWidth;
        
        let activeIndex = Math.round(scrollLeft / (width || 1));
        
        // Se rolamos até o final do container (com margem de 10px), forçar o último dot
        if (scrollLeft + width >= scrollWidth - 10) {
            activeIndex = dots.length - 1;
        }
        
        dots.forEach((dot, idx) => {
            if (idx === activeIndex) dot.classList.add('active');
            else dot.classList.remove('active');
        });
        
        return activeIndex;
    };

    let isScrolling;
    scrollContainer.addEventListener('scroll', () => {
        window.clearTimeout(isScrolling);
        isScrolling = setTimeout(updateActiveDot, 100);
    });

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const idx = parseInt(dot.getAttribute('data-idx'));
            const width = scrollContainer.clientWidth;
            
            scrollContainer.scrollTo({
                left: idx * (width + 16), // 16px é o gap (1rem)
                behavior: 'smooth'
            });
        });
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateActiveDot, 150);
    });

    // Configuração de Auto-slide
    const intervalMs = intervalSecs * 1000;
    let autoSlideTimer;

    const startAutoSlide = () => {
        if (!intervalMs || intervalMs <= 0 || dots.length <= 1) return;
        clearInterval(autoSlideTimer);
        autoSlideTimer = setInterval(() => {
            const width = scrollContainer.clientWidth;
            let activeIndex = updateActiveDot();
            
            activeIndex++;
            if (activeIndex >= dots.length) activeIndex = 0;
            
            scrollContainer.scrollTo({
                left: activeIndex * (width + 16),
                behavior: 'smooth'
            });
        }, intervalMs);
    };

    startAutoSlide();

    // Pausar auto-slide no hover ou touch manual
    scrollContainer.addEventListener('mouseenter', () => clearInterval(autoSlideTimer));
    scrollContainer.addEventListener('mouseleave', startAutoSlide);
    scrollContainer.addEventListener('touchstart', () => clearInterval(autoSlideTimer));
    scrollContainer.addEventListener('touchend', startAutoSlide);
}

window.switchDashboardTab = function(tab) {
    const btnOverview = document.querySelector('.dash-tab-btn[onclick*="overview"]');
    const btnEvents = document.querySelector('.dash-tab-btn[onclick*="events"]');
    const divOverview = document.getElementById('dashboard-tab-overview');
    const divEvents = document.getElementById('dashboard-tab-events');
    
    if (!btnOverview || !btnEvents || !divOverview || !divEvents) return;

    if (tab === 'overview') {
        btnOverview.classList.add('active');
        btnEvents.classList.remove('active');
        
        divOverview.style.display = 'flex';
        divEvents.style.display = 'none';
    } else {
        btnEvents.classList.add('active');
        btnOverview.classList.remove('active');
        
        divOverview.style.display = 'none';
        divEvents.style.display = 'flex';
        
        // Salvar timestamp de última visualização
        localStorage.setItem('cz-last-events-view', Date.now().toString());
        
        // Sumir com a bolinha de notificação
        const badge = document.getElementById('events-badge');
        if (badge) {
            badge.style.display = 'none';
        }
    }
};

function renderPlatformEvents(announcements) {
    if (!announcements || announcements.length === 0) {
        return `
            <div style="text-align:center; padding:3rem; color:var(--text-muted); background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--r-card);">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:0.75rem; color:var(--text-muted);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <p style="font-size:0.875rem; font-weight:500;">Nenhum aviso importante no momento.</p>
            </div>
        `;
    }

    return announcements.map(a => {
        const formattedDate = new Date(a.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        return `
            <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--r-card); padding:1.5rem; display:flex; flex-direction:column; gap:1rem; animation: fadeInUp 0.3s ease;">
                <div style="display:flex; justify-content:space-between; align-items:start; flex-wrap:wrap; gap:0.5rem;">
                    <h4 style="font-size:1rem; font-weight:700; color:var(--text-primary); margin:0;">${esc(a.title)}</h4>
                    <span style="font-size:0.75rem; color:var(--text-muted);">${formattedDate}</span>
                </div>
                
                ${a.imageUrl ? `
                    <div style="width:100%; max-height:280px; border-radius:var(--r-field); overflow:hidden; background:var(--bg-elevated); border:1px solid var(--border); display:flex; align-items:center; justify-content:center;">
                        <img src="${esc(a.imageUrl)}" style="max-width:100%; max-height:280px; object-fit:contain; display:block;">
                    </div>
                ` : ''}
                
                <div style="color:var(--text-secondary); font-size:0.875rem; line-height:1.6; word-break:break-word;">
                    ${a.content}
                </div>
                
                ${a.linkUrl ? `
                    <div style="display:flex; justify-content:flex-start; margin-top:0.25rem;">
                        ${a.linkUrl.startsWith('#') ? `
                            <button onclick="switchTab('${esc(a.linkUrl.substring(1))}')" class="btn" style="display:inline-flex; align-items:center; gap:0.5rem; text-decoration:none; padding:0.45rem 1.125rem; font-size:0.78rem; font-weight:600; cursor:pointer; background:var(--accent); color:var(--accent-on); border:none; border-radius:6px;">
                                ${esc(a.linkText || 'Saiba mais')}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                            </button>
                        ` : `
                            <a href="${esc(a.linkUrl)}" target="_blank" class="btn" style="display:inline-flex; align-items:center; gap:0.5rem; text-decoration:none; padding:0.45rem 1.125rem; font-size:0.78rem; font-weight:600; cursor:pointer; background:var(--accent); color:var(--accent-on); border:none; border-radius:6px;">
                                ${esc(a.linkText || 'Saiba mais')}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                            </a>
                        `}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function renderPlatformNews(updates) {
    if (!updates || updates.length === 0) {
        return ''; // Oculta se não houver novidades
    }

    const styles = `
        <style>
            .news-section {
                width: 100%;
                position: relative;
                margin-top: 2rem;
                border-top: 1px solid var(--border);
                padding-top: 1.5rem;
            }
            .news-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 1rem;
            }
            .news-title {
                font-size: 1rem;
                font-weight: 600;
                color: var(--text-primary);
                margin: 0;
            }
            .news-wrapper {
                position: relative;
                width: 100%;
            }
            .news-scroll-container {
                display: flex;
                gap: 1rem;
                overflow-x: auto;
                /* Respiro vertical: o overflow-x:auto faz o overflow-y virar auto e cortar
                   a borda/realce de cima do card (e o lift de 2px no hover). */
                padding: 6px 2px;
                scroll-snap-type: x mandatory;
                scroll-behavior: smooth;
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            .news-scroll-container::-webkit-scrollbar {
                display: none;
            }
            .news-card {
                flex: 0 0 100%;
                scroll-snap-align: start;
                background: var(--bg-surface);
                border: 1px solid var(--border);
                border-radius: 10px;
                padding: 1rem;
                display: flex;
                gap: 1rem;
                align-items: center;
                min-height: 80px;
                transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
                text-decoration: none;
                color: inherit;
            }
            .news-card.clickable {
                cursor: pointer;
            }
            .news-card.clickable:hover {
                transform: translateY(-2px);
                border-color: var(--accent);
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            }
            .news-icon-wrapper {
                width: 44px;
                height: 44px;
                border-radius: 8px;
                background: var(--bg-elevated);
                border: 1px solid var(--border);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                padding: 0.25rem;
                overflow: hidden;
            }
            .news-icon-wrapper img {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
            .news-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 0.2rem;
                min-width: 0;
            }
            .news-card-title {
                font-size: 0.875rem;
                font-weight: 600;
                color: var(--text-primary);
                margin: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .news-card-desc {
                font-size: 0.78rem;
                color: var(--text-secondary);
                margin: 0;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .news-dots {
                display: flex;
                justify-content: center;
                gap: 0.4rem;
                margin-top: 0.75rem;
            }
            .news-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: var(--border);
                border: none;
                cursor: pointer;
                padding: 0;
                transition: background 0.2s, transform 0.2s;
            }
            .news-dot.active {
                background: var(--accent);
                transform: scale(1.2);
            }
            @media (min-width: 768px) {
                .news-card {
                    flex: 0 0 calc(50% - 0.5rem);
                }
            }
        </style>
    `;

    const isMobile = window.innerWidth < 768;
    const itemsPerPage = isMobile ? 1 : 2;
    const numPages = Math.ceil(updates.length / itemsPerPage);

    let dotsHtml = '';
    if (updates.length > 2 || (isMobile && updates.length > 1)) {
        dotsHtml = `
            <div class="news-dots">
                ${Array(numPages).fill(0).map((_, idx) => `
                    <button class="news-dot ${idx === 0 ? 'active' : ''}" data-idx="${idx}" aria-label="Ir para slide ${idx + 1}"></button>
                `).join('')}
            </div>
        `;
    }

    const cardsHtml = updates.map(u => {
        const isClickable = !!u.linkUrl;
        let tag = 'div';
        let linkAttr = 'class="news-card"';
        
        if (isClickable) {
            const isInternal = u.linkUrl.startsWith('#');
            if (isInternal) {
                const tabTarget = u.linkUrl.substring(1);
                linkAttr = `onclick="switchTab('${esc(tabTarget)}')" class="news-card clickable" style="cursor:pointer;"`;
            } else {
                tag = 'a';
                linkAttr = `href="${esc(u.linkUrl)}" target="_blank" class="news-card clickable"`;
            }
        }
        
        const defaultIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
        const iconHtml = u.iconUrl 
            ? `<img src="${esc(u.iconUrl)}" alt="Icon" loading="lazy">`
            : defaultIcon;

        return `
            <${tag} ${linkAttr}>
                <div class="news-icon-wrapper">
                    ${iconHtml}
                </div>
                <div class="news-content">
                    <h4 class="news-card-title" title="${esc(u.title)}">${esc(u.title)}</h4>
                    <p class="news-card-desc" title="${esc(u.description)}">${esc(u.description)}</p>
                </div>
            </${tag}>
        `;
    }).join('');

    return `
        ${styles}
        <div class="news-section">
            <div class="news-header">
                <h3 class="news-title">Novidades do CliqueZoom</h3>
            </div>
            <div class="news-wrapper">
                <div class="news-scroll-container">
                    ${cardsHtml}
                </div>
            </div>
            ${dotsHtml}
        </div>
    `;
}

// ── Clientes online ─────────────────────────────────────────────────────────

let _clientsPoll = null;

function renderClientsOnlineCard(data) {
    const clients = (data && data.clients) || [];
    const total = (data && data.total) || 0;
    const on = total > 0;

    const rows = clients.map(c => {
        const moduleLabel = c.module === 'selecao' ? 'Seleção' : 'Galeria';
        const countBadge = c.count > 1
            ? `<span style="font-size:0.63rem; font-weight:700; padding:0.1rem 0.4rem; border-radius:999px; background:rgba(52,211,153,0.15); color:#34d399;">${c.count} online</span>`
            : '';
        return `<li style="display:flex; align-items:center; justify-content:space-between; padding:0.3rem 0; border-bottom:1px solid var(--border); gap:0.5rem;">
      <span style="font-size:0.8rem; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0;" title="${esc(c.name)}">${esc(c.name || 'Galeria')}</span>
      <span style="display:flex; align-items:center; gap:0.25rem; flex-shrink:0;">
        <span style="font-size:0.63rem; font-weight:600; padding:0.1rem 0.4rem; border-radius:999px; background:var(--bg-elevated); color:var(--text-secondary);">${moduleLabel}</span>
        ${countBadge}
      </span>
    </li>`;
    }).join('') || `<li style="font-size:0.78rem; color:var(--text-secondary); padding:0.3rem 0;">Nenhum cliente online no momento</li>`;

    return `<div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--r-card); padding:1rem;">
    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
      <span style="width:8px; height:8px; border-radius:50%; flex-shrink:0; background:${on ? '#34d399' : 'var(--text-muted)'};${on ? ' box-shadow:0 0 5px #34d399;' : ''}"></span>
      <span style="font-size:0.8rem; font-weight:700; color:var(--text);">Clientes online agora</span>
      ${on ? `<span style="margin-left:auto; font-size:0.65rem; font-weight:700; padding:0.1rem 0.45rem; border-radius:999px; background:rgba(52,211,153,0.12); color:#34d399;">${total}</span>` : ''}
    </div>
    <ul style="list-style:none; margin:0; padding:0;">${rows}</ul>
  </div>`;
}

function startClientsOnlinePoll() {
    if (_clientsPoll) clearInterval(_clientsPoll);
    _clientsPoll = setInterval(async () => {
        const card = document.getElementById('clients-online-card');
        if (!card) { clearInterval(_clientsPoll); _clientsPoll = null; return; }
        try {
            const data = await apiGet('/api/presence/clients');
            card.innerHTML = renderClientsOnlineCard(data);
        } catch (_) { /* ignora — próximo tick tenta de novo */ }
    }, 30000);
}

// ── Fim: Clientes online ─────────────────────────────────────────────────────

function setupNewsCarousel(container, updatesCount) {
    const scrollContainer = container.querySelector('.news-scroll-container');
    const dots = container.querySelectorAll('.news-dot');
    if (!scrollContainer || dots.length === 0) return;

    const updateActiveDot = () => {
        const width = scrollContainer.clientWidth;
        const scrollLeft = scrollContainer.scrollLeft;
        const activeIndex = Math.round(scrollLeft / (width || 1));
        
        dots.forEach((dot, idx) => {
            if (idx === activeIndex) dot.classList.add('active');
            else dot.classList.remove('active');
        });
    };

    let isScrolling;
    scrollContainer.addEventListener('scroll', () => {
        window.clearTimeout(isScrolling);
        isScrolling = setTimeout(updateActiveDot, 100);
    });

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const idx = parseInt(dot.getAttribute('data-idx'));
            const width = scrollContainer.clientWidth;
            
            scrollContainer.scrollTo({
                left: idx * (width + 16), // 16px é o gap (1rem)
                behavior: 'smooth'
            });
        });
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateActiveDot, 150);
    });
}

