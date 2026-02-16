document.addEventListener('DOMContentLoaded', () => {
    const state = {
        accessCode: null,
        sessionId: null,
        session: null,
        photos: [],
        selectedPhotos: [],
        isSelectionMode: false,
        pollingInterval: null,
    };

    const loginSection = document.getElementById('loginSection');
    const gallerySection = document.getElementById('gallerySection');
    const accessCodeInput = document.getElementById('accessCode');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');
    const photoGrid = document.getElementById('photoGrid');
    const selectionBar = document.getElementById('selectionBar');
    const selectionCount = document.getElementById('selectionCount');
    const extraInfo = document.getElementById('extraInfo');
    const submitSelectionBtn = document.getElementById('submitSelectionBtn');
    const galleryHeader = document.getElementById('galleryHeader');
    const statusScreen = document.getElementById('statusScreen');

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

    function getWatermarkStyle(watermark) {
        if (!watermark || state.session.selectionStatus === 'delivered') {
            return 'display: none;';
        }

        const {
            watermarkType: type = 'text',
            watermarkText: text = '',
            watermarkOpacity: opacity = 15,
            watermarkPosition: position = 'center',
            watermarkSize: size = 'medium'
        } = watermark;

        const orgName = state.session.organization.name || '';
        const logoUrl = state.session.organization.logo ? `/uploads/${state.session.organization.id}/${state.session.organization.logo}` : '';

        let styles = `
            position: absolute;
            inset: 0;
            pointer-events: none;
            opacity: ${opacity / 100};
        `;

        if (position === 'tiled') {
            styles += `background-repeat: repeat; background-position: center;`;
            if (type === 'logo' && logoUrl) {
                const bgSize = { small: '100px', medium: '150px', large: '200px' }[size] || '150px';
                styles += `background-image: url(${logoUrl}); background-size: ${bgSize};`;
            } else {
                const watermarkContent = text || orgName;
                styles += `background-image: ${createTiledWatermarkSvg(watermarkContent, opacity, size)};`;
            }
        } else {
            const justifyContent = position.includes('right') ? 'flex-end' : position.includes('left') ? 'flex-start' : 'center';
            const alignItems = position.includes('top') ? 'flex-start' : position.includes('bottom') ? 'flex-end' : 'center';
            styles += `display: flex; justify-content: ${justifyContent}; align-items: ${alignItems}; padding: 1rem;`;

            if (type === 'logo' && logoUrl) {
                const imgSize = { small: '10%', medium: '20%', large: '30%' }[size] || '20%';
                return styles + `"><img src="${logoUrl}" style="width:${imgSize}; height:auto; max-width:100%; max-height:100%;" alt="Watermark">`;
            } else {
                const fontSize = { small: '1rem', medium: '1.5rem', large: '2.2rem' }[size] || '1.5rem';
                const watermarkContent = text || orgName;
                return styles + `"><span style="font-family: Arial, sans-serif; font-weight: bold; color: white; font-size: ${fontSize}; text-shadow: 0 0 2px black;">${escapeHtml(watermarkContent)}</span>`;
            }
        }

        return styles + '"';
    }

    // --- Renderização ---

    function renderHeader() {
        const org = state.session.organization;
        if (!org) return;

        let logoHtml = '';
        if (org.logo) {
            const logoUrl = `/uploads/${org.id}/${org.logo}`;
            logoHtml = `<img src="${logoUrl}" alt="${escapeHtml(org.name)}" style="max-height: 40px; max-width: 150px;">`;
        } else {
            logoHtml = `<h1 class="text-2xl font-bold">${escapeHtml(org.name)}</h1>`;
        }
        galleryHeader.innerHTML = `
            <div class="container mx-auto flex justify-between items-center">
                ${logoHtml}
                <h2 class="text-xl hidden sm:block">${escapeHtml(state.session.name)}</h2>
            </div>
        `;
    }

    function renderPhotos() {
        if (!state.photos) return;

        const watermarkStyle = getWatermarkStyle(state.session.organization.watermark);

        photoGrid.innerHTML = state.photos.map(photo => {
            const isSelected = state.selectedPhotos.includes(photo.id);
            const hasComments = photo.comments && photo.comments.length > 0;
            const commentCount = photo.comments ? photo.comments.length : 0;
            
            return `
                <div class="relative group aspect-w-1 aspect-h-1" data-photo-id="${photo.id}">
                    <img src="${photo.url}" alt="Foto" class="object-cover w-full h-full rounded-md" loading="lazy">
                    <div style="${watermarkStyle.startsWith('"') ? watermarkStyle.slice(1) : watermarkStyle}"></div>
                    ${state.isSelectionMode ? `
                        <div class="absolute top-2 right-2 flex gap-2">
                            <button class="comment-btn p-2 rounded-full transition-colors duration-200 ${hasComments ? 'bg-blue-500 text-white' : 'bg-white/70 text-gray-800 hover:bg-white'}" title="Comentários">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            </button>
                            <button class="select-btn p-2 rounded-full transition-colors duration-200 ${isSelected ? 'bg-red-500 text-white' : 'bg-white/70 text-gray-800 hover:bg-white'}" title="Selecionar">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        updateSelectionBar();
    }

    function updateSelectionBar() {
        if (!state.isSelectionMode) {
            selectionBar.style.display = 'none';
            return;
        }

        selectionBar.style.display = 'flex';
        const count = state.selectedPhotos.length;
        const limit = state.session.packageLimit || 0;
        const extraPrice = state.session.extraPhotoPrice || 0;

        selectionCount.textContent = `${count} / ${limit} selecionadas`;

        if (count > limit) {
            const extraCount = count - limit;
            const extraCost = extraCount * extraPrice;
            extraInfo.textContent = `+${extraCount} fotos extras (R$ ${extraCost.toFixed(2)})`;
            extraInfo.style.display = 'block';
        } else {
            extraInfo.style.display = 'none';
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
                buttonHtml = `<button id="reopenRequestBtn" class="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Preciso alterar minha seleção</button>`;
                break;
            case 'delivered':
                title = 'Fotos Entregues!';
                message = 'Suas fotos estão prontas! Você já pode visualizá-las sem marca d\'água e fazer o download.';
                buttonHtml = `<button id="viewDeliveredBtn" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Ver minhas fotos</button>`;
                break;
            default:
                title = 'Aguardando...';
                message = 'Algo inesperado aconteceu. Por favor, contate o fotógrafo.';
        }

        statusScreen.innerHTML = `
            <div class="text-center">
                <h2 class="text-3xl font-bold mb-2">${title}</h2>
                <p class="text-gray-400">${message}</p>
                ${buttonHtml}
            </div>
        `;
    }

    // --- Modal de Comentários ---

    function createCommentModal() {
        if (document.getElementById('commentModal')) return;

        const modalHtml = `
            <div id="commentModal" class="fixed inset-0 z-50 hidden" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                <div class="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity backdrop-blur-sm"></div>
                <div class="fixed inset-0 z-10 overflow-y-auto">
                    <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                            <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                <div class="sm:flex sm:items-start">
                                    <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                                        <h3 class="text-base font-semibold leading-6 text-gray-900" id="modal-title">Comentários da Foto</h3>
                                        <div class="mt-2 max-h-60 overflow-y-auto" id="commentsList">
                                            <!-- Lista de comentários -->
                                        </div>
                                        <div class="mt-4">
                                            <textarea id="newCommentText" rows="3" class="w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 p-2" placeholder="Escreva seu comentário ou observação..."></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                <button type="button" id="saveCommentBtn" class="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto">Enviar</button>
                                <button type="button" id="closeCommentBtn" class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto">Fechar</button>
                            </div>
                        </div>
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
                    <div class="mb-3 text-left ${isClient ? 'bg-blue-50' : 'bg-gray-100'} p-2 rounded">
                        <p class="text-xs font-bold ${isClient ? 'text-blue-700' : 'text-gray-700'}">${isClient ? 'Você' : 'Fotógrafo'} <span class="font-normal text-gray-400 ml-1">${date}</span></p>
                        <p class="text-sm text-gray-800 mt-1">${escapeHtml(comment.text)}</p>
                    </div>
                `;
            });
        } else {
            commentsList.innerHTML = '<p class="text-sm text-gray-500 italic">Nenhum comentário ainda.</p>';
        }

        commentModal.classList.remove('hidden');
    }

    function closeCommentModal() {
        if (commentModal) commentModal.classList.add('hidden');
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

    async function handleLogin() {
        const code = accessCodeInput.value.trim();
        if (!code) {
            errorMessage.textContent = 'Por favor, insira o código de acesso.';
            return;
        }

        showLoading(loginBtn);
        errorMessage.textContent = '';

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
            await loadSessionData();

        } catch (error) {
            errorMessage.textContent = error.message;
        } finally {
            hideLoading(loginBtn);
        }
    }

    async function loadSessionData(isPolling = false) {
        try {
            const response = await fetch(`/api/client/photos/${state.sessionId}?code=${state.accessCode}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Não foi possível carregar a galeria.');
            }

            const previousStatus = state.session ? state.session.selectionStatus : null;
            state.session = result.session;
            state.photos = result.photos;
            state.selectedPhotos = result.session.selectedPhotos || [];
            state.isSelectionMode = result.session.mode === 'selection';

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
            }
            console.error("Polling error:", error);
        }
    }

    function initializeGallery() {
        loginSection.style.display = 'none';

        if (state.session.selectionStatus === 'submitted' || state.session.selectionStatus === 'delivered' && state.session.mode === 'selection') {
            if (state.session.selectionStatus === 'delivered') {
                // Se entregue, vai direto para as fotos sem marca d'água
                gallerySection.style.display = 'block';
                selectionBar.style.display = 'none';
                renderHeader();
                renderPhotos();
            } else {
                renderStatusScreen();
            }
        } else {
            gallerySection.style.display = 'block';
            statusScreen.style.display = 'none';
            renderHeader();
            renderPhotos();
        }

        startPolling();
    }

    async function togglePhotoSelection(photoId) {
        const isSelected = state.selectedPhotos.includes(photoId);
        const photoCard = photoGrid.querySelector(`[data-photo-id="${photoId}"]`);
        const selectBtn = photoCard.querySelector('.select-btn');

        // Optimistic UI
        if (isSelected) {
            state.selectedPhotos = state.selectedPhotos.filter(id => id !== photoId);
            selectBtn.classList.remove('bg-red-500', 'text-white');
            selectBtn.classList.add('bg-white/70', 'text-gray-800');
        } else {
            state.selectedPhotos.push(photoId);
            selectBtn.classList.add('bg-red-500', 'text-white');
            selectBtn.classList.remove('bg-white/70', 'text-gray-800');
        }
        updateSelectionBar();

        try {
            await fetch(`/api/client/select/${state.sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessCode: state.accessCode, photoId }),
            });
        } catch (error) {
            // Revert UI on error
            alert('Erro ao salvar seleção. Tente novamente.');
            if (isSelected) {
                state.selectedPhotos.push(photoId);
                selectBtn.classList.add('bg-red-500', 'text-white');
            } else {
                state.selectedPhotos = state.selectedPhotos.filter(id => id !== photoId);
                selectBtn.classList.remove('bg-red-500', 'text-white');
            }
            updateSelectionBar();
        }
    }

    async function submitSelection() {
        if (!confirm('Tem certeza que deseja finalizar sua seleção? Após o envio, não será possível fazer alterações sem solicitar ao fotógrafo.')) {
            return;
        }

        showLoading(submitSelectionBtn, 'Enviando...');

        try {
            const response = await fetch(`/api/client/submit-selection/${state.sessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessCode: state.accessCode }),
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
    loginBtn.addEventListener('click', handleLogin);
    accessCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    photoGrid.addEventListener('click', (e) => {
        const selectBtn = e.target.closest('.select-btn');
        if (selectBtn) {
            const photoId = e.target.closest('[data-photo-id]').dataset.photoId;
            togglePhotoSelection(photoId);
        }
        const commentBtn = e.target.closest('.comment-btn');
        if (commentBtn) {
            const photoId = e.target.closest('[data-photo-id]').dataset.photoId;
            openCommentModal(photoId);
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
