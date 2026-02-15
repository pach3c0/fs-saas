// ========== STATE ==========
let store = null;
let albumsCache = [];

function resolveImagePath(url) {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('/')) return url;
    return `/assets/${url}`;
}

function processRemoteData(remote) {
    if (!remote) return null;

    try {
        return {
            logo: {
                type: remote.logo?.type ?? 'text',
                text: remote.logo?.text ?? 'FS FOTOGRAFIAS',
                image: remote.logo?.image ?? ''
            },
            hero: {
                title: remote.hero?.title ?? "",
                subtitle: remote.hero?.subtitle ?? "",
                image: remote.hero?.image ?? "",
                imageScale: remote.hero?.imageScale ?? 1,
                imagePosX: remote.hero?.imagePosX ?? 50,
                imagePosY: remote.hero?.imagePosY ?? 50,
                titlePosX: remote.hero?.titlePosX ?? 50,
                titlePosY: remote.hero?.titlePosY ?? 40,
                subtitlePosX: remote.hero?.subtitlePosX ?? 50,
                subtitlePosY: remote.hero?.subtitlePosY ?? 55,
                titleFontSize: remote.hero?.titleFontSize ?? 48,
                subtitleFontSize: remote.hero?.subtitleFontSize ?? 18,
                topBarHeight: remote.hero?.topBarHeight ?? 0,
                bottomBarHeight: remote.hero?.bottomBarHeight ?? 0,
                overlayOpacity: remote.hero?.overlayOpacity ?? 30
            },
            about: {
                title: remote.about?.title ?? "",
                text: remote.about?.text ?? "",
                image: remote.about?.image ?? "",
                images: Array.isArray(remote.about?.images) ? remote.about.images.map(img => ({
                    image: img.image,
                    posX: img.posX ?? 50,
                    posY: img.posY ?? 50,
                    scale: img.scale ?? 1
                })) : []
            },
            portfolio: Array.isArray(remote.portfolio) ? remote.portfolio
                .filter(p => typeof p === 'string' ? p : p.image)
                .map(p => ({
                image: typeof p === 'string' ? p : p.image,
                posX: p.posX ?? 50,
                posY: p.posY ?? 50,
                scale: p.scale ?? 1,
                ratio: p.ratio ?? '3/4'
            })) : [],
            studio: {
                title: remote.studio?.title ?? "",
                description: remote.studio?.description ?? "",
                address: remote.studio?.address ?? "",
                hours: remote.studio?.hours ?? "",
                whatsapp: remote.studio?.whatsapp ?? "",
                videoUrl: remote.studio?.videoUrl ?? "",
                whatsappMessages: remote.studio?.whatsappMessages ?? [],
                photos: remote.studio?.photos ? remote.studio.photos.map(p => ({
                    image: p.image,
                    posX: p.posX ?? 50,
                    posY: p.posY ?? 50,
                    scale: p.scale ?? 1
                })) : []
            },
            albums: Array.isArray(remote.albums) ? remote.albums.map(a => ({
                title: a.title ?? '',
                subtitle: a.subtitle ?? '',
                cover: a.cover ?? '',
                photos: Array.isArray(a.photos) ? a.photos : [],
                createdAt: a.createdAt ?? null
            })) : [],
            footer: {
                socialMedia: remote.footer?.socialMedia ?? {},
                quickLinks: remote.footer?.quickLinks ?? [],
                newsletter: remote.footer?.newsletter ?? { enabled: true, title: '', description: '' },
                copyright: remote.footer?.copyright ?? ''
            }
        };
    } catch (e) {
        console.warn('Erro ao processar dados do servidor:', e);
        return null;
    }
}

// ========== RENDER ==========
function render() {
    // Marca pagina como carregada (remove skeleton)
    document.body.classList.add('loaded');

    // ===== LOGO =====
    const navLogo = document.getElementById('dom-nav-logo');
    const splashLogo = document.getElementById('dom-splash-logo');
    
    if (navLogo && store.logo) {
        if (store.logo.type === 'image' && store.logo.image) {
            navLogo.innerHTML = `<img src="${resolveImagePath(store.logo.image)}" alt="${store.logo.text}" class="w-auto object-contain" style="height: 3.5rem;">`;
        } else {
            navLogo.textContent = store.logo.text;
        }
    }
    if (splashLogo && store.logo) {
        splashLogo.textContent = store.logo.text; // Splash mantem texto por design
    }

    // ===== HERO =====
    const heroImg = document.getElementById('dom-hero-img');
    const heroOverlay = document.getElementById('dom-hero-overlay');
    const heroTopBar = document.getElementById('dom-hero-top-bar');
    const heroBottomBar = document.getElementById('dom-hero-bottom-bar');
    const heroTitle = document.getElementById('dom-hero-title');
    const heroSubtitle = document.getElementById('dom-hero-subtitle');

    // Imagem - usa background-size + background-position para zoom+posicao corretos
    const heroImageUrl = resolveImagePath(store.hero.image);
    const imgScale = store.hero.imageScale;
    const imgPosX = store.hero.imagePosX;
    const imgPosY = store.hero.imagePosY;

    const scalePct = imgScale * 100;
    heroImg.style.backgroundSize = `max(${scalePct}%, 100%) max(${scalePct}%, 100%)`;
    heroImg.style.backgroundPosition = `${imgPosX}% ${imgPosY}%`;

    // Carrega imagem e mostra com fade-in quando pronta
    if (heroImg.style.backgroundImage !== `url("${heroImageUrl}")`) {
        const preload = new Image();
        preload.onload = () => {
            heroImg.style.backgroundImage = `url("${heroImageUrl}")`;
            heroImg.classList.remove('opacity-0');
        };
        preload.src = heroImageUrl;
    }

    // Overlay
    const overlayOpacity = (store.hero.overlayOpacity ?? 30) / 100;
    heroOverlay.style.background = `rgba(0,0,0,${overlayOpacity})`;

    // Faixas cinema
    heroTopBar.style.height = (store.hero.topBarHeight ?? 0) + '%';
    heroBottomBar.style.height = (store.hero.bottomBarHeight ?? 0) + '%';

    // Titulo
    const titlePosX = store.hero.titlePosX;
    const titlePosY = store.hero.titlePosY;
    const titleFS = store.hero.titleFontSize ?? 48;

    heroTitle.textContent = store.hero.title;
    heroTitle.style.left = titlePosX + '%';
    heroTitle.style.top = titlePosY + '%';
    heroTitle.style.transform = 'translate(-50%, -50%)';
    heroTitle.style.fontSize = `clamp(28px, 6vw, ${titleFS}px)`;
    heroTitle.style.lineHeight = '1.15';
    heroTitle.style.maxWidth = 'min(90vw, 800px)';
    heroTitle.style.whiteSpace = 'normal';
    heroTitle.style.overflowWrap = 'break-word';

    // Subtitulo
    const subPosX = store.hero.subtitlePosX;
    const subPosY = store.hero.subtitlePosY;
    const subtitleFS = store.hero.subtitleFontSize ?? 18;

    heroSubtitle.textContent = store.hero.subtitle;
    heroSubtitle.style.left = subPosX + '%';
    heroSubtitle.style.top = subPosY + '%';
    heroSubtitle.style.transform = 'translate(-50%, -50%)';
    heroSubtitle.style.fontSize = `clamp(14px, 3.5vw, ${subtitleFS}px)`;
    heroSubtitle.style.lineHeight = '1.6';
    heroSubtitle.style.maxWidth = 'min(90vw, 600px)';
    heroSubtitle.style.whiteSpace = 'normal';
    heroSubtitle.style.overflowWrap = 'break-word';

    // ===== SOBRE =====
    document.getElementById('dom-about-title').textContent = store.about.title;
    document.getElementById('dom-about-text').innerHTML = store.about.text
        .split('\n')
        .map(p => p.trim())
        .filter(p => p)
        .map(p => `<p>${p}</p>`)
        .join('');

    // Imagens do Sobre (array ou single)
    const aboutImagesContainer = document.getElementById('dom-about-images');
    const aboutImages = store.about.images?.length > 0 ? store.about.images : (store.about.image ? [{ image: store.about.image, posX: 50, posY: 50, scale: 1 }] : []);

    if (aboutImages.length > 0) {
        const cols = aboutImages.length === 1 ? '' : aboutImages.length === 2 ? 'grid-cols-2' : 'grid-cols-2';
        aboutImagesContainer.className = `grid gap-4 ${cols}`;
        aboutImagesContainer.innerHTML = aboutImages.map((img, idx) => {
            const posX = img.posX ?? 50;
            const posY = img.posY ?? 50;
            const scale = img.scale ?? 1;
            return `
                <div class="aspect-square bg-gray-200 rounded-2xl overflow-hidden shadow-2xl">
                    <img src="${resolveImagePath(img.image)}" alt="Sobre ${idx + 1}" loading="lazy"
                        class="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        style="object-position:${posX}% ${posY}%; transform:scale(${scale});"
                        onmouseenter="this.style.transform='scale(${scale * 1.05})'"
                        onmouseleave="this.style.transform='scale(${scale})'">
                </div>
            `;
        }).join('');
    }

    // ===== PORTFOLIO =====
    const portfolioGrid = document.getElementById('dom-portfolio-grid');
    portfolioGrid.innerHTML = store.portfolio.map((item, idx) => {
        const posX = item.posX ?? 50;
        const posY = item.posY ?? 50;
        const scale = item.scale ?? 1;
        const ratio = item.ratio ?? '3/4';
        return `
        <div class="overflow-hidden cursor-pointer group" style="aspect-ratio:${ratio};">
            <img src="${resolveImagePath(item.image)}" alt="Portfolio ${idx + 1}"
                loading="lazy" class="w-full h-full object-cover transition-transform duration-700"
                style="object-position: ${posX}% ${posY}%; transform: scale(${scale});"
                onmouseenter="this.style.transform='scale(${scale * 1.05})'"
                onmouseleave="this.style.transform='scale(${scale})'" />
        </div>
    `}).join('');

    // ===== ALBUNS =====
    const albumsSorted = [...(store.albums || [])].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });
    albumsCache = albumsSorted;

    const albumCard = (album, idx, dark = false) => {
        const cover = album.cover || album.photos?.[0] || '';
        const title = album.title || 'Álbum';
        const subtitle = album.subtitle || '';
        const textClass = dark ? 'text-white' : 'text-neutral-900';
        const subClass = dark ? 'text-neutral-400' : 'text-neutral-500';
        return `
            <div onclick="openAlbum(${idx})" class="group cursor-pointer">
                <div class="aspect-[4/5] rounded-xl overflow-hidden mb-4 relative shadow-2xl bg-black">
                    <img src="${resolveImagePath(cover)}" loading="lazy" class="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                        <span class="text-white text-xs border border-white/30 px-3 py-1 rounded-full">VER ÁLBUM</span>
                    </div>
                </div>
                ${subtitle ? `<p class="${subClass} text-[10px] uppercase tracking-widest mb-1">${subtitle}</p>` : ''}
                <h4 class="font-serif text-lg ${textClass} group-hover:text-gray-300">${title}</h4>
            </div>
        `;
    };

    const recentContainer = document.getElementById('dom-recent-albums');
    if (recentContainer) {
        recentContainer.innerHTML = albumsSorted.length
            ? albumsSorted.slice(0, 4).map((album, idx) => albumCard(album, idx, true)).join('')
            : '<p class="text-gray-400 text-sm">Nenhum álbum disponível ainda.</p>';
    }

    // ===== ESTUDIO =====
    const studioPhotosGrid = document.getElementById('dom-studio-photos');
    const photos = store.studio.photos || [];

    // Ajustar grid baseado na quantidade de fotos
    const gridCols = photos.length === 1 ? 'grid-cols-1' :
                    photos.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                    photos.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
                    'grid-cols-2 md:grid-cols-2 lg:grid-cols-4';
    studioPhotosGrid.className = `grid ${gridCols} gap-6 mb-16`;

    studioPhotosGrid.innerHTML = photos.map((photo, idx) => {
        const posX = photo.posX ?? 50;
        const posY = photo.posY ?? 50;
        const scale = photo.scale ?? 1;
        return `
        <div class="aspect-video bg-gray-200 rounded-2xl overflow-hidden shadow-lg group">
            <img src="${resolveImagePath(photo.image)}" alt="Estúdio ${idx + 1}"
                loading="lazy" class="w-full h-full object-cover transition-transform duration-500"
                style="object-position: ${posX}% ${posY}%; transform: scale(${scale});"
                onmouseenter="this.style.transform='scale(${scale * 1.05})'"
                onmouseleave="this.style.transform='scale(${scale})'" />
        </div>
    `}).join('');

    // Video do estudio
    const studioVideoContainer = document.getElementById('dom-studio-video');
    if (studioVideoContainer) {
        if (store.studio.videoUrl) {
            studioVideoContainer.innerHTML = `
                <div class="aspect-video rounded-2xl overflow-hidden shadow-lg bg-black">
                    <video src="${resolveImagePath(store.studio.videoUrl)}" controls playsinline
                        class="w-full h-full object-contain"
                        poster="">
                        Seu navegador nao suporta video HTML5.
                    </video>
                </div>
            `;
            studioVideoContainer.style.display = '';
        } else {
            studioVideoContainer.style.display = 'none';
        }
    }

    if (store.studio.title) {
        document.getElementById('dom-studio-title').textContent = store.studio.title;
    }
    if (store.studio.description) {
        document.getElementById('dom-studio-description').textContent = store.studio.description;
    }
    document.getElementById('dom-studio-address').textContent = store.studio.address;
    document.getElementById('dom-studio-hours').innerHTML = store.studio.hours
        .split('\n')
        .map(h => h.trim())
        .filter(h => h)
        .join('<br>');

    // Mapa dinamico baseado no endereco
    const mapIframe = document.getElementById('dom-studio-map');
    if (mapIframe && store.studio.address) {
        const encodedAddress = encodeURIComponent(store.studio.address);
        mapIframe.src = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodedAddress}`;
    }

    // ===== FOOTER =====
    if (store.footer) {
        // Redes Sociais
        const footerSocial = document.getElementById('footer-social');
        if (footerSocial && store.footer.socialMedia) {
            footerSocial.innerHTML = '';
            const socials = store.footer.socialMedia;
            const platforms = [
                { name: 'Instagram', key: 'instagram', icon: 'instagram' },
                { name: 'Facebook', key: 'facebook', icon: 'facebook' },
                { name: 'LinkedIn', key: 'linkedin', icon: 'linkedin' },
                { name: 'TikTok', key: 'tiktok', icon: 'music' },
                { name: 'YouTube', key: 'youtube', icon: 'youtube' },
            ];

            platforms.forEach(platform => {
                if (socials[platform.key]) {
                    const link = document.createElement('a');
                    link.href = socials[platform.key];
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.className = 'inline-flex items-center justify-center w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors';
                    link.innerHTML = `<i data-lucide="${platform.icon}" class="w-5 h-5"></i>`;
                    footerSocial.appendChild(link);
                }
            });

            // Email
            if (socials.email) {
                const emailLink = document.createElement('a');
                emailLink.href = `mailto:${socials.email}`;
                emailLink.className = 'inline-flex items-center justify-center w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors';
                emailLink.innerHTML = `<i data-lucide="mail" class="w-5 h-5"></i>`;
                footerSocial.appendChild(emailLink);
            }

        }

        // Links Uteis
        const footerLinks = document.getElementById('footer-links');
        if (footerLinks && store.footer.quickLinks) {
            footerLinks.innerHTML = '';
            store.footer.quickLinks.forEach(link => {
                const a = document.createElement('a');
                a.href = link.url || '#';
                a.textContent = link.label || 'Link';
                a.className = 'block hover:text-white transition-colors text-sm';
                footerLinks.appendChild(a);
            });
        }

        // Contato (vindo de studio)
        const footerContact = document.getElementById('footer-contact');
        if (footerContact && store.studio) {
            footerContact.innerHTML = '';

            if (store.studio.address) {
                const addr = document.createElement('div');
                addr.innerHTML = `<strong class="text-white">Localização</strong><p class="text-xs mt-1">${store.studio.address}</p>`;
                footerContact.appendChild(addr);
            }

            if (store.studio.hours) {
                const hrs = document.createElement('div');
                hrs.innerHTML = `<strong class="text-white">Horário</strong><p class="text-xs mt-1">${store.studio.hours.replace(/\n/g, '<br>')}</p>`;
                footerContact.appendChild(hrs);
            }

            if (store.studio.whatsapp) {
                const wa = document.createElement('div');
                wa.innerHTML = `<strong class="text-white">WhatsApp</strong><p><a href="https://wa.me/${store.studio.whatsapp}" class="text-xs text-green-400 hover:text-green-300">${store.studio.whatsapp}</a></p>`;
                footerContact.appendChild(wa);
            }
        }

        // Newsletter
        const newsletterTitle = document.getElementById('footer-newsletter-title');
        const newsletterDesc = document.getElementById('footer-newsletter-desc');
        if (store.footer.newsletter) {
            if (newsletterTitle && store.footer.newsletter.title) {
                newsletterTitle.textContent = store.footer.newsletter.title;
            }
            if (newsletterDesc && store.footer.newsletter.description) {
                newsletterDesc.textContent = store.footer.newsletter.description;
            }
        }

        // Copyright
        const footerCopyright = document.getElementById('footer-copyright');
        if (footerCopyright && store.footer.copyright) {
            footerCopyright.textContent = store.footer.copyright;
        }
    }

    // Render all icons once at end
    lucide.createIcons();
}

function openAlbum(index) {
    const album = albumsCache[index];
    if (!album) return;

    const modal = document.getElementById('album-modal');
    const title = document.getElementById('album-modal-title');
    const subtitle = document.getElementById('album-modal-subtitle');
    const photosGrid = document.getElementById('album-modal-photos');

    title.textContent = album.title || 'Álbum';
    subtitle.textContent = album.subtitle || '';
    photosGrid.innerHTML = (album.photos || []).map(url => `
        <div class="break-inside-avoid">
            <img src="${resolveImagePath(url)}" class="w-full h-auto rounded-lg" />
        </div>
    `).join('');

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    lucide.createIcons();
}

function closeAlbum() {
    const modal = document.getElementById('album-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// ========== WHATSAPP WIDGET ==========
let bubbleClosed = false;
let currentMessageIndex = 0;
let messageTimeouts = [];

function openWhatsapp() {
    const whatsappNumber = store.studio.whatsapp || '5511999999999';
    const defaultText = 'Olá! Vi seu site e gostaria de mais informações.';
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(defaultText)}`;
    if (typeof fbq === 'function') fbq('track', 'Contact');
    window.open(whatsappUrl, '_blank');
}

function getWhatsappMessages() {
    const messages = store.studio.whatsappMessages;
    if (Array.isArray(messages) && messages.length > 0) {
        return messages;
    }
    return [{ text: 'Olá! Como posso ajudar você hoje?', delay: 5 }];
}

function showWhatsappMessage(index) {
    if (bubbleClosed) return;

    const messages = getWhatsappMessages();
    if (index >= messages.length) {
        // Reiniciar ciclo apos uma pausa
        currentMessageIndex = 0;
        messageTimeouts.push(setTimeout(() => showWhatsappMessage(0), 10000));
        return;
    }

    const bubble = document.getElementById('whatsapp-bubble');
    const greetingEl = document.getElementById('whatsapp-greeting');

    if (bubble && greetingEl) {
        const message = messages[index];

        // Animar saida se ja estiver visivel
        if (!bubble.classList.contains('hidden')) {
            bubble.style.opacity = '0';
            bubble.style.transform = 'translateY(10px)';

            setTimeout(() => {
                greetingEl.textContent = message.text;
                bubble.style.opacity = '1';
                bubble.style.transform = 'translateY(0)';
            }, 200);
        } else {
            greetingEl.textContent = message.text;
            bubble.classList.remove('hidden');
        }

        currentMessageIndex = index;

        // Agendar proxima mensagem
        const nextDelay = (message.delay || 5) * 1000;
        messageTimeouts.push(setTimeout(() => {
            showWhatsappMessage(index + 1);
        }, nextDelay));
    }
}

function startWhatsappMessages() {
    if (bubbleClosed) return;

    const messages = getWhatsappMessages();
    if (messages.length === 0) return;

    // Primeira mensagem apos o delay configurado
    const firstDelay = (messages[0].delay || 5) * 1000;
    messageTimeouts.push(setTimeout(() => {
        showWhatsappMessage(0);
    }, firstDelay));
}

function closeWhatsappBubble() {
    const bubble = document.getElementById('whatsapp-bubble');
    if (bubble) {
        bubble.classList.add('hidden');
        bubbleClosed = true;
        // Cancelar todos os timeouts pendentes
        messageTimeouts.forEach(t => clearTimeout(t));
        messageTimeouts = [];
    }
}

async function loadRemoteData() {
    try {
        const [siteDataRes, heroRes] = await Promise.all([
            fetch('/api/site-data'),
            fetch('/api/hero')
        ]);

        const siteData = siteDataRes.ok ? await siteDataRes.json() : null;
        const heroData = heroRes.ok ? await heroRes.json() : null;

        // Combinar dados
        if (siteData) {
            if (heroData) {
                return { ...siteData, hero: heroData };
            }
            return siteData;
        }
        return null;
    } catch (error) {
        console.warn('Erro ao buscar dados do servidor:', error);
        return null;
    }
}

// ========== NEWSLETTER ==========
async function handleNewsletterSubscribe(event) {
    event.preventDefault();
    const form = event.target;
    const emailInput = form.querySelector('input[type="email"]');
    const button = form.querySelector('button[type="submit"]');
    const email = emailInput.value.trim();

    if (!email) {
        alert('Por favor, insira um email válido');
        return;
    }

    // Desabilitar botao durante o processo
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Inscrevendo...';

    try {
        const response = await fetch('/api/newsletter/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            // Limpar formulario
            emailInput.value = '';

            // Evento Meta Pixel
            if (!data.alreadySubscribed && typeof fbq === 'function') fbq('track', 'Subscribe');

            // Feedback de sucesso
            button.textContent = data.alreadySubscribed ? '✓ Já inscrito!' : '✓ Inscrito!';
            button.classList.remove('bg-gray-700', 'hover:bg-gray-600');
            button.classList.add('bg-green-600');

            console.log('Newsletter:', data.message);
        } else {
            throw new Error(data.error || 'Erro ao inscrever');
        }
    } catch (error) {
        console.error('Erro:', error);
        button.textContent = '✗ Erro';
        button.classList.remove('bg-gray-700', 'hover:bg-gray-600');
        button.classList.add('bg-red-600');
    }

    // Resetar botao apos 3 segundos
    setTimeout(() => {
        button.disabled = false;
        button.textContent = originalText;
        button.classList.remove('bg-green-600', 'bg-red-600');
        button.classList.add('bg-gray-700', 'hover:bg-gray-600');
    }, 3000);
}

// ========== SPLASH SCREEN ==========
function hideSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
        }, 700);
    }
}

// ========== FAQ ==========
let faqData = [];

async function loadFAQs() {
    try {
        const res = await fetch('/api/faq');
        if (!res.ok) throw new Error('Erro ao carregar FAQs');
        const data = await res.json();
        faqData = data.faqs || [];
        renderFAQs();
    } catch (error) {
        console.warn('Erro ao buscar FAQs:', error);
    }
}

function renderFAQs() {
    const accordion = document.getElementById('faq-accordion');
    if (!accordion) return;

    accordion.innerHTML = faqData.map((faq, index) => `
        <div class="faq-item bg-black/40 rounded-lg overflow-hidden">
            <div class="faq-question px-6 py-4 flex justify-between items-center" onclick="toggleFAQ(${index})">
                <h3 class="font-semibold text-lg pr-4">${faq.question}</h3>
                <i data-lucide="chevron-down" class="faq-icon w-5 h-5 flex-shrink-0 text-gray-400"></i>
            </div>
            <div class="faq-answer px-6">
                <div class="text-gray-300 leading-relaxed whitespace-pre-line">${faq.answer}</div>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

function toggleFAQ(index) {
    const items = document.querySelectorAll('.faq-item');
    const item = items[index];

    if (item.classList.contains('active')) {
        item.classList.remove('active');
    } else {
        // Fechar todos os outros
        items.forEach(i => i.classList.remove('active'));
        // Abrir o clicado
        item.classList.add('active');
    }
}

// ========== MOBILE MENU ==========
const mobileMenu = document.getElementById('mobile-menu');
const mobileMenuPanel = document.getElementById('mobile-menu-panel');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');

function openMobileMenu() {
    if (!mobileMenu || !mobileMenuPanel) return;
    mobileMenu.classList.remove('opacity-0', 'pointer-events-none');
    mobileMenuPanel.classList.remove('translate-y-2', 'opacity-0');
    document.body.classList.add('overflow-hidden');
    mobileMenuBtn?.setAttribute('aria-expanded', 'true');
}

function closeMobileMenu() {
    if (!mobileMenu || !mobileMenuPanel) return;
    mobileMenu.classList.add('opacity-0', 'pointer-events-none');
    mobileMenuPanel.classList.add('translate-y-2', 'opacity-0');
    document.body.classList.remove('overflow-hidden');
    mobileMenuBtn?.setAttribute('aria-expanded', 'false');
}

function toggleMobileMenu() {
    if (!mobileMenu) return;
    const isOpen = !mobileMenu.classList.contains('pointer-events-none');
    if (isOpen) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

mobileMenuBtn?.addEventListener('click', toggleMobileMenu);
mobileMenu?.addEventListener('click', (event) => {
    if (event.target === mobileMenu) {
        closeMobileMenu();
    }
});
document.querySelectorAll('[data-close-mobile]')?.forEach((link) => {
    link.addEventListener('click', () => closeMobileMenu());
});

// ========== META PIXEL (dinâmico) ==========
function initMetaPixel(pixelId) {
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', pixelId);
    fbq('track', 'PageView');
}

// ========== INIT ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    try {
        // Checar manutencao e carregar config (pular manutencao se URL tem ?preview)
        const isPreview = new URLSearchParams(window.location.search).has('preview');
        try {
            const configRes = await fetch(`/api/site-config?t=${Date.now()}`);
            if (configRes.ok) {
                const config = await configRes.json();
                if (!isPreview && config.maintenance?.enabled) {
                    showMaintenanceScreen(config.maintenance);
                    return;
                }
                // Injetar Meta Pixel dinamicamente
                if (config.metaPixelId) {
                    initMetaPixel(config.metaPixelId);
                }
            }
        } catch (e) { /* ignora erro de config */ }

        const remote = await loadRemoteData();
        store = processRemoteData(remote);
        if (store) {
            render();
            startWhatsappMessages();
            loadFAQs();
        } else {
            console.warn('Nenhum dado disponível do servidor');
        }
    } finally {
        hideSplashScreen();
    }
}

function showMaintenanceScreen(maintenance) {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.style.display = 'none';

    const photos = maintenance.carouselPhotos || [];
    const hasPhotos = photos.length > 0;

    document.body.innerHTML = `
        <div style="position:fixed; inset:0; background:#000; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:2rem; z-index:9999; overflow-y:auto;">
            <div style="flex-shrink:0;">
                <h1 style="font-family:'Playfair Display',serif; font-size:2rem; font-weight:bold; color:white; margin-bottom:0.5rem;">FS FOTOGRAFIAS</h1>
                <div style="width:3rem; height:1px; background:#374151; margin:1.5rem auto;"></div>
                <h2 style="font-size:1.5rem; color:#f3f4f6; margin-bottom:1rem;">${maintenance.title || 'Site em Manutencao'}</h2>
                <p style="color:#9ca3af; font-size:1rem; max-width:30rem; line-height:1.6; margin:0 auto;">${maintenance.message || 'Estamos realizando manutencao. Volte em breve!'}</p>
            </div>
            ${hasPhotos ? `
                <div style="width:100%; max-width:50rem; margin-top:2.5rem; position:relative; overflow:hidden; border-radius:0.75rem;">
                    <div id="carouselTrack" style="display:flex; transition:transform 0.5s ease; will-change:transform;">
                        ${photos.map(p => `
                            <div style="min-width:100%; position:relative; overflow:hidden; aspect-ratio:16/9;">
                                <img src="${resolveImagePath(p.url)}" style="width:100%; height:100%; object-fit:cover; display:block; pointer-events:none; user-select:none; object-position:${p.posX ?? 50}% ${p.posY ?? 50}%; transform:scale(${p.scale ?? 1}); transform-origin:${p.posX ?? 50}% ${p.posY ?? 50}%;" draggable="false">
                            </div>
                        `).join('')}
                    </div>
                    ${photos.length > 1 ? `
                        <button id="carouselPrev" style="position:absolute; left:0.75rem; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.6); color:white; border:none; width:2.5rem; height:2.5rem; border-radius:9999px; cursor:pointer; font-size:1.25rem; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);">&#10094;</button>
                        <button id="carouselNext" style="position:absolute; right:0.75rem; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.6); color:white; border:none; width:2.5rem; height:2.5rem; border-radius:9999px; cursor:pointer; font-size:1.25rem; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);">&#10095;</button>
                        <div id="carouselDots" style="position:absolute; bottom:0.75rem; left:50%; transform:translateX(-50%); display:flex; gap:0.5rem;">
                            ${photos.map((_, i) => `<span class="carousel-dot" data-idx="${i}" style="width:0.5rem; height:0.5rem; border-radius:9999px; background:${i === 0 ? 'white' : 'rgba(255,255,255,0.4)'}; cursor:pointer; transition:background 0.3s;"></span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;

    // Carrossel interativo
    if (hasPhotos && photos.length > 1) {
        let currentSlide = 0;
        const track = document.getElementById('carouselTrack');
        const dots = document.querySelectorAll('.carousel-dot');
        const total = photos.length;

        function goToSlide(idx) {
            currentSlide = ((idx % total) + total) % total;
            track.style.transform = `translateX(-${currentSlide * 100}%)`;
            dots.forEach((d, i) => {
                d.style.background = i === currentSlide ? 'white' : 'rgba(255,255,255,0.4)';
            });
        }

        document.getElementById('carouselPrev').onclick = () => goToSlide(currentSlide - 1);
        document.getElementById('carouselNext').onclick = () => goToSlide(currentSlide + 1);
        dots.forEach(d => { d.onclick = () => goToSlide(parseInt(d.dataset.idx)); });

        // Auto-play a cada 4 segundos
        setInterval(() => goToSlide(currentSlide + 1), 4000);

        // Swipe touch
        let touchStartX = 0;
        track.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
        track.addEventListener('touchend', (e) => {
            const diff = touchStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) goToSlide(currentSlide + (diff > 0 ? 1 : -1));
        }, { passive: true });
    }
}

// ========== COMPARTILHAMENTO ==========
const SHARE_CONFIG = {
    portfolio: {
        title: 'Galeria | FS FOTOGRAFIAS',
        text: 'Confira essa galeria de fotos incrivel!',
        hash: '#portfolio'
    },
    albums: {
        title: 'Albuns | FS FOTOGRAFIAS',
        text: 'Veja os albuns de fotos da FS FOTOGRAFIAS!',
        hash: '#albums'
    },
    estudio: {
        title: 'Estudio | FS FOTOGRAFIAS',
        text: 'Conheca o estudio da FS FOTOGRAFIAS!',
        hash: '#estudio'
    }
};

function shareSection(section) {
    const config = SHARE_CONFIG[section];
    if (!config) return;

    const url = window.location.origin + '/' + config.hash;
    doShare(config.title, config.text, url);
}

function shareAlbum() {
    const titleEl = document.getElementById('album-modal-title');
    const albumTitle = titleEl ? titleEl.textContent : 'Album';
    const url = window.location.origin + '/#albums';
    doShare(
        `${albumTitle} | FS FOTOGRAFIAS`,
        `Veja o album "${albumTitle}" da FS FOTOGRAFIAS!`,
        url
    );
}

function doShare(title, text, url) {
    // Tentar Web Share API (nativo em celulares)
    if (navigator.share) {
        navigator.share({ title, text, url }).catch(() => {});
        return;
    }
    // Fallback: mostrar dropdown
    showShareDropdown(title, text, url);
}

function showShareDropdown(title, text, url) {
    // Remover dropdown anterior se existir
    const existing = document.getElementById('share-dropdown-global');
    if (existing) { existing.remove(); return; }

    const encodedText = encodeURIComponent(text + ' ' + url);
    const encodedUrl = encodeURIComponent(url);

    const dropdown = document.createElement('div');
    dropdown.id = 'share-dropdown-global';
    dropdown.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#fff; border-radius:1rem; box-shadow:0 20px 60px rgba(0,0,0,0.3); min-width:280px; z-index:200; overflow:hidden;';
    dropdown.innerHTML = `
        <div style="padding:1rem 1.25rem; border-bottom:1px solid #f3f4f6; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:600; font-size:0.9375rem; color:#1a1a1a;">Compartilhar</span>
            <button onclick="document.getElementById('share-dropdown-global').remove()" style="background:none; border:none; cursor:pointer; padding:0.25rem; color:#9ca3af; font-size:1.25rem;">&times;</button>
        </div>
        <div style="padding:0.5rem 0;">
            <a href="https://wa.me/?text=${encodedText}" target="_blank" rel="noopener" style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1.25rem; color:#374151; text-decoration:none; transition:background 0.15s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='transparent'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
            </a>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noopener" style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1.25rem; color:#374151; text-decoration:none; transition:background 0.15s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='transparent'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
            </a>
            <button onclick="copyShareLink('${url}')" style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1.25rem; color:#374151; background:none; border:none; cursor:pointer; width:100%; font-size:0.8125rem; transition:background 0.15s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='transparent'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copiar link
            </button>
        </div>
    `;

    document.body.appendChild(dropdown);

    // Fechar ao clicar fora
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!dropdown.contains(e.target)) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 10);
}

function copyShareLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        const dropdown = document.getElementById('share-dropdown-global');
        if (dropdown) {
            const btn = dropdown.querySelector('button:last-child');
            if (btn) {
                const original = btn.innerHTML;
                btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Link copiado!';
                btn.style.color = '#16a34a';
                setTimeout(() => { dropdown.remove(); }, 1000);
            }
        }
    });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
