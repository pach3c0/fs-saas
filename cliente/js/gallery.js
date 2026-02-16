// ========== META PIXEL (dinâmico) ==========
(async function loadPixel() {
    try {
        const res = await fetch('/api/site-config');
        if (res.ok) {
            const config = await res.json();
            if (config.metaPixelId) {
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', config.metaPixelId);
                fbq('track', 'PageView');
            }
        }
    } catch (e) { /* ignora */ }
})();

// ========== STATE ==========
let sessionData = null;
let photos = [];
let selectedPhotos = new Set();
let galleryMode = 'gallery';
let packageLimit = 30;
let extraPhotoPrice = 25;
let selectionStatus = 'pending';
let lightboxIndex = 0;
let sessionId = null;
let accessCode = '';
let orgData = null;

// SVG icons
const HEART_SVG = '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
const DOWNLOAD_SVG = '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

// ========== ORG BRANDING ==========
function applyOrgBranding() {
    if (!orgData) return;
    // Exibir logo no nav
    const navLogo = document.querySelector('.nav-logo');
    if (navLogo && orgData.logo) {
        navLogo.innerHTML = `<img src="${orgData.logo}" alt="${orgData.name || ''}" style="max-height:32px; max-width:160px; object-fit:contain;">`;
    } else if (navLogo && orgData.name) {
        navLogo.textContent = orgData.name;
    }
    // Atualizar watermark no lightbox
    const lbWatermark = document.querySelector('.lightbox-watermark span');
    if (lbWatermark) {
        lbWatermark.textContent = getWatermarkText();
    }
}

function getWatermarkText() {
    if (orgData && orgData.watermarkType === 'text' && orgData.watermarkText) {
        return orgData.watermarkText;
    }
    if (orgData && orgData.name) {
        return orgData.name;
    }
    return 'FS FOTOGRAFIAS';
}

function getWatermarkOpacity() {
    if (orgData && orgData.watermarkOpacity) {
        return orgData.watermarkOpacity / 100;
    }
    return 0.15;
}

// ========== LOGIN ==========
async function handleLogin(e) {
    e.preventDefault();
    const code = document.getElementById('codeInput').value.trim();
    const errorEl = document.getElementById('loginError');
    errorEl.style.display = 'none';

    try {
        const res = await fetch('/api/client/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessCode: code })
        });

        if (!res.ok) {
            const data = await res.json();
            errorEl.textContent = data.error || 'Codigo invalido';
            errorEl.style.display = 'block';
            return;
        }

        sessionData = await res.json();
        sessionId = sessionData.sessionId;
        accessCode = sessionData.accessCode;
        galleryMode = sessionData.mode || 'gallery';
        packageLimit = sessionData.packageLimit || 30;
        extraPhotoPrice = sessionData.extraPhotoPrice || 25;
        selectionStatus = sessionData.selectionStatus || 'pending';

        // Carregar dados da organizacao (logo, watermark)
        try {
            const orgRes = await fetch('/api/organization/public');
            if (orgRes.ok) {
                const orgResult = await orgRes.json();
                orgData = orgResult.data || null;
                applyOrgBranding();
            }
        } catch (e) { /* ignora */ }

        if (typeof fbq === 'function') fbq('track', 'Lead', { content_name: sessionData.clientName });

        document.getElementById('loginArea').style.display = 'none';
        document.getElementById('galleryArea').style.display = 'block';
        loadGallery();
    } catch (err) {
        errorEl.textContent = 'Erro de conexao. Tente novamente.';
        errorEl.style.display = 'block';
    }
}

// ========== LOAD GALLERY ==========
async function loadGallery() {
    document.getElementById('clientName').textContent = sessionData.clientName;
    document.getElementById('galleryMeta').innerHTML = `${sessionData.sessionType} <span>&middot;</span> ${sessionData.galleryDate} <span>&middot;</span> ${sessionData.totalPhotos} fotos`;

    // Exibir foto de capa se existir
    if (sessionData.coverPhoto) {
        const header = document.querySelector('.gallery-header');
        if (header && !document.getElementById('coverBanner')) {
            const banner = document.createElement('div');
            banner.id = 'coverBanner';
            banner.style.cssText = 'width:100%; max-height:300px; overflow:hidden; border-radius:0.75rem; margin-bottom:1rem;';
            banner.innerHTML = `<img src="${sessionData.coverPhoto}" style="width:100%; height:100%; object-fit:cover; pointer-events:none;" alt="">`;
            header.insertBefore(banner, header.firstChild);
        }
    }

    try {
        const res = await fetch(`/api/client/photos/${sessionId}?code=${encodeURIComponent(accessCode)}`);
        if (!res.ok) throw new Error('Erro ao carregar');
        const data = await res.json();

        photos = data.photos || [];
        galleryMode = data.mode || galleryMode;
        selectionStatus = data.selectionStatus || selectionStatus;
        const serverSelected = data.selectedPhotos || [];
        selectedPhotos = new Set(serverSelected);

        if (galleryMode === 'selection') {
            if (selectionStatus === 'submitted') {
                showStatusScreen('submitted');
                startStatusPolling();
                return;
            }
            if (selectionStatus === 'delivered') {
                renderGalleryMode();
                return;
            }
            renderSelectionMode();
        } else {
            renderGalleryMode();
        }
    } catch (err) {
        document.getElementById('photosGrid').innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:3rem; color:#999;">Erro ao carregar fotos</p>';
    }
}

// Polling para detectar quando admin reabrir a selecao
let pollingInterval = null;
function startStatusPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
        try {
            const res = await fetch(`/api/client/photos/${sessionId}?code=${encodeURIComponent(accessCode)}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.selectionStatus !== 'submitted') {
                clearInterval(pollingInterval);
                pollingInterval = null;
                // Limpar flag de pedido de reabertura
                sessionStorage.removeItem(`reopen_requested_${sessionId}`);
                // Status mudou - recarregar galeria
                selectionStatus = data.selectionStatus;
                selectedPhotos = new Set(data.selectedPhotos || []);
                document.getElementById('statusSubmitted').classList.remove('active');
                document.getElementById('submittedPhotosGrid').style.display = 'none';
                if (data.selectionStatus === 'delivered') {
                    renderGalleryMode();
                } else {
                    renderSelectionMode();
                }
            }
        } catch (e) { /* ignore polling errors */ }
    }, 15000); // Checa a cada 15 segundos
}

// ========== SELECTION MODE ==========
function renderSelectionMode() {
    const grid = document.getElementById('photosGrid');
    const showWatermark = sessionData.watermark !== false;

    document.getElementById('selectionInfo').style.display = 'block';
    document.getElementById('bottomBar').style.display = 'block';
    document.getElementById('limitNum').textContent = packageLimit;
    document.getElementById('barLimit').textContent = packageLimit;

    grid.style.display = 'grid';
    document.getElementById('statusSubmitted').classList.remove('active');
    document.getElementById('statusWaiting').classList.remove('active');

    grid.innerHTML = photos.map((photo, idx) => {
        const isSelected = selectedPhotos.has(photo.id);
        return `
            <div class="photo-item" onclick="openLightbox(${idx})">
                <img src="${photo.url}" alt="" loading="lazy">
                ${showWatermark ? '<div class="watermark-overlay"><span class="watermark-text" style="color:rgba(255,255,255,${getWatermarkOpacity()})">${getWatermarkText()}</span></div>' : ''}
                <button class="photo-heart ${isSelected ? 'selected' : ''}" onclick="event.stopPropagation(); toggleSelect('${photo.id}', this)">
                    ${HEART_SVG}
                </button>
                <div class="photo-num">${idx + 1}</div>
            </div>
        `;
    }).join('');

    updateSelectionUI();
}

// ========== GALLERY MODE (view/download) ==========
function renderGalleryMode() {
    const grid = document.getElementById('photosGrid');
    const isDelivered = selectionStatus === 'delivered';
    const showWatermark = !isDelivered && sessionData.watermark !== false;

    document.getElementById('selectionInfo').style.display = 'none';
    document.getElementById('bottomBar').style.display = 'none';
    grid.style.display = 'grid';
    document.getElementById('statusSubmitted').classList.remove('active');
    document.getElementById('statusWaiting').classList.remove('active');

    grid.innerHTML = photos.map((photo, idx) => `
        <div class="photo-item" onclick="openLightbox(${idx})">
            <img src="${photo.url}" alt="" loading="lazy">
            ${showWatermark ? '<div class="watermark-overlay"><span class="watermark-text" style="color:rgba(255,255,255,${getWatermarkOpacity()})">${getWatermarkText()}</span></div>' : ''}
            <div class="photo-download">
                <a href="${photo.url}" download="${photo.filename}" onclick="event.stopPropagation()">
                    ${DOWNLOAD_SVG} Baixar
                </a>
            </div>
            <div class="photo-num">${idx + 1}</div>
        </div>
    `).join('');
}

// ========== STATUS SCREENS ==========
function showStatusScreen(type) {
    document.getElementById('photosGrid').style.display = 'none';
    document.getElementById('selectionInfo').style.display = 'none';
    document.getElementById('bottomBar').style.display = 'none';

    if (type === 'submitted') {
        document.getElementById('statusSubmitted').classList.add('active');
        // Verificar se pedido de reabertura ja foi enviado
        if (sessionStorage.getItem(`reopen_requested_${sessionId}`)) {
            const btn = document.getElementById('requestReopenBtn');
            const sentMsg = document.getElementById('reopenSent');
            if (btn) btn.style.display = 'none';
            if (sentMsg) sentMsg.style.display = 'block';
        }
        // Mostrar as fotos selecionadas abaixo do status
        const submittedGrid = document.getElementById('submittedPhotosGrid');
        const selectedList = photos.filter(p => selectedPhotos.has(p.id));
        if (selectedList.length > 0) {
            const showWatermark = sessionData.watermark !== false;
            submittedGrid.innerHTML = selectedList.map((photo, idx) => `
                <div class="photo-item" onclick="openLightbox(${photos.indexOf(photo)})">
                    <img src="${photo.url}" alt="" loading="lazy">
                    ${showWatermark ? '<div class="watermark-overlay"><span class="watermark-text" style="color:rgba(255,255,255,${getWatermarkOpacity()})">${getWatermarkText()}</span></div>' : ''}
                    <div style="position:absolute; top:0.5rem; right:0.5rem; width:28px; height:28px; background:#dc2626; border-radius:50%; display:flex; align-items:center; justify-content:center; pointer-events:none;">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="#fff" fill="#fff" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </div>
                    <div class="photo-num">${idx + 1}</div>
                </div>
            `).join('');
            submittedGrid.style.display = 'grid';
        }
    }
}

// ========== SELECTION LOGIC ==========
async function toggleSelect(photoId, btnEl) {
    const isCurrentlySelected = selectedPhotos.has(photoId);
    const newState = !isCurrentlySelected;

    // Optimistic UI update
    if (newState) {
        selectedPhotos.add(photoId);
        if (btnEl) btnEl.classList.add('selected');
    } else {
        selectedPhotos.delete(photoId);
        if (btnEl) btnEl.classList.remove('selected');
    }
    updateSelectionUI();

    // Send to server
    try {
        const res = await fetch(`/api/client/select/${sessionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photoId, selected: newState, accessCode })
        });

        if (!res.ok) {
            // Revert on error
            if (newState) {
                selectedPhotos.delete(photoId);
                if (btnEl) btnEl.classList.remove('selected');
            } else {
                selectedPhotos.add(photoId);
                if (btnEl) btnEl.classList.add('selected');
            }
            updateSelectionUI();
            const data = await res.json();
            if (data.error) alert(data.error);
        }
    } catch (err) {
        // Revert on network error
        if (newState) {
            selectedPhotos.delete(photoId);
            if (btnEl) btnEl.classList.remove('selected');
        } else {
            selectedPhotos.add(photoId);
            if (btnEl) btnEl.classList.add('selected');
        }
        updateSelectionUI();
    }
}

function updateSelectionUI() {
    const count = selectedPhotos.size;
    const extras = Math.max(0, count - packageLimit);
    const extraTotal = extras * extraPhotoPrice;

    // Top bar
    document.getElementById('selectedNum').textContent = count;
    const extraInfoEl = document.getElementById('extraInfo');
    if (extras > 0) {
        extraInfoEl.textContent = `+${extras} extras (R$ ${extraTotal.toFixed(2)})`;
        extraInfoEl.style.display = 'block';
    } else {
        extraInfoEl.style.display = 'none';
    }

    // Bottom bar
    document.getElementById('barCount').textContent = count;
    const barExtraEl = document.getElementById('barExtra');
    if (extras > 0) {
        barExtraEl.textContent = `+${extras} extras = R$ ${extraTotal.toFixed(2)}`;
        barExtraEl.style.display = 'block';
    } else {
        barExtraEl.style.display = 'none';
    }

    // Submit button
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = count === 0;
}

async function submitSelection() {
    const count = selectedPhotos.size;
    if (count === 0) return;

    const extras = Math.max(0, count - packageLimit);
    let msg = `Finalizar selecao com ${count} fotos?`;
    if (extras > 0) {
        msg += `\n\n${extras} foto(s) extra(s) = R$ ${(extras * extraPhotoPrice).toFixed(2)}`;
    }
    msg += '\n\nApos finalizar, o fotografo sera notificado. Caso precise alterar, entre em contato.';

    if (!confirm(msg)) return;

    try {
        const res = await fetch(`/api/client/submit-selection/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessCode })
        });

        if (!res.ok) {
            const data = await res.json();
            alert(data.error || 'Erro ao finalizar');
            return;
        }

        if (typeof fbq === 'function') fbq('track', 'CompleteRegistration', { content_name: sessionData.clientName, value: extras * extraPhotoPrice, currency: 'BRL' });

        selectionStatus = 'submitted';
        showStatusScreen('submitted');
    } catch (err) {
        alert('Erro de conexao. Tente novamente.');
    }
}

// ========== PEDIR REABERTURA ==========
async function requestReopen() {
    const btn = document.getElementById('requestReopenBtn');
    const sentMsg = document.getElementById('reopenSent');

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const res = await fetch(`/api/client/request-reopen/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessCode })
        });

        if (res.ok) {
            btn.style.display = 'none';
            sentMsg.style.display = 'block';
            sessionStorage.setItem(`reopen_requested_${sessionId}`, 'true');
        } else {
            const data = await res.json();
            alert(data.error || 'Erro ao enviar pedido');
            btn.disabled = false;
            btn.textContent = 'Preciso alterar minha selecao';
        }
    } catch (err) {
        alert('Erro de conexao. Tente novamente.');
        btn.disabled = false;
        btn.textContent = 'Preciso alterar minha selecao';
    }
}

// ========== LIGHTBOX ==========
function openLightbox(idx) {
    lightboxIndex = idx;
    updateLightbox();
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = '';
}

function lightboxNav(dir) {
    lightboxIndex = (lightboxIndex + dir + photos.length) % photos.length;
    updateLightbox();
}

function updateLightbox() {
    const photo = photos[lightboxIndex];
    if (!photo) return;

    document.getElementById('lightboxImg').src = photo.url;
    document.getElementById('lightboxCounter').textContent = `${lightboxIndex + 1} / ${photos.length}`;

    // Watermark
    const showWatermark = selectionStatus !== 'delivered' && sessionData.watermark !== false;
    document.getElementById('lightboxWatermark').style.display = showWatermark ? 'flex' : 'none';

    // Heart button (only in selection mode, not submitted/delivered)
    const heartBtn = document.getElementById('lightboxHeart');
    if (galleryMode === 'selection' && selectionStatus !== 'submitted' && selectionStatus !== 'delivered') {
        heartBtn.style.display = 'flex';
        heartBtn.classList.toggle('selected', selectedPhotos.has(photo.id));
    } else {
        heartBtn.style.display = 'none';
    }

    // Download button (only in gallery mode or delivered)
    const dlBtn = document.getElementById('lightboxDownload');
    if (galleryMode === 'gallery' || selectionStatus === 'delivered') {
        dlBtn.style.display = 'flex';
        dlBtn.href = photo.url;
        dlBtn.download = photo.filename;
    } else {
        dlBtn.style.display = 'none';
    }
}

function toggleLightboxHeart() {
    const photo = photos[lightboxIndex];
    if (!photo) return;
    toggleSelect(photo.id, null);
    // Update lightbox heart
    const heartBtn = document.getElementById('lightboxHeart');
    heartBtn.classList.toggle('selected', selectedPhotos.has(photo.id));
    // Update grid heart too
    const gridHearts = document.querySelectorAll('.photo-heart');
    if (gridHearts[lightboxIndex]) {
        gridHearts[lightboxIndex].classList.toggle('selected', selectedPhotos.has(photo.id));
    }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (!document.getElementById('lightbox').classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lightboxNav(-1);
    if (e.key === 'ArrowRight') lightboxNav(1);
});

// Swipe support for lightbox
let touchStartX = 0;
document.getElementById('lightbox').addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
}, { passive: true });
document.getElementById('lightbox').addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
        lightboxNav(diff > 0 ? 1 : -1);
    }
}, { passive: true });
