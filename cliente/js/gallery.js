document.addEventListener('DOMContentLoaded', async () => {
    const state = {
        accessCode: null,
        sessionId: null,
        session: null,
        photos: [],
        selectedPhotos: [],
        isParticipant: false,
        participantId: null,
        isSelectionMode: false,
        pollingInterval: null,
    };

    const loginSection = document.getElementById('loginSection');
    const gallerySection = document.getElementById('gallerySection');
    const loginForm = document.getElementById('loginForm');
    const accessCodeInput = document.getElementById('accessCode');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');
    const photoGrid = document.getElementById('photoGrid');
    const selectionBar = document.getElementById('selectionInfo');
    const selectionCount = document.getElementById('selectionCount');
    const extraInfo = document.getElementById('extraInfo');
    const submitSelectionBtn = document.getElementById('submitBtn');
    const galleryHeader = document.getElementById('galleryHeader');
    const statusScreen = document.getElementById('statusScreen');

    // PWA Elements
    const pwaBanner = document.getElementById('pwaInstallBanner');
    const pwaInstallBtn = document.getElementById('pwaInstallBtn');
    const pwaDismissBtn = document.getElementById('pwaDismissBtn');
    const iosModal = document.getElementById('iosInstallModal');
    let deferredPrompt;

    // Elementos dinâmicos
    let commentModal = null;
    let currentCommentPhotoId = null;

    // --- IndexedDB Sync Queue ---
    function openSyncDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('fs-sync-queue', 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('requests')) {
                    db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function queueSyncRequest(url, method, headers, body) {
        const db = await openSyncDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('requests', 'readwrite');
            const store = tx.objectStore('requests');
            const req = store.add({ url, method, headers, body, ts: Date.now() });
            req.onsuccess = () => {
                if ('serviceWorker' in navigator && 'SyncManager' in window) {
                    navigator.serviceWorker.ready.then(reg => {
                        reg.sync.register('gallery-sync').catch(console.error);
                    });
                }
                resolve();
            };
            req.onerror = () => reject(req.error);
        });
    }

    // --- Offline Detection ---
    const offlineBadge = document.createElement('div');
    offlineBadge.style.cssText = 'display:none; position:fixed; top:0; left:50%; transform:translateX(-50%); background:#d97706; color:white; padding:0.5rem 1rem; border-bottom-left-radius:0.5rem; border-bottom-right-radius:0.5rem; z-index:9999; font-size:0.875rem; font-weight:bold; box-shadow:0 4px 6px rgba(0,0,0,0.1);';
    offlineBadge.innerHTML = '⚠️ Modo Offline — As alterações serão sincronizadas';
    document.body.appendChild(offlineBadge);

    function updateOnlineStatus() {
        if (navigator.onLine) {
            offlineBadge.style.display = 'none';
        } else {
            offlineBadge.style.display = 'block';
        }
    }
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // --- SW Message Listener ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SYNC_DONE') {
                const toast = document.createElement('div');
                toast.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#16a34a; color:white; padding:0.75rem 1.5rem; border-radius:0.5rem; font-weight:600; z-index:9999; box-shadow:0 4px 6px rgba(0,0,0,0.1); animation:fadeInUp 0.3s ease;';
                toast.innerText = `✓ ${event.data.count} ações sincronizadas!`;
                document.body.appendChild(toast);
                setTimeout(() => { toast.remove(); }, 4000);
                loadSessionData(true);
            }
        });
    }

    // Rastrear respostas do fotógrafo para notificar o cliente
    let knownAdminCommentKeys = new Set(); // "photoId:createdAt"
    let unreadReplies = []; // [{ photoId, text }]

    function updateClientBell() {
        const bell = document.getElementById('clientBellBtn');
        const badge = document.getElementById('clientBellBadge');
        if (!bell) return;
        if (unreadReplies.length > 0) {
            bell.style.display = 'block';
            if (badge) badge.textContent = unreadReplies.length > 9 ? '9+' : unreadReplies.length;
        } else {
            bell.style.display = 'none';
            if (badge) badge.textContent = '';
        }
    }

    // --- Funções de Utilidade ---
    function escapeHtml(str) {
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }

    function showLoading(button, text = 'Carregando...') {
        if (button) {
            button.dataset.originalText = button.textContent;
            button.textContent = text;
            button.disabled = true;
        }
    }

    function hideLoading(button) {
        if (button && button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            button.disabled = false;
        }
    }

    // --- Lógica da Marca D'água Avançada ---

    function createTiledWatermarkSvg(text, opacity, size) {
        const fontSize = { small: 14, medium: 20, large: 28 }[size] || 20;
        const safeText = escapeHtml(text);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="200">
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
                font-family="Arial, sans-serif" font-weight="bold" font-size="${fontSize}"
                fill="rgba(255,255,255,${opacity / 150})" transform="rotate(-30 125 100)">
                ${safeText}
            </text>
        </svg>`;
        return `url("data:image/svg+xml;base64,${btoa(svg)}")`;
    }

    // Retorna { style, innerHTML } para o elemento overlay do watermark
    function getWatermarkOverlay(watermark) {
        const hidden = { style: 'display:none;', innerHTML: '' };

        if (!watermark || state.session.selectionStatus === 'delivered') {
            return hidden;
        }

        const {
            watermarkType: type = 'text',
            watermarkText: text = '',
            watermarkOpacity: opacity = 15,
            watermarkPosition: position = 'center',
            watermarkSize: size = 'medium'
        } = watermark;

        const orgName = (state.session.organization && state.session.organization.name) || '';
        // logo já é uma URL relativa como /uploads/{orgId}/filename.jpg
        const logoUrl = (state.session.organization && state.session.organization.logo) || '';

        const baseStyle = `position:absolute; inset:0; pointer-events:none; opacity:${opacity / 100};`;

        if (position === 'tiled') {
            const bgStyle = type === 'logo' && logoUrl
                ? `background-image:url(${logoUrl}); background-size:${{ small: '100px', medium: '150px', large: '200px' }[size] || '150px'}; background-repeat:repeat; background-position:center;`
                : `background-image:${createTiledWatermarkSvg(text || orgName, opacity, size)};`;
            return { style: baseStyle + bgStyle, innerHTML: '' };
        }

        const justifyContent = position.includes('right') ? 'flex-end' : position.includes('left') ? 'flex-start' : 'center';
        const alignItems = position.includes('top') ? 'flex-start' : position.includes('bottom') ? 'flex-end' : 'center';
        const flexStyle = `display:flex; justify-content:${justifyContent}; align-items:${alignItems}; padding:1rem;`;

        if (type === 'logo' && logoUrl) {
            const imgSize = { small: '10%', medium: '20%', large: '30%' }[size] || '20%';
            return {
                style: baseStyle + flexStyle,
                innerHTML: `<img src="${logoUrl}" style="width:${imgSize}; height:auto; max-width:100%; max-height:100%;" alt="Watermark">`
            };
        }

        const fontSize = { small: '1rem', medium: '1.5rem', large: '2.2rem' }[size] || '1.5rem';
        return {
            style: baseStyle + flexStyle,
            innerHTML: `<span style="font-family:Arial,sans-serif; font-weight:bold; color:white; font-size:${fontSize}; text-shadow:0 0 2px black;">${escapeHtml(text || orgName)}</span>`
        };
    }

    // --- Renderização ---

    function renderHeader() {
        // Fallback seguro se organization não vier populado
        const orgName = (state.session.organization && state.session.organization.name) || '';
        const orgLogo = (state.session.organization && state.session.organization.logo) || null;

        // Atualiza logo na nav
        const navLogo = document.getElementById('navLogo');
        if (navLogo) {
            if (orgLogo) {
                navLogo.innerHTML = `<img src="${orgLogo}" alt="${escapeHtml(orgName)}" style="max-height:36px; max-width:140px;">`;
            } else if (orgName) {
                navLogo.innerHTML = `<span class="nav-logo">${escapeHtml(orgName)}</span>`;
            }
        }

        let logoHtml = '';
        if (orgLogo) {
            // orgLogo já é URL relativa completa: /uploads/{orgId}/filename.jpg
            logoHtml = `<img src="${orgLogo}" alt="${escapeHtml(orgName)}" style="max-height: 40px; max-width: 150px;">`;
        } else if (orgName) {
            logoHtml = `<h1 class="text-2xl font-bold">${escapeHtml(orgName)}</h1>`;
        }

        // Ocultar saudação personalizada
        const clientBadge = '';

        let deadlineHtml = '';
        if (state.session.selectionDeadline && state.session.selectionStatus !== 'submitted' && state.session.selectionStatus !== 'delivered') {
            const now = new Date();
            const deadline = new Date(state.session.selectionDeadline);
            if (deadline > now) {
                const diffTime = Math.abs(deadline - now);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                deadlineHtml = `<div class="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold ml-2">Prazo: ${diffDays} dia(s)</div>`;
            }
        }

        const isDelivered = state.session.selectionStatus === 'delivered';
        const isGalleryMode = state.session.mode === 'gallery';
        const downloadAllBtn = (isDelivered || isGalleryMode)
            ? `<a href="/api/client/download-all/${state.sessionId}?code=${encodeURIComponent(state.accessCode)}"
                  style="background:#16a34a; color:white; padding:0.4rem 0.875rem; border-radius:0.375rem; font-size:0.8125rem; font-weight:600; text-decoration:none; white-space:nowrap;"
                  download>
                  ⬇ Baixar Todas
               </a>`
            : '';

        galleryHeader.innerHTML = `
            <div class="container mx-auto flex justify-between items-center">
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    ${clientBadge}
                </div>
                <div class="flex items-center gap-3">
                    <h2 class="text-xl hidden sm:block">${escapeHtml(state.session.name)}</h2>
                    ${deadlineHtml}
                    ${downloadAllBtn}
                    <button id="clientBellBtn" title="Notificações"
                        style="position:relative; background:none; border:none; color:rgba(255,255,255,0.7); font-size:1.25rem; cursor:pointer; padding:0.25rem; line-height:1; display:none;">
                        🔔
                        <span id="clientBellBadge" style="position:absolute; top:-2px; right:-4px; background:#ef4444; color:white; font-size:0.55rem; font-weight:700; border-radius:9999px; min-width:16px; height:16px; display:flex; align-items:center; justify-content:center; padding:0 3px;"></span>
                    </button>
                    <button id="switchGalleryBtn"
                        style="background:none; border:1px solid #d1d5db; color:#374151; padding:0.4rem 0.8rem; border-radius:0.375rem; font-size:0.75rem; font-weight:500; cursor:pointer; white-space:nowrap; display:flex; align-items:center; gap:0.4rem; transition: all 0.2s;"
                        onmouseover="this.style.background='#f3f4f6'"
                        onmouseout="this.style.background='none'"
                        title="Sair da galeria">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Sair
                    </button>
                </div>
            </div>
        `;


        document.getElementById('switchGalleryBtn').addEventListener('click', () => {
            clearSessionFromStorage();
            gallerySection.style.display = 'none';
            statusScreen.style.display = 'none';
            loginSection.style.display = 'flex';
            if (accessCodeInput) accessCodeInput.value = '';
        });

        const clientBellBtn = document.getElementById('clientBellBtn');
        if (clientBellBtn) {
            clientBellBtn.addEventListener('click', () => {
                const first = unreadReplies[0];
                unreadReplies = [];
                updateClientBell();
                if (first) openCommentModal(first.photoId);
            });
        }
    }

    function renderPhotos() {
        if (!state.photos) return;

        const wm = getWatermarkOverlay(state.session.organization ? state.session.organization.watermark : null);

        photoGrid.innerHTML = state.photos.map(photo => {
            const isSelected = state.selectedPhotos.includes(photo.id);
            const hasComments = photo.comments && photo.comments.length > 0;

            return `
                <div class="photo-item" data-photo-id="${photo.id}">
                    <img src="${photo.url}" alt="Foto" class="object-cover w-full h-full rounded-md" loading="lazy">
                    <div style="${wm.style}">${wm.innerHTML}</div>
                    ${state.isSelectionMode ? `
                        <div style="position:absolute; top:0.5rem; right:0.5rem; display:flex; flex-direction:column; gap:0.375rem; z-index:10;">
                            <button class="photo-heart ${isSelected ? 'selected' : ''}" title="Selecionar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            </button>
                            ${state.session.commentsEnabled !== false ? `
                            <button class="photo-comment ${hasComments ? 'has-comments' : ''}" title="Comentários">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            </button>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        updateSelectionBar();
    }

    function updateSelectionBar() {
        const bottomBar = document.getElementById('bottomBar');
        if (!state.isSelectionMode) {
            if (selectionBar) selectionBar.style.display = 'none';
            if (bottomBar) bottomBar.style.display = 'none';
            return;
        }

        if (selectionBar) selectionBar.style.display = 'block';
        if (bottomBar) bottomBar.style.display = 'block';

        const count = state.selectedPhotos.length;
        const limit = state.session.packageLimit || 0;
        const extraPrice = state.session.extraPhotoPrice || 0;

        const selectedNum = document.getElementById('selectedNum');
        const limitNum = document.getElementById('limitNum');
        if (selectedNum) selectedNum.textContent = count;
        if (limitNum) limitNum.textContent = limit;

        const barCount = document.getElementById('barCount');
        const barLimit = document.getElementById('barLimit');
        const barExtra = document.getElementById('barExtra');
        if (barCount) barCount.textContent = count;
        if (barLimit) barLimit.textContent = limit;

        if (count > limit) {
            const extraCount = count - limit;
            const extraCost = extraCount * extraPrice;
            const extraText = `+${extraCount} fotos extras (R$ ${extraCost.toFixed(2).replace('.', ',')})`;
            if (extraInfo) {
                extraInfo.textContent = extraText;
                extraInfo.style.display = 'block';
            }
            if (barExtra) {
                barExtra.textContent = extraText;
                barExtra.style.display = 'block';
            }
        } else {
            if (extraInfo) extraInfo.style.display = 'none';
            if (barExtra) barExtra.style.display = 'none';
        }
    }

    function renderStatusScreen() {
        loginSection.style.display = 'none';
        gallerySection.style.display = 'none';
        statusScreen.style.display = 'flex';

        if (state.session.selectionStatus === 'submitted') {
            renderSubmittedScreen();
            return;
        }

        let title, message, buttonHtml = '';

        switch (state.session.selectionStatus) {
            case 'delivered': {
                const dAt = state.session.deliveredAt ? new Date(state.session.deliveredAt) : null;
                const dStr = dAt ? dAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;
                title = 'Fotos Entregues!';
                message = `Suas fotos estão prontas${dStr ? ` desde <strong>${dStr}</strong>` : ''}! Clique abaixo para visualizar e baixar suas fotos.`;
                buttonHtml = `<button id="viewDeliveredBtn" style="margin-top:1.25rem; background:#16a34a; color:white; border:none; padding:0.625rem 1.5rem; border-radius:0.5rem; font-size:0.875rem; font-weight:600; cursor:pointer;">⬇ Ver e baixar minhas fotos</button>`;
                break;
            }
            case 'expired':
                title = 'Prazo Encerrado';
                message = 'O prazo para seleção de fotos desta sessão expirou. Entre em contato com o fotógrafo para solicitar a reabertura.';
                buttonHtml = '';
                break;
            default:
                title = 'Aguardando...';
                message = 'Algo inesperado aconteceu. Por favor, contate o fotógrafo.';
        }

        statusScreen.innerHTML = `
            <div style="text-align:center;">
                <h2 class="status-title">${title}</h2>
                <p class="status-desc">${message}</p>
                ${buttonHtml}
                <button id="statusLogoutBtn" style="margin-top:1.5rem; background:none; border:1px solid #d1d5db; color:#4b5563; padding:0.5rem 1rem; border-radius:0.5rem; font-size:0.875rem; font-weight:500; cursor:pointer; display:inline-flex; align-items:center; gap:0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Sair da Galeria
                </button>
            </div>
        `;
        document.getElementById('statusLogoutBtn').addEventListener('click', () => {
            clearSessionFromStorage();
            statusScreen.style.display = 'none';
            loginSection.style.display = 'flex';
            if (accessCodeInput) accessCodeInput.value = '';
        });
    }

    // Estado local das extras (fotos marcadas para solicitar)
    let extraSelectedPhotos = [];

    function renderSubmittedScreen() {
        const extraRequest = state.session.extraRequest || { status: 'none', photos: [] };
        const extraPrice = state.session.extraPhotoPrice || 25;
        const selectedSet = new Set(state.selectedPhotos);
        const unselectedPhotos = (state.photos || []).filter(p => !selectedSet.has(p.id));

        // Banner de status da solicitação de extras
        let extraStatusBanner = '';
        if (extraRequest.paid) {
            extraStatusBanner = `<div style="background:#d1fae5; border:1px solid #16a34a; border-radius:0.5rem; padding:0.75rem 1rem; margin:1rem 0; color:#166534; font-size:0.875rem;">
                🎉 Pagamento recebido! Suas fotos extras foram adicionadas com sucesso.
            </div>`;
        } else if (extraRequest.status === 'pending') {
            extraStatusBanner = `<div style="background:#fef3c7; border:1px solid #d97706; border-radius:0.5rem; padding:0.75rem 1rem; margin:1rem 0; color:#92400e; font-size:0.875rem;">
                ⏳ Aguardando aprovação de <strong>${extraRequest.photos.length} foto(s)</strong> extra(s).
            </div>`;
        } else if (extraRequest.status === 'rejected') {
            extraStatusBanner = `<div style="background:#fee2e2; border:1px solid #dc2626; border-radius:0.5rem; padding:0.75rem 1rem; margin:1rem 0; color:#991b1b; font-size:0.875rem;">
                ❌ Ocorreu um problema com sua solicitação. Tente novamente ou contate o fotógrafo.
            </div>`;
        }

        // Grid de fotos não selecionadas (para solicitar extras)
        const canUpsell = state.session.allowExtraPurchasePostSubmit !== false;
        const canRequestExtras = canUpsell && extraRequest.status !== 'pending' && unselectedPhotos.length > 0;
        let extrasGridHtml = '';
        if (canRequestExtras) {
            extrasGridHtml = `
                <div style="margin-top:1.5rem; text-align:left;">
                    <p style="font-size:0.9375rem; font-weight:600; margin-bottom:0.5rem;">Quer mais fotos?</p>
                    <p style="font-size:0.8125rem; color:#666; margin-bottom:1rem;">Toque nas fotos abaixo para solicitar extras. Cada foto adicional custa <strong>R$ ${extraPrice.toFixed(2).replace('.', ',')}</strong>.</p>
                    <div id="extrasGrid" style="display:grid; grid-template-columns:repeat(3,1fr); gap:0.375rem; margin-bottom:1rem;"></div>
                    <div id="extraRequestBar" style="display:none; background:#1a1a1a; color:#fff; border-radius:0.5rem; padding:0.75rem 1rem; display:flex; align-items:center; justify-content:space-between; gap:1rem;">
                        <span id="extraRequestCount" style="font-size:0.875rem;"></span>
                        <button id="sendExtraRequestBtn" style="background:#2563eb; color:#fff; border:none; padding:0.5rem 1.25rem; border-radius:0.375rem; font-size:0.875rem; font-weight:600; cursor:pointer; white-space:nowrap;">Solicitar Extras</button>
                    </div>
                </div>
            `;
        }

        statusScreen.innerHTML = `
            <div style="width:100%; max-width:700px; margin:0 auto; padding:1.5rem 1rem;">
                <div style="text-align:center; margin-bottom:1rem;">
                    <h2 class="status-title">✅ Seleção Enviada!</h2>
                    <p class="status-desc">Sua seleção foi enviada com sucesso. O fotógrafo já foi notificado.</p>
                </div>
                ${extraStatusBanner}
                ${extrasGridHtml}
                ${(extraRequest.status !== 'pending' && state.session.allowReopen !== false) ? `
                <div style="text-align:center; margin-top:1.5rem; padding-top:1rem; border-top:1px solid #e5e5e5;">
                    <button id="reopenRequestBtn" style="background:none; border:1px solid #d1d5db; color:#aaa; padding:0.5rem 1rem; border-radius:0.5rem; font-size:0.75rem; cursor:pointer;">
                        Preciso alterar minha seleção
                    </button>
                </div>` : ''}
                <div style="text-align:center; margin-top:1rem;">
                    <button id="submittedLogoutBtn" style="background:none; border:none; color:#6b7280; font-size:0.875rem; font-weight:500; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; gap:0.4rem;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Sair da Galeria
                    </button>
                </div>
            </div>
        `;

        // Botão trocar galeria
        const submittedLogoutBtn = document.getElementById('submittedLogoutBtn');
        if (submittedLogoutBtn) {
            submittedLogoutBtn.addEventListener('click', () => {
                clearSessionFromStorage();
                statusScreen.style.display = 'none';
                loginSection.style.display = 'flex';
                if (accessCodeInput) accessCodeInput.value = '';
            });
        }

        // Renderizar grid de extras
        if (canRequestExtras) {
            extraSelectedPhotos = [];
            const extrasGrid = document.getElementById('extrasGrid');
            if (extrasGrid) {
                extrasGrid.innerHTML = unselectedPhotos.map(photo => `
                    <div data-extra-id="${photo.id}" style="position:relative; aspect-ratio:3/2; background:#e5e5e5; border-radius:0.25rem; overflow:hidden; cursor:pointer; border:2px solid transparent; transition:border-color 0.15s;">
                        <img src="${photo.url}" style="width:100%; height:100%; object-fit:cover; pointer-events:none;">
                        <div class="extra-check" style="display:none; position:absolute; top:0.25rem; right:0.25rem; width:22px; height:22px; background:#2563eb; border-radius:50%; align-items:center; justify-content:center; color:#fff; font-size:0.75rem;">✓</div>
                    </div>
                `).join('');

                extrasGrid.addEventListener('click', (e) => {
                    const item = e.target.closest('[data-extra-id]');
                    if (!item) return;
                    const id = item.dataset.extraId;
                    const check = item.querySelector('.extra-check');
                    const idx = extraSelectedPhotos.indexOf(id);
                    if (idx > -1) {
                        extraSelectedPhotos.splice(idx, 1);
                        item.style.borderColor = 'transparent';
                        if (check) check.style.display = 'none';
                    } else {
                        extraSelectedPhotos.push(id);
                        item.style.borderColor = '#2563eb';
                        if (check) check.style.display = 'flex';
                    }
                    const bar = document.getElementById('extraRequestBar');
                    const countEl = document.getElementById('extraRequestCount');
                    if (bar && countEl) {
                        if (extraSelectedPhotos.length > 0) {
                            const total = (extraSelectedPhotos.length * extraPrice).toFixed(2).replace('.', ',');
                            countEl.textContent = `${extraSelectedPhotos.length} foto(s) — R$ ${total}`;
                            bar.style.display = 'flex';
                        } else {
                            bar.style.display = 'none';
                        }
                    }
                });

                const sendBtn = document.getElementById('sendExtraRequestBtn');
                if (sendBtn) {
                    sendBtn.addEventListener('click', requestExtraPhotos);
                }
            }
        }
    }

    async function requestExtraPhotos() {
        if (!extraSelectedPhotos.length) return;
        const btn = document.getElementById('sendExtraRequestBtn');
        if (btn) { btn.disabled = true; btn.textContent = 'Enviando solicitação...'; }
        try {
            const res = await fetch(`/api/client/request-extra-photos/${state.sessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accessCode: state.accessCode,
                    photos: extraSelectedPhotos
                })
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error);

            alert('Solicitação de fotos extras enviada com sucesso!');
            await loadSessionData();

        } catch (err) {
            alert('Erro ao enviar solicitação: ' + err.message);
            if (btn) { btn.disabled = false; btn.textContent = 'Solicitar Extras'; }
        }
    }

    // --- Modal de Comentários ---

    function createCommentModal() {
        if (document.getElementById('commentModal')) return;

        const modalHtml = `
            <div id="commentModal" style="display:none; position:fixed; inset:0; z-index:50; align-items:center; justify-content:center;">
                <div style="position:absolute; inset:0; background:rgba(0,0,0,0.75);"></div>
                <div style="position:relative; background:white; border-radius:0.5rem; width:100%; max-width:32rem; margin:1rem; overflow:hidden; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);">
                    <div style="padding:1.5rem;">
                        <h3 style="font-size:1.125rem; font-weight:600; margin-bottom:1rem;">Comentários da Foto</h3>
                        <div id="commentsList" style="max-height:15rem; overflow-y:auto; margin-bottom:1rem;"></div>
                        <textarea id="newCommentText" rows="3" style="width:100%; border:1px solid #d1d5db; border-radius:0.375rem; padding:0.5rem; font-family:inherit;" placeholder="Escreva seu comentário..."></textarea>
                    </div>
                    <div style="background:#f9fafb; padding:0.75rem 1.5rem; display:flex; flex-direction:row-reverse; gap:0.5rem;">
                        <button type="button" id="saveCommentBtn" style="background:#2563eb; color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:600;">Enviar</button>
                        <button type="button" id="closeCommentBtn" style="background:white; color:#374151; border:1px solid #d1d5db; padding:0.5rem 1rem; border-radius:0.375rem; cursor:pointer;">Fechar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        commentModal = document.getElementById('commentModal');

        document.getElementById('closeCommentBtn').addEventListener('click', closeCommentModal);
        document.getElementById('saveCommentBtn').addEventListener('click', submitComment);
    }

    function openCommentModal(photoId) {
        createCommentModal();
        currentCommentPhotoId = photoId;
        const photo = state.photos.find(p => p.id === photoId);
        const commentsList = document.getElementById('commentsList');
        const textarea = document.getElementById('newCommentText');

        textarea.value = '';
        commentsList.innerHTML = '';

        if (photo && photo.comments && photo.comments.length > 0) {
            photo.comments.forEach(comment => {
                const isClient = comment.author === 'client';
                const date = new Date(comment.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                commentsList.innerHTML += `
                    <div style="margin-bottom:0.75rem; text-align:left; padding:0.5rem; border-radius:0.25rem; ${isClient ? 'background:#eff6ff;' : 'background:#f3f4f6;'}">
                        <p style="font-size:0.75rem; font-weight:bold; ${isClient ? 'color:#1d4ed8;' : 'color:#374151;'}">${isClient ? 'Você' : 'Fotógrafo'} <span style="font-weight:normal; color:#9ca3af; margin-left:0.25rem;">${date}</span></p>
                        <p style="font-size:0.875rem; color:#1f2937; margin-top:0.25rem;">${escapeHtml(comment.text)}</p>
                    </div>
                `;
            });
        } else {
            commentsList.innerHTML = '<p style="font-size:0.875rem; color:#6b7280; font-style:italic;">Nenhum comentário ainda.</p>';
        }

        commentModal.style.display = 'flex';
    }

    function closeCommentModal() {
        if (commentModal) commentModal.style.display = 'none';
        currentCommentPhotoId = null;
    }

    async function submitComment() {
        const text = document.getElementById('newCommentText').value.trim();
        if (!text) return;

        const btn = document.getElementById('saveCommentBtn');
        showLoading(btn, 'Enviando...');

        try {
            const url = `/api/client/comments/${state.sessionId}`;
            const headers = { 'Content-Type': 'application/json' };
            const body = JSON.stringify({
                accessCode: state.accessCode,
                photoId: currentCommentPhotoId,
                text: text
            });

            if (!navigator.onLine) {
                await queueSyncRequest(url, 'POST', headers, body);

                // Atualiza localmente otimista
                const photo = state.photos.find(p => p.id === currentCommentPhotoId);
                if (photo) {
                    if (!photo.comments) photo.comments = [];
                    photo.comments.push({ author: 'client', text, createdAt: new Date() });
                }

                openCommentModal(currentCommentPhotoId);
                renderPhotos();
                hideLoading(btn);
                return;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body,
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            // Atualiza localmente
            const photo = state.photos.find(p => p.id === currentCommentPhotoId);
            if (photo) {
                if (!photo.comments) photo.comments = [];
                photo.comments.push(result.comment);
            }

            // Re-renderiza modal e grid (para mostrar indicador)
            openCommentModal(currentCommentPhotoId);
            renderPhotos();

        } catch (error) {
            alert('Erro ao enviar comentário: ' + error.message);
        } finally {
            hideLoading(btn);
        }
    }

    // --- Lógica da API e Ações ---

    // --- Auto-login com localStorage ---

    const LS_KEY = 'fs_gallery_session';

    function saveSessionToStorage() {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify({
                accessCode: state.accessCode,
                sessionId: state.sessionId,
                isParticipant: state.isParticipant,
                participantId: state.participantId,
            }));
        } catch (e) { }
    }

    function clearSessionFromStorage() {
        try { localStorage.removeItem(LS_KEY); } catch (e) { }
    }

    async function tryAutoLogin() {
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (!saved) return false;
            const { accessCode, sessionId, isParticipant, participantId } = JSON.parse(saved);
            if (!accessCode || !sessionId) return false;

            state.accessCode = accessCode;
            state.sessionId = sessionId;
            state.isParticipant = isParticipant || false;
            state.participantId = participantId || null;

            // Tenta carregar a sessão — se falhar (código expirado), limpa o storage
            await loadSessionData();
            return true;
        } catch (e) {
            clearSessionFromStorage();
            return false;
        }
    }

    async function handleLogin(e) {
        if (e) e.preventDefault();
        const code = accessCodeInput.value.trim();
        if (!code) {
            errorMessage.textContent = 'Por favor, insira o código de acesso.';
            return;
        }

        showLoading(loginBtn);
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';

        try {
            const response = await fetch('/api/client/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessCode: code }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Código de acesso inválido.');
            }

            state.accessCode = code;
            state.sessionId = result.sessionId;
            state.isParticipant = result.isParticipant || false;
            state.participantId = result.participantId || null;
            // Dados do cliente CRM (se vinculado)
            state._clientDataFromLogin = result.clientData || null;

            saveSessionToStorage();
            await loadSessionData();

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        } finally {
            hideLoading(loginBtn);
        }
    }

    function renderDeliveredScreen() {
        renderHeader();

        const selectedSet = new Set(state.selectedPhotos);
        const selectedPhotos = state.photos.filter(p => selectedSet.has(p.id));
        const unselectedPhotos = state.photos.filter(p => !selectedSet.has(p.id));

        const deliveredAt = state.session.deliveredAt ? new Date(state.session.deliveredAt) : null;
        const deliveredDateStr = deliveredAt
            ? deliveredAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
            : null;

        const canUpsell = state.session.allowExtraPurchasePostSubmit !== false;
        const extraRequest = state.session.extraRequest || { status: 'none', photos: [] };
        const extraPrice = state.session.extraPhotoPrice || 25;
        const hasExtras = canUpsell && unselectedPhotos.length > 0 && extraRequest.status !== 'pending';

        const buildPhotoItem = (photo) => `
            <div class="photo-item" data-photo-id="${photo.id}">
                <img src="${photo.url}" alt="Foto" class="object-cover w-full h-full rounded-md" loading="lazy">
                <a href="/api/client/download/${state.sessionId}/${photo.id}?code=${encodeURIComponent(state.accessCode)}"
                   class="photo-download-overlay"
                   style="position:absolute; inset:0; display:flex; align-items:flex-end; justify-content:center; padding-bottom:0.5rem; opacity:0; transition:opacity 0.2s; text-decoration:none;"
                   download title="Baixar esta foto">
                    <span style="background:rgba(0,0,0,0.7); color:white; font-size:0.625rem; padding:0.25rem 0.625rem; border-radius:0.25rem;">⬇ Baixar</span>
                </a>
            </div>
        `;

        const infoBanner = `
            <div style="grid-column:1/-1; background:#d1fae5; border:1px solid #16a34a; border-radius:0.5rem; padding:0.75rem 1rem; margin-bottom:0.75rem; font-size:0.875rem; color:#166534; text-align:center;">
                ✅ <strong>${selectedPhotos.length} foto(s)</strong> prontas para download${deliveredDateStr ? ` · disponíveis desde <strong>${deliveredDateStr}</strong>` : ''}.
                Use o botão <strong>⬇ Baixar Todas</strong> no topo ou passe o mouse sobre cada foto para baixar individualmente.
            </div>
        `;

        let extraStatusBanner = '';
        if (extraRequest.paid) {
            extraStatusBanner = `<div style="grid-column:1/-1; background:#d1fae5; border:1px solid #16a34a; border-radius:0.5rem; padding:0.75rem 1rem; margin:0.75rem 0; color:#166534; font-size:0.875rem;">
                🎉 Pagamento recebido! Suas fotos extras foram adicionadas com sucesso.
            </div>`;
        } else if (extraRequest.status === 'pending') {
            extraStatusBanner = `<div style="grid-column:1/-1; background:#fef3c7; border:1px solid #d97706; border-radius:0.5rem; padding:0.75rem 1rem; margin:0.75rem 0; color:#92400e; font-size:0.875rem;">
                ⏳ Aguardando aprovação de <strong>${extraRequest.photos.length} foto(s)</strong> extra(s).
            </div>`;
        }

        let extrasSection = '';
        if (hasExtras) {
            const extrasGrid = unselectedPhotos.map(photo => `
                <div class="photo-item extra-item" data-extra-id="${photo.id}" style="cursor:pointer; opacity:0.75;">
                    <img src="${photo.url}" alt="Foto extra" class="object-cover w-full h-full rounded-md" loading="lazy">
                    <div class="extra-overlay" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.25); transition:background 0.2s;">
                        <span class="extra-icon" style="background:rgba(255,255,255,0.15); border:2px solid rgba(255,255,255,0.5); border-radius:9999px; width:2rem; height:2rem; display:flex; align-items:center; justify-content:center; font-size:1rem; color:white;">+</span>
                    </div>
                </div>
            `).join('');
            extrasSection = `
                <div style="grid-column:1/-1; margin-top:2rem; padding-top:1.25rem; border-top:1px solid #e5e7eb;">
                    <p style="font-size:0.9375rem; font-weight:600; margin-bottom:0.25rem; color:#111;">Quer mais fotos?</p>
                    <p style="font-size:0.8125rem; color:#6b7280; margin-bottom:0.75rem;">Toque nas fotos abaixo para solicitar extras. Cada foto adicional custa <strong>R$ ${extraPrice.toFixed(2).replace('.', ',')}</strong>.</p>
                </div>
                ${extrasGrid}
                <div id="extrasRequestBar" style="grid-column:1/-1; display:none; background:#1a1a1a; color:#fff; border-radius:0.5rem; padding:0.75rem 1rem; align-items:center; justify-content:space-between; gap:1rem; margin-top:0.5rem;">
                    <span id="extrasRequestCount" style="font-size:0.875rem;"></span>
                    <button id="extrasPayBtn" style="background:#2563eb; color:#fff; border:none; padding:0.5rem 1.25rem; border-radius:0.375rem; font-size:0.875rem; font-weight:600; cursor:pointer; white-space:nowrap;">Solicitar Extras</button>
                </div>
            `;
        }

        photoGrid.innerHTML = infoBanner + extraStatusBanner + selectedPhotos.map(buildPhotoItem).join('') + extrasSection;

        // Hover para mostrar botão de download individual
        photoGrid.querySelectorAll('.photo-download-overlay').forEach(overlay => {
            const parent = overlay.parentElement;
            parent.addEventListener('mouseenter', () => { overlay.style.opacity = '1'; });
            parent.addEventListener('mouseleave', () => { overlay.style.opacity = '0'; });
        });

        // Interação com fotos extras
        if (hasExtras) {
            extraSelectedPhotos = [];
            const bar = document.getElementById('extrasRequestBar');
            const countEl = document.getElementById('extrasRequestCount');
            const payBtn = document.getElementById('extrasPayBtn');

            const updateExtrasBar = () => {
                if (!bar) return;
                if (extraSelectedPhotos.length > 0) {
                    const total = (extraSelectedPhotos.length * extraPrice).toFixed(2).replace('.', ',');
                    if (countEl) countEl.textContent = `${extraSelectedPhotos.length} foto(s) · R$ ${total}`;
                    bar.style.display = 'flex';
                } else {
                    bar.style.display = 'none';
                }
            };

            photoGrid.querySelectorAll('.extra-item').forEach(item => {
                item.addEventListener('click', () => {
                    const id = item.dataset.extraId;
                    const idx = extraSelectedPhotos.indexOf(id);
                    const icon = item.querySelector('.extra-icon');
                    const overlay = item.querySelector('.extra-overlay');
                    if (idx >= 0) {
                        extraSelectedPhotos.splice(idx, 1);
                        item.style.opacity = '0.75';
                        if (icon) { icon.textContent = '+'; icon.style.background = 'rgba(255,255,255,0.15)'; icon.style.borderColor = 'rgba(255,255,255,0.5)'; }
                        if (overlay) overlay.style.background = 'rgba(0,0,0,0.25)';
                    } else {
                        extraSelectedPhotos.push(id);
                        item.style.opacity = '1';
                        if (icon) { icon.textContent = '✓'; icon.style.background = 'rgba(22,163,74,0.8)'; icon.style.borderColor = '#16a34a'; }
                        if (overlay) overlay.style.background = 'rgba(22,163,74,0.2)';
                    }
                    updateExtrasBar();
                });
            });

            if (payBtn) {
                payBtn.addEventListener('click', async () => {
                    if (!extraSelectedPhotos.length) return;
                    payBtn.disabled = true;
                    payBtn.textContent = 'Aguarde...';
                    try {
                        const resp = await fetch(`/api/client/request-extra-photos/${state.sessionId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ accessCode: state.accessCode, photos: extraSelectedPhotos })
                        });
                        const data = await resp.json();
                        if (data.success) {
                            alert('Solicitação de fotos extras enviada com sucesso!');
                            await loadSessionData();
                        } else {
                            alert(data.error || 'Erro ao processar solicitação.');
                            payBtn.disabled = false;
                            payBtn.textContent = 'Solicitar Extras';
                        }
                    } catch (e) {
                        alert('Erro de conexão. Tente novamente.');
                        payBtn.disabled = false;
                        payBtn.textContent = 'Solicitar Extras';
                    }
                });
            }
        }

        gallerySection.style.display = 'block';
        selectionBar.style.display = 'none';
        const bottomBar = document.getElementById('bottomBar');
        if (bottomBar) bottomBar.style.display = 'none';
        statusScreen.style.display = 'none';
    }

    async function loadSessionData(isPolling = false) {
        try {
            let url = `/api/client/photos/${state.sessionId}?code=${state.accessCode}`;
            if (state.isParticipant && state.participantId) {
                url += `&participantId=${state.participantId}`;
            }
            const response = await fetch(url);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Não foi possível carregar a galeria.');
            }

            const previousStatus = state.session ? state.session.selectionStatus : null;
            // Preservar clientData do login (verify-code) pois photos não retorna esse campo
            const savedClientData = (state.session && state.session.clientData) || state._clientDataFromLogin || null;
            state.session = result;
            state.session.clientData = savedClientData;
            state.photos = result.photos;
            state.selectedPhotos = result.selectedPhotos || [];
            state.isSelectionMode = result.mode === 'selection' && result.selectionStatus !== 'delivered';

            // Atualiza texto do botão selecionar tudo
            const selectAllBtn = document.getElementById('selectAllBtn');
            if (selectAllBtn) {
                const allSelected = state.photos.length > 0 && state.photos.every(p => state.selectedPhotos.includes(p.id));
                selectAllBtn.textContent = allSelected ? 'Desmarcar Tudo' : 'Selecionar Tudo';
            }

            // Detectar novas respostas do fotógrafo nos comentários
            if (isPolling) {
                const newReplies = [];
                for (const photo of (result.photos || [])) {
                    for (const c of (photo.comments || [])) {
                        if (c.author === 'admin') {
                            const key = `${photo.id}:${c.createdAt}`;
                            if (!knownAdminCommentKeys.has(key)) {
                                knownAdminCommentKeys.add(key);
                                newReplies.push({ photoId: photo.id, text: c.text });
                            }
                        }
                    }
                }
                if (newReplies.length > 0) {
                    unreadReplies.push(...newReplies);
                    updateClientBell();
                }
            } else {
                // Na primeira carga, apenas registrar os existentes sem notificar
                for (const photo of (result.photos || [])) {
                    for (const c of (photo.comments || [])) {
                        if (c.author === 'admin') {
                            knownAdminCommentKeys.add(`${photo.id}:${c.createdAt}`);
                        }
                    }
                }
            }

            if (!isPolling) {
                initializeGallery();
            } else {
                // Se o status mudou, recarrega a galeria
                if (previousStatus !== state.session.selectionStatus) {
                    initializeGallery();
                }
            }

        } catch (error) {
            if (!isPolling) {
                errorMessage.textContent = error.message;
                errorMessage.style.display = 'block';
            }
            console.error("Polling error:", error);
        }
    }

    function initializeGallery() {
        try {
            // Verificar prazo
            const now = new Date();
            const deadline = state.session.selectionDeadline ? new Date(state.session.selectionDeadline) : null;
            const isExpired = deadline && now > deadline;

            if (isExpired && state.session.selectionStatus !== 'submitted' && state.session.selectionStatus !== 'delivered') {
                state.session.selectionStatus = 'expired'; // Forçar status visualmente
                renderStatusScreen();
                gallerySection.style.display = 'none';
                loginSection.style.display = 'none';
                return;
            }

            if (state.session.selectionStatus === 'delivered') {
                // Tela de download: exibe apenas fotos selecionadas + seção de extras
                renderDeliveredScreen();
            } else if (state.session.selectionStatus === 'submitted') {
                renderStatusScreen();
                gallerySection.style.display = 'none';
            } else {
                renderHeader();
                renderPhotos();
                gallerySection.style.display = 'block';
                statusScreen.style.display = 'none';
            }
            loginSection.style.display = 'none';
            setupPWA();

        } catch (error) {
            console.error("Erro ao inicializar a galeria:", error);
            alert("Ocorreu um erro ao carregar a galeria. Por favor, recarregue a página e tente novamente.");
            loginSection.style.display = 'block';
            gallerySection.style.display = 'none';
        }

        startPolling();
    }

    async function togglePhotoSelection(photoId) {
        if (state.session.selectionStatus === 'delivered') return;
        const isSelected = state.selectedPhotos.includes(photoId);
        const photoCard = photoGrid.querySelector(`[data-photo-id="${photoId}"]`);
        const selectBtn = photoCard.querySelector('.photo-heart');

        // Optimistic UI
        if (isSelected) {
            state.selectedPhotos = state.selectedPhotos.filter(id => id !== photoId);
            selectBtn.classList.remove('selected');
        } else {
            state.selectedPhotos.push(photoId);
            selectBtn.classList.add('selected');
        }
        updateSelectionBar();

        const payload = { accessCode: state.accessCode, photoId };
        if (state.isParticipant) {
            payload.participantId = state.participantId;
        }

        const url = `/api/client/select/${state.sessionId}`;
        const headers = { 'Content-Type': 'application/json' };
        const body = JSON.stringify(payload);

        if (!navigator.onLine) {
            await queueSyncRequest(url, 'PUT', headers, body);
            return;
        }

        try {
            await fetch(url, {
                method: 'PUT',
                headers,
                body,
            });
        } catch (error) {
            // Revert UI on error
            alert('Erro ao salvar seleção. Tente novamente.');
            if (isSelected) {
                state.selectedPhotos.push(photoId);
                selectBtn.classList.add('selected');
            } else {
                state.selectedPhotos = state.selectedPhotos.filter(id => id !== photoId);
                selectBtn.classList.remove('selected');
            }
            updateSelectionBar();
        }
    }

    async function submitSelection() {
        const limit = state.session.packageLimit || 0;
        const count = state.selectedPhotos.length;

        if (count < limit) {
            alert(`Ops! Você selecionou ${count} foto(s), mas o seu pacote inclui ${limit} foto(s). \n\nPor favor, selecione pelo menos ${limit} fotos para concluir o envio da sua seleção.`);
            return;
        }

        if (!confirm('Tem certeza que deseja finalizar sua seleção? Após o envio, não será possível fazer alterações sem solicitar ao fotógrafo.')) {
            return;
        }

        showLoading(submitSelectionBtn, 'Enviando...');

        const payload = { accessCode: state.accessCode };
        if (state.isParticipant) {
            payload.participantId = state.participantId;
        }

        try {
            const response = await fetch(`/api/client/submit-selection/${state.sessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            state.session.selectionStatus = 'submitted';
            renderStatusScreen();

        } catch (error) {
            alert('Erro ao enviar seleção: ' + error.message);
        } finally {
            hideLoading(submitSelectionBtn);
        }
    }

    async function toggleSelectAll() {
        if (!state.isSelectionMode || !state.photos.length) return;

        const allSelected = state.photos.every(p => state.selectedPhotos.includes(p.id));

        if (allSelected) {
            // Desmarcar tudo
            state.selectedPhotos = [];
        } else {
            // Selecionar tudo
            state.selectedPhotos = state.photos.map(p => p.id);
        }

        renderPhotos();

        // Atualiza no servidor
        try {
            const url = `/api/client/selection/${state.sessionId}`;
            const headers = { 'Content-Type': 'application/json' };
            const body = JSON.stringify({
                accessCode: state.accessCode,
                selectedPhotos: state.selectedPhotos
            });

            if (!navigator.onLine) {
                await queueSyncRequest(url, 'POST', headers, body);
                return;
            }

            await fetch(url, {
                method: 'POST',
                headers,
                body
            });
        } catch (e) {
            console.error('Erro ao sincronizar seleção total:', e);
        }
    }

    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', toggleSelectAll);
    }

    // --- Modal de Reabertura ---

    function createReopenModal() {
        if (document.getElementById('reopenModal')) return;

        const modalHtml = `
            <div id="reopenModal" style="display:none; position:fixed; inset:0; z-index:50; align-items:center; justify-content:center; padding:1rem;">
                <div style="position:absolute; inset:0; background:rgba(0,0,0,0.75);"></div>
                <div style="position:relative; background:white; border-radius:1rem; width:100%; max-width:28rem; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
                    <div style="padding:2rem; text-align:center;">
                        <div style="width:56px; height:56px; background:#eff6ff; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 1.5rem; color:#2563eb;">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </div>
                        <h3 style="font-size:1.25rem; font-weight:700; color:#111827; margin-bottom:0.75rem;">Solicitar Alteração</h3>
                        <div style="background:#fff7ed; border:1px solid #ffedd5; border-radius:0.5rem; padding:1rem; margin-bottom:1.5rem; text-align:left;">
                            <p style="font-size:0.875rem; color:#9a3412; line-height:1.5;">
                                <strong>Como funciona:</strong><br>
                                Ao clicar em enviar, o fotógrafo receberá seu pedido de reabertura. Assim que ele aprovar, sua galeria voltará ao modo de seleção e você poderá trocar suas fotos.
                            </p>
                        </div>
                        <p style="font-size:0.9375rem; color:#6b7280; margin-bottom:2rem;">Deseja enviar o pedido de reabertura agora?</p>
                        
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                            <button id="cancelReopenBtn" style="width:100%; padding:0.875rem; background:#f3f4f6; color:#374151; border:none; border-radius:0.5rem; font-weight:600; cursor:pointer;">Cancelar</button>
                            <button id="confirmReopenBtn" style="width:100%; padding:0.875rem; background:#2563eb; color:white; border:none; border-radius:0.5rem; font-weight:600; cursor:pointer;">Enviar Pedido</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('reopenModal');
        document.getElementById('cancelReopenBtn').addEventListener('click', () => modal.style.display = 'none');
        document.getElementById('confirmReopenBtn').addEventListener('click', () => {
            modal.style.display = 'none';
            requestReopen();
        });
    }

    function openReopenModal() {
        createReopenModal();
        document.getElementById('reopenModal').style.display = 'flex';
    }

    async function requestReopen() {
        const btn = document.getElementById('reopenRequestBtn');
        if (btn) showLoading(btn, 'Enviando pedido...');

        try {
            const response = await fetch(`/api/client/request-reopen/${state.sessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessCode: state.accessCode }),
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            alert('Seu pedido de reabertura foi enviado ao fotógrafo!');
            if (btn) {
                btn.textContent = 'Pedido Enviado';
                btn.disabled = true;
                btn.style.opacity = '0.5';
            }

        } catch (error) {
            alert('Erro ao solicitar reabertura: ' + error.message);
            if (btn) hideLoading(btn);
        }
    }

    // --- PWA Logic ---
    function setupPWA() {
        // 1. Atualizar Manifest Dinâmico
        const manifestLink = document.getElementById('manifestLink');
        if (manifestLink && state.session) {
            manifestLink.href = `/api/client/manifest/${state.sessionId}?code=${encodeURIComponent(state.accessCode)}`;
        }

        // 2. Atualizar Theme Color
        const themeColorMeta = document.getElementById('themeColorMeta');
        if (themeColorMeta && state.session && state.session.organization && state.session.organization.primaryColor) {
            themeColorMeta.content = state.session.organization.primaryColor;
        }

        // 3. Registrar Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/cliente/sw.js')
                .then(reg => console.log('SW registrado'))
                .catch(err => console.error('Erro SW:', err));
        }

        // 4. Detectar iOS para mostrar instrução manual
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

        if (isIos && !isStandalone && !localStorage.getItem('pwaDismissed')) {
            if (pwaBanner) {
                pwaBanner.style.display = 'flex';
                if (pwaInstallBtn) {
                    pwaInstallBtn.onclick = () => {
                        if (iosModal) iosModal.style.display = 'flex';
                        pwaBanner.style.display = 'none';
                    };
                }
            }
        }
    }

    // --- Polling ---
    function startPolling() {
        if (state.pollingInterval) {
            clearInterval(state.pollingInterval);
        }
        // Poll only if the selection is not delivered yet
        if (state.session.selectionStatus !== 'delivered') {
            state.pollingInterval = setInterval(() => loadSessionData(true), 15000);
        }
    }

    // --- Event Listeners ---
    // --- Lightbox ---

    let lightboxIndex = 0;
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCounter = document.getElementById('lightboxCounter');
    const lightboxHeart = document.getElementById('lightboxHeart');
    const lightboxWatermark = document.getElementById('lightboxWatermark');

    function openLightbox(index) {
        lightboxIndex = index;
        renderLightbox();
        lightbox.classList.add('active');
    }

    function renderLightbox() {
        const photo = state.photos[lightboxIndex];
        if (!photo) return;

        lightboxImg.src = photo.url;
        lightboxCounter.textContent = `${lightboxIndex + 1} / ${state.photos.length}`;

        // Watermark customizado no lightbox
        if (lightboxWatermark) {
            const wm = getWatermarkOverlay(state.session.organization ? state.session.organization.watermark : null);
            lightboxWatermark.style.cssText = wm.style;
            lightboxWatermark.innerHTML = wm.innerHTML;
        }

        // Botão de seleção
        if (lightboxHeart) {
            lightboxHeart.style.display = state.isSelectionMode ? 'flex' : 'none';
            lightboxHeart.classList.toggle('selected', state.selectedPhotos.includes(photo.id));
        }

    }

    window.closeLightbox = function () {
        lightbox.classList.remove('active');
    };

    window.lightboxNav = function (dir) {
        lightboxIndex = (lightboxIndex + dir + state.photos.length) % state.photos.length;
        renderLightbox();
    };

    window.toggleLightboxHeart = function () {
        const photo = state.photos[lightboxIndex];
        if (!photo) return;
        togglePhotoSelection(photo.id);
        lightboxHeart.classList.toggle('selected', state.selectedPhotos.includes(photo.id));
    };

    // Swipe no lightbox
    let touchStartX = 0;
    lightbox.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener('touchend', (e) => {
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) lightboxNav(diff > 0 ? 1 : -1);
    });

    // Fechar lightbox clicando no fundo
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    // --- Event Listeners ---

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (!localStorage.getItem('pwaDismissed') && pwaBanner) {
            pwaBanner.style.display = 'flex';
        }
    });

    if (pwaInstallBtn) {
        pwaInstallBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                deferredPrompt = null;
                pwaBanner.style.display = 'none';
            }
        });
    }

    if (pwaDismissBtn) {
        pwaDismissBtn.addEventListener('click', () => {
            if (pwaBanner) pwaBanner.style.display = 'none';
            localStorage.setItem('pwaDismissed', 'true');
        });
    }

    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    // Preencher codigo automaticamente via URL (?code=XXXX) — link do email
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    const paymentStatus = urlParams.get('payment');

    if (paymentStatus === 'success') {
        alert('🎉 Pagamento confirmado! Suas fotos extras foram liberadas.');
    } else if (paymentStatus === 'failed') {
        alert('❌ Houve um problema com o pagamento. Tente novamente.');
    }

    if (codeFromUrl && accessCodeInput) {
        accessCodeInput.value = codeFromUrl;
        // Limpar da URL sem recarregar (UX mais limpa)
        const cleanUrl = window.location.pathname + (codeFromUrl ? `?code=${codeFromUrl}` : '');
        window.history.replaceState(null, '', cleanUrl);
    }

    // Auto-login: tentar restaurar sessão salva no localStorage; se vier código da URL, logar direto
    const autoLogged = await tryAutoLogin();
    if (!autoLogged && codeFromUrl) {
        // Login automático com o código recebido por email
        await handleLogin(null);
    }

    photoGrid.addEventListener('click', (e) => {
        const selectBtn = e.target.closest('.photo-heart');
        if (selectBtn) {
            const photoId = e.target.closest('[data-photo-id]').dataset.photoId;
            togglePhotoSelection(photoId);
            return;
        }
        const commentBtn = e.target.closest('.photo-comment');
        if (commentBtn) {
            const photoId = e.target.closest('[data-photo-id]').dataset.photoId;
            openCommentModal(photoId);
            return;
        }
        // Clique na foto abre lightbox
        const photoItem = e.target.closest('[data-photo-id]');
        if (photoItem) {
            const photoId = photoItem.dataset.photoId;
            const index = state.photos.findIndex(p => p.id === photoId);
            if (index > -1) openLightbox(index);
        }
    });

    submitSelectionBtn.addEventListener('click', submitSelection);

    const saveSelectionBtn = document.getElementById('saveSelectionBtn');
    if (saveSelectionBtn) {
        saveSelectionBtn.addEventListener('click', () => {
            saveSelectionBtn.textContent = '✓ Seleção salva!';
            saveSelectionBtn.style.background = '#16a34a';
            setTimeout(() => {
                saveSelectionBtn.textContent = '💾 Salvo';
                saveSelectionBtn.style.background = '#4b5563';
            }, 2000);
        });
    }

    statusScreen.addEventListener('click', (e) => {
        if (e.target.id === 'reopenRequestBtn') {
            openReopenModal();
        }
        if (e.target.id === 'viewDeliveredBtn') {
            initializeGallery();
        }
    });

});
