document.addEventListener('DOMContentLoaded', () => {
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

    // --- Funções de Utilidade ---
    function escapeHtml(str) {
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }

    function showLoading(button, text = 'Carregando...') {
        if(button) {
            button.dataset.originalText = button.textContent;
            button.textContent = text;
            button.disabled = true;
        }
    }

    function hideLoading(button) {
        if(button && button.dataset.originalText) {
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

        const orgName = (state.session.organization && state.session.organization.name) || 'FS FOTOGRAFIAS';
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
        const orgName = (state.session.organization && state.session.organization.name) || 'FS FOTOGRAFIAS';
        const orgLogo = (state.session.organization && state.session.organization.logo) || null;

        let logoHtml = '';
        if (orgLogo) {
            // orgLogo já é URL relativa completa: /uploads/{orgId}/filename.jpg
            logoHtml = `<img src="${orgLogo}" alt="${escapeHtml(orgName)}" style="max-height: 40px; max-width: 150px;">`;
        } else {
            logoHtml = `<h1 class="text-2xl font-bold">${escapeHtml(orgName)}</h1>`;
        }

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
        const downloadAllBtn = isDelivered
            ? `<a href="/api/client/download-all/${state.sessionId}?code=${encodeURIComponent(state.accessCode)}"
                  style="background:#16a34a; color:white; padding:0.4rem 0.875rem; border-radius:0.375rem; font-size:0.8125rem; font-weight:600; text-decoration:none; white-space:nowrap;"
                  download>
                  ⬇ Baixar Todas
               </a>`
            : '';

        galleryHeader.innerHTML = `
            <div class="container mx-auto flex justify-between items-center">
                ${logoHtml}
                <div class="flex items-center gap-3">
                    <h2 class="text-xl hidden sm:block">${escapeHtml(state.session.name)}</h2>
                    ${deadlineHtml}
                    ${downloadAllBtn}
                </div>
            </div>
        `;
    }

    function renderPhotos() {
        if (!state.photos) return;

        const wm = getWatermarkOverlay(state.session.organization ? state.session.organization.watermark : null);

        const isDelivered = state.session.selectionStatus === 'delivered';

        photoGrid.innerHTML = state.photos.map(photo => {
            const isSelected = state.selectedPhotos.includes(photo.id);
            const hasComments = photo.comments && photo.comments.length > 0;

            const downloadBtn = isDelivered
                ? `<a href="/api/client/download/${state.sessionId}/${photo.id}?code=${encodeURIComponent(state.accessCode)}"
                      style="display:flex; align-items:center; justify-content:center; width:2rem; height:2rem; background:rgba(22,163,74,0.9); border-radius:9999px; color:white; text-decoration:none; font-size:1rem;"
                      title="Download" download>⬇</a>`
                : '';

            return `
                <div class="photo-item" data-photo-id="${photo.id}">
                    <img src="${photo.url}" alt="Foto" class="object-cover w-full h-full rounded-md" loading="lazy">
                    <div style="${wm.style}">${wm.innerHTML}</div>
                    ${(state.isSelectionMode || isDelivered) ? `
                        <div style="position:absolute; top:0.5rem; right:0.5rem; display:flex; gap:0.5rem; z-index:10;">
                            ${state.isSelectionMode ? `
                                <button class="photo-comment ${hasComments ? 'has-comments' : ''}" title="Comentários">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                </button>
                                <button class="photo-heart ${isSelected ? 'selected' : ''}" title="Selecionar">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                </button>
                            ` : ''}
                            ${downloadBtn}
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
        if(barCount) barCount.textContent = count;
        if(barLimit) barLimit.textContent = limit;

        if (count > limit) {
            const extraCount = count - limit;
            const extraCost = extraCount * extraPrice;
            const extraText = `+${extraCount} fotos extras (R$ ${extraCost.toFixed(2).replace('.',',')})`;
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

        let title, message, buttonHtml = '';

        switch (state.session.selectionStatus) {
            case 'submitted':
                title = 'Seleção Enviada!';
                message = 'Sua seleção de fotos foi enviada com sucesso. O fotógrafo já foi notificado e em breve suas fotos estarão disponíveis para download.';
                buttonHtml = `<button id="reopenRequestBtn" style="margin-top:1.25rem; background:none; border:1px solid #d1d5db; color:#666; padding:0.625rem 1.25rem; border-radius:0.5rem; font-size:0.8125rem; cursor:pointer;">Preciso alterar minha seleção</button>`;
                break;
            case 'delivered':
                title = 'Fotos Entregues!';
                message = 'Suas fotos estão prontas! Você já pode visualizá-las sem marca d\'água e fazer o download.';
                buttonHtml = `<button id="viewDeliveredBtn" style="margin-top:1.25rem; background:#2563eb; color:white; border:none; padding:0.625rem 1.25rem; border-radius:0.5rem; font-size:0.8125rem; cursor:pointer;">Ver minhas fotos</button>`;
                break;
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
            </div>
        `;
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
            const response = await fetch(`/api/client/comments/${state.sessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    accessCode: state.accessCode, 
                    photoId: currentCommentPhotoId,
                    text: text 
                }),
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
            await loadSessionData();

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        } finally {
            hideLoading(loginBtn);
        }
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
            state.session = result;
            state.photos = result.photos;
            state.selectedPhotos = result.selectedPhotos || [];
            state.isSelectionMode = result.mode === 'selection';

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

            // Tenta renderizar primeiro antes de trocar a tela
            if (state.session.selectionStatus === 'submitted' || (state.session.selectionStatus === 'delivered' && state.session.mode === 'selection')) {
                if (state.session.selectionStatus === 'delivered') {
                    // Se entregue, vai direto para as fotos sem marca d'água
                    renderHeader();
                    renderPhotos();
                    gallerySection.style.display = 'block';
                    selectionBar.style.display = 'none';
                    statusScreen.style.display = 'none';
                } else {
                    renderStatusScreen();
                    gallerySection.style.display = 'none';
                }
            } else {
                renderHeader();
                renderPhotos();
                gallerySection.style.display = 'block';
                statusScreen.style.display = 'none';
            }
            // Só esconde o login se tudo acima funcionou
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

        try {
            await fetch(`/api/client/select/${state.sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
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

    async function requestReopen() {
        const btn = document.getElementById('reopenRequestBtn');
        showLoading(btn, 'Enviando pedido...');
        try {
            const response = await fetch(`/api/client/request-reopen/${state.sessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessCode: state.accessCode }),
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            alert('Seu pedido de reabertura foi enviado ao fotógrafo!');
            btn.textContent = 'Pedido Enviado';
            btn.disabled = true;

        } catch (error) {
            alert('Erro ao solicitar reabertura: ' + error.message);
            hideLoading(btn);
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
    const lightboxDownload = document.getElementById('lightboxDownload');
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

        // Botão de download (apenas no modo delivered)
        if (lightboxDownload) {
            const canDownload = state.session.selectionStatus === 'delivered';
            lightboxDownload.style.display = canDownload ? 'flex' : 'none';
            if (canDownload) {
                lightboxDownload.href = `/api/client/download/${state.sessionId}/${photo.id}?code=${encodeURIComponent(state.accessCode)}`;
                lightboxDownload.download = photo.filename || 'foto.jpg';
            }
        }
    }

    window.closeLightbox = function() {
        lightbox.classList.remove('active');
    };

    window.lightboxNav = function(dir) {
        lightboxIndex = (lightboxIndex + dir + state.photos.length) % state.photos.length;
        renderLightbox();
    };

    window.toggleLightboxHeart = function() {
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

    statusScreen.addEventListener('click', (e) => {
        if (e.target.id === 'reopenRequestBtn') {
            requestReopen();
        }
        if (e.target.id === 'viewDeliveredBtn') {
            initializeGallery();
        }
    });

});
