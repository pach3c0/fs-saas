// Landing Page — editor visual da página pública da plataforma
import { addInlineToolbar, createRichEditor } from '../../../admin/js/utils/richtext.js';
import { apiRequest, saasToast, saasConfirm, esc, formatSize, getToken } from '../core.js';

// Mapa de instâncias RTE do landing editor (rebuilt a cada renderLandingEditor())
let _landingRtes = {};

// ============================================================================
// LANDING PAGE EDITOR
// ============================================================================

let landingData = null;

async function loadLandingEditor() {
  const el = document.getElementById('landingEditor');
  el.innerHTML = '<div class="loading">Carregando...</div>';

  try {
    const res = await apiRequest('GET', '/api/landing/config');
    landingData = res.data;
    renderLandingEditor();
  } catch (err) {
    el.innerHTML = `<div class="loading" style="color:#f87171;">Erro: ${err.message}</div>`;
  }
}

function renderLandingEditor() {
  const el = document.getElementById('landingEditor');
  const d = landingData;

  el.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">

      <!-- Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
        <h2 style="font-size:1.25rem; font-weight:700; color:#f1f5f9;">Editor da Landing Page</h2>
        <div style="display:flex; gap:0.75rem;">
          <a href="/landing" target="_blank" style="background:#1e3a5f; color:#93c5fd; padding:0.5rem 1rem; border-radius:0.375rem; font-size:0.8125rem; font-weight:500; text-decoration:none;">Ver Landing Page ↗</a>
          <button id="saveLandingBtn" style="background:#6366f1; color:white; padding:0.5rem 1.25rem; border-radius:0.375rem; font-size:0.875rem; font-weight:600; border:none; cursor:pointer;">Salvar tudo</button>
        </div>
      </div>

      <!-- HERO -->
      ${landingSection('Hero', `
        ${field('Headline', 'heroHeadline', d.hero.headline)}
        ${field('Subheadline', 'heroSubheadline', d.hero.subheadline)}
        ${fieldRow([
          ['Texto do botao CTA', 'heroCtaText', d.hero.ctaText],
          ['Texto abaixo do botao', 'heroCtaSubtext', d.hero.ctaSubtext]
        ])}
      `)}

      <!-- COMO FUNCIONA -->
      ${landingSection('Como Funciona', `
        ${field('Titulo da secao', 'howTitle', d.howItWorks.title)}
        <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem;">
          ${d.howItWorks.steps.map((s, i) => `
            <div style="background:#0f172a; border:1px solid #334155; border-radius:0.5rem; padding:1rem; display:grid; grid-template-columns:3rem 1fr 2fr; gap:0.75rem; align-items:center;">
              <input type="text" value="${esc(s.icon)}" id="stepIcon${i}" style="${inputStyle()}" placeholder="Emoji">
              <input type="text" value="${esc(s.title)}" id="stepTitle${i}" style="${inputStyle()}" placeholder="Titulo">
              <input type="text" value="${esc(s.description)}" id="stepDesc${i}" style="${inputStyle()}" placeholder="Descricao">
            </div>
          `).join('')}
        </div>
      `)}

      <!-- FUNCIONALIDADES -->
      ${landingSection('Funcionalidades', `
        ${field('Titulo da secao', 'featuresSectionTitle', d.features.title)}
        <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem;">
          ${d.features.items.map((f, i) => `
            <div style="background:#0f172a; border:1px solid #334155; border-radius:0.5rem; padding:1rem; display:grid; grid-template-columns:3rem 1fr 2fr auto; gap:0.75rem; align-items:center;">
              <input type="text" value="${esc(f.icon)}" id="featIcon${i}" style="${inputStyle()}" placeholder="Emoji">
              <input type="text" value="${esc(f.title)}" id="featTitle${i}" style="${inputStyle()}" placeholder="Titulo">
              <input type="text" value="${esc(f.description)}" id="featDesc${i}" style="${inputStyle()}" placeholder="Descricao">
              <label style="display:flex; align-items:center; gap:0.375rem; font-size:0.75rem; color:#94a3b8; cursor:pointer; white-space:nowrap;">
                <input type="checkbox" id="featActive${i}" ${f.active !== false ? 'checked' : ''}> Ativo
              </label>
            </div>
          `).join('')}
        </div>
      `)}

      <!-- PLANOS -->
      ${landingSection('Planos e Precos', `
        ${fieldRow([
          ['Titulo', 'plansTitle', d.plans.title],
          ['Subtitulo', 'plansSub', d.plans.subtitle]
        ])}
        <div style="display:flex; flex-direction:column; gap:1rem; margin-top:0.75rem;">
          ${d.plans.items.map((p, i) => `
            <div style="background:#0f172a; border:1px solid ${p.highlighted ? '#6366f1' : '#334155'}; border-radius:0.5rem; padding:1.25rem;">
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr auto; gap:0.75rem; margin-bottom:0.75rem; align-items:center;">
                <input type="text" value="${esc(p.name)}" id="planName${i}" style="${inputStyle()}" placeholder="Nome">
                <input type="text" value="${esc(p.price)}" id="planPrice${i}" style="${inputStyle()}" placeholder="Preco (ex: R$ 49)">
                <input type="text" value="${esc(p.period)}" id="planPeriod${i}" style="${inputStyle()}" placeholder="Periodo (ex: por mes)">
                <label style="display:flex; align-items:center; gap:0.375rem; font-size:0.75rem; color:#94a3b8; cursor:pointer; white-space:nowrap;">
                  <input type="checkbox" id="planHL${i}" ${p.highlighted ? 'checked' : ''}> Destaque
                </label>
              </div>
              <input type="text" value="${esc(p.description)}" id="planDesc${i}" style="${inputStyle()} width:100%; margin-bottom:0.5rem;" placeholder="Descricao">
              <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:0.375rem;">Features (uma por linha):</label>
              <textarea id="planFeatures${i}" rows="5" style="${inputStyle()} width:100%; resize:vertical;">${p.features.join('\n')}</textarea>
            </div>
          `).join('')}
        </div>
      `)}

      <!-- DEPOIMENTOS -->
      ${landingSection('Depoimentos', `
        ${field('Titulo da secao', 'testimonTitle', d.testimonials.title)}
        <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem;" id="testimonialsList">
          ${d.testimonials.items.map((t, i) => renderTestimonialRow(t, i)).join('')}
        </div>
        <button onclick="addTestimonial()" style="margin-top:0.75rem; background:#16a34a; color:white; border:none; border-radius:0.375rem; padding:0.5rem 1rem; font-size:0.8125rem; font-weight:600; cursor:pointer;">+ Adicionar depoimento</button>
      `)}

      <!-- FAQ -->
      ${landingSection('FAQ', `
        ${field('Titulo da secao', 'faqTitle', d.faq.title)}
        <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem;" id="faqList">
          ${d.faq.items.map((f, i) => renderFaqRow(f, i)).join('')}
        </div>
        <button onclick="addFaq()" style="margin-top:0.75rem; background:#16a34a; color:white; border:none; border-radius:0.375rem; padding:0.5rem 1rem; font-size:0.8125rem; font-weight:600; cursor:pointer;">+ Adicionar pergunta</button>
      `)}

      <!-- SOLUÇÕES -->
      ${landingSection('Soluções', `
        ${fieldRow([
          ['Título da seção', 'solutionsTitle', (d.solutions || {}).title || ''],
          ['Subtítulo', 'solutionsSub', (d.solutions || {}).subtitle || '']
        ])}
        <div style="display:flex; flex-direction:column; gap:1rem; margin-top:0.75rem;" id="solutionsList">
          ${((d.solutions || {}).items || []).map((s, i) => renderSolutionCard(s, i)).join('')}
        </div>
        <button onclick="addSolution()" style="margin-top:1rem; background:#16a34a; color:white; border:none; border-radius:0.375rem; padding:0.5rem 1.25rem; font-size:0.8125rem; font-weight:600; cursor:pointer;">+ Novo Card</button>
      `)}

      <!-- CTA FINAL -->
      ${landingSection('CTA Final', `
        ${field('Titulo', 'ctaTitle', d.cta.title)}
        ${field('Subtitulo', 'ctaSub', d.cta.subtitle)}
        ${field('Texto do botao', 'ctaBtn', d.cta.buttonText)}
      `)}

      <!-- FOOTER -->
      ${landingSection('Footer', `
        ${field('Texto do rodape', 'footerText', d.footer.text)}
      `)}

    </div>
  `;

  document.getElementById('saveLandingBtn').onclick = saveLanding;

  // Inicializa rich text editors após o HTML estar no DOM
  _landingRtes = {};
  applyRteToLandingEditor();

  // Inicializa drag & drop nos cards de soluções
  setupSolutionsDragDrop();
}

function landingSection(title, content) {
  return `
    <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; padding:1.5rem;">
      <h3 style="font-size:0.875rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:1.25rem;">${title}</h3>
      ${content}
    </div>
  `;
}

function field(label, id, value, type = 'text') {
  return `
    <div style="margin-bottom:0.875rem;">
      <label style="display:block; font-size:0.75rem; font-weight:500; color:#94a3b8; margin-bottom:0.375rem;">${label}</label>
      <input type="${type}" id="${id}" value="${esc(value || '')}" style="${inputStyle()} width:100%;">
    </div>
  `;
}

function fieldRow(fields) {
  return `
    <div style="display:grid; grid-template-columns:repeat(${fields.length}, 1fr); gap:0.75rem; margin-bottom:0.875rem;">
      ${fields.map(([label, id, value]) => `
        <div>
          <label style="display:block; font-size:0.75rem; font-weight:500; color:#94a3b8; margin-bottom:0.375rem;">${label}</label>
          <input type="text" id="${id}" value="${esc(value || '')}" style="${inputStyle()} width:100%;">
        </div>
      `).join('')}
    </div>
  `;
}

function inputStyle() {
  return 'padding:0.5rem 0.75rem; border:1px solid #334155; border-radius:0.375rem; background:#0f172a; color:#f1f5f9; font-size:0.8125rem;';
}

function renderTestimonialRow(t, i) {
  return `
    <div id="testimonialRow${i}" style="background:#0f172a; border:1px solid #334155; border-radius:0.5rem; padding:1rem; display:flex; flex-direction:column; gap:0.625rem;">
      <div style="display:grid; grid-template-columns:1fr 1fr auto auto; gap:0.5rem; align-items:center;">
        <input type="text" value="${esc(t.author)}" id="testimonAuthor${i}" style="${inputStyle()} width:100%;" placeholder="Nome do autor">
        <input type="text" value="${esc(t.role)}" id="testimonRole${i}" style="${inputStyle()} width:100%;" placeholder="Funcao">
        <label style="display:flex; align-items:center; gap:0.25rem; font-size:0.75rem; color:#94a3b8; cursor:pointer; white-space:nowrap;">
          <input type="checkbox" id="testimonActive${i}" ${t.active !== false ? 'checked' : ''}> Ativo
        </label>
        <button onclick="removeTestimonial(${i})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.125rem; padding:0.25rem;" title="Remover">×</button>
      </div>
      <div style="font-size:0.7rem; color:#94a3b8; margin-bottom:0.125rem;">Texto do depoimento</div>
      <div id="testimonTextWrap${i}"></div>
    </div>
  `;
}

function renderFaqRow(f, i) {
  return `
    <div id="faqRow${i}" style="background:#0f172a; border:1px solid #334155; border-radius:0.5rem; padding:1rem; display:flex; flex-direction:column; gap:0.625rem;">
      <div style="display:grid; grid-template-columns:1fr auto auto; gap:0.5rem; align-items:center;">
        <input type="text" value="${esc(f.question)}" id="faqQ${i}" style="${inputStyle()} width:100%;" placeholder="Pergunta">
        <label style="display:flex; align-items:center; gap:0.25rem; font-size:0.75rem; color:#94a3b8; cursor:pointer; white-space:nowrap;">
          <input type="checkbox" id="faqActive${i}" ${f.active !== false ? 'checked' : ''}> Ativo
        </label>
        <button onclick="removeFaq(${i})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.125rem; padding:0.25rem;" title="Remover">×</button>
      </div>
      <div style="font-size:0.7rem; color:#94a3b8; margin-bottom:0.125rem;">Resposta</div>
      <div id="faqAWrap${i}"></div>
    </div>
  `;
}

window.addTestimonial = () => {
  landingData.testimonials.items.push({ text: '', author: '', role: '', active: true });
  renderLandingEditor();
  document.getElementById('landingEditor').scrollTop = 99999;
};

window.removeTestimonial = (i) => {
  landingData.testimonials.items.splice(i, 1);
  renderLandingEditor();
};

window.addFaq = () => {
  landingData.faq.items.push({ question: '', answer: '', active: true });
  renderLandingEditor();
};

window.removeFaq = (i) => {
  landingData.faq.items.splice(i, 1);
  renderLandingEditor();
};

// ── Helpers Soluções ──
function renderSolutionCard(s, i) {
  const subHtml = (s.subItems || []).map((sub, j) => `
    <div style="display:grid; grid-template-columns:1fr 2fr auto; gap:0.5rem; align-items:center; margin-bottom:0.375rem;">
      <input type="text" value="${esc(sub.name)}" id="subName${i}_${j}"
        style="${inputStyle()} width:100%;" placeholder="Nome (ex: Seleção)">
      <input type="text" value="${esc(sub.description)}" id="subDesc${i}_${j}"
        style="${inputStyle()} width:100%;" placeholder="Descrição curta">
      <button onclick="removeSubItem(${i},${j})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1rem; padding:0.25rem;" title="Remover">×</button>
    </div>
  `).join('');

  return `
    <div id="solutionCard${i}" data-sol-index="${i}" draggable="true"
      style="background:#0f172a; border:1px solid #334155; border-radius:0.5rem; padding:1.25rem; transition: opacity 0.2s, border-color 0.2s;">

      <!-- Linha topo: handle + ícone + título + ativo + excluir -->
      <div style="display:grid; grid-template-columns:1.5rem 3rem 1fr auto auto; gap:0.75rem; align-items:center; margin-bottom:0.875rem;">
        <!-- Handle de arraste -->
        <div class="sol-drag-handle" title="Arrastar para reordenar"
          style="color:#475569; font-size:1.1rem; cursor:grab; user-select:none; display:flex; align-items:center; justify-content:center; padding:0.25rem;">⠿</div>
        <input type="text" value="${esc(s.icon || '')}" id="solIcon${i}"
          style="${inputStyle()} text-align:center; font-size:1.25rem;" placeholder="📷">
        <input type="text" value="${esc(s.title || '')}" id="solTitle${i}"
          style="${inputStyle()} width:100%;" placeholder="Título do card">
        <label style="display:flex; align-items:center; gap:0.25rem; font-size:0.75rem; color:#94a3b8; cursor:pointer; white-space:nowrap;">
          <input type="checkbox" id="solActive${i}" ${s.active !== false ? 'checked' : ''}> Ativo
        </label>
        <button onclick="removeSolution(${i})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.125rem; padding:0.25rem;" title="Remover card">×</button>
      </div>

      <input type="text" value="${esc(s.description || '')}" id="solDesc${i}"
        style="${inputStyle()} width:100%; margin-bottom:1rem;" placeholder="Descrição do card">
      <div style="font-size:0.7rem; color:#94a3b8; margin-bottom:0.5rem;">Sub-itens:</div>
      <div id="subItemsList${i}">${subHtml}</div>
      <button onclick="addSubItem(${i})" style="margin-top:0.5rem; background:rgba(99,102,241,0.15); color:#a5b4fc; border:1px solid rgba(99,102,241,0.3); border-radius:0.25rem; padding:0.3rem 0.75rem; font-size:0.75rem; font-weight:600; cursor:pointer;">+ Add sub-item</button>
    </div>
  `;
}

// ── Drag & Drop para reordenar soluções ──
function setupSolutionsDragDrop() {
  const list = document.getElementById('solutionsList');
  if (!list) return;

  let dragSrcIndex = null;

  list.querySelectorAll('[data-sol-index]').forEach(card => {
    const idx = parseInt(card.dataset.solIndex);

    // Só inicia drag quando clica no handle
    const handle = card.querySelector('.sol-drag-handle');
    if (handle) {
      handle.addEventListener('mousedown', () => { card.draggable = true; });
      // Volta draggable=false quando soltar para não interferir nos inputs
      card.addEventListener('dragend', () => { card.draggable = false; });
      // Inicialmente não draggable (evita conflito com inputs/textareas)
      card.draggable = false;
    }

    card.addEventListener('dragstart', (e) => {
      dragSrcIndex = idx;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', idx);
      setTimeout(() => { card.style.opacity = '0.4'; }, 0);
    });

    card.addEventListener('dragend', () => {
      card.style.opacity = '1';
      card.style.borderColor = '#334155';
      list.querySelectorAll('[data-sol-index]').forEach(c => {
        c.style.borderColor = '#334155';
        c.style.transform = '';
      });
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      // Highlight do card alvo
      list.querySelectorAll('[data-sol-index]').forEach(c => { c.style.borderColor = '#334155'; });
      if (dragSrcIndex !== idx) {
        card.style.borderColor = '#6366f1';
      }
    });

    card.addEventListener('dragleave', () => {
      card.style.borderColor = '#334155';
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragSrcIndex === null || dragSrcIndex === idx) return;

      // Lê os valores atuais dos inputs ANTES de re-renderizar
      _syncSolutionsFromDOM();

      // Reordena o array
      const items = landingData.solutions.items;
      const moved = items.splice(dragSrcIndex, 1)[0];
      items.splice(idx, 0, moved);

      dragSrcIndex = null;
      renderLandingEditor();
      // Garante scroll na lista para mostrar o card movido
      setTimeout(() => {
        document.getElementById('solutionsList')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    });
  });
}

// ── Sincroniza DOM → landingData.solutions.items (para preservar edições antes do drag) ──
function _syncSolutionsFromDOM() {
  const items = (landingData.solutions || {}).items || [];
  items.forEach((s, i) => {
    s.icon        = document.getElementById(`solIcon${i}`)?.value        ?? s.icon;
    s.title       = document.getElementById(`solTitle${i}`)?.value       ?? s.title;
    s.description = document.getElementById(`solDesc${i}`)?.value       ?? s.description;
    s.active      = document.getElementById(`solActive${i}`)?.checked    ?? s.active;
    (s.subItems || []).forEach((sub, j) => {
      sub.name        = document.getElementById(`subName${i}_${j}`)?.value  ?? sub.name;
      sub.description = document.getElementById(`subDesc${i}_${j}`)?.value ?? sub.description;
    });
  });
}

window.addSolution = () => {
  _syncSolutionsFromDOM();
  if (!landingData.solutions) landingData.solutions = { title: '', subtitle: '', items: [] };
  landingData.solutions.items.push({ icon: '📷', title: '', description: '', subItems: [], active: true });
  renderLandingEditor();
  document.getElementById('landingEditor').scrollTop = 99999;
};

window.removeSolution = (i) => {
  _syncSolutionsFromDOM();
  landingData.solutions.items.splice(i, 1);
  renderLandingEditor();
};

window.addSubItem = (i) => {
  _syncSolutionsFromDOM();
  landingData.solutions.items[i].subItems = landingData.solutions.items[i].subItems || [];
  landingData.solutions.items[i].subItems.push({ name: '', description: '' });
  renderLandingEditor();
};

window.removeSubItem = (i, j) => {
  _syncSolutionsFromDOM();
  landingData.solutions.items[i].subItems.splice(j, 1);
  renderLandingEditor();
};

// ── Helper: lê valor de um campo (RTE ou input simples) ──
function _rteVal(key, inputId) {
  return _landingRtes[key]?.getValue() || document.getElementById(inputId)?.value || '';
}

// ── Aplica RTEs após renderLandingEditor() popular o DOM ──
function applyRteToLandingEditor() {
  const d = landingData;
  if (!d) return;

  // Hero — toolbar inline em Headline e Subheadline
  const headlineEl = document.getElementById('heroHeadline');
  if (headlineEl) {
    _landingRtes['heroHeadline'] = addInlineToolbar(headlineEl, null, {
      placeholder: 'Título principal da landing page',
      features: ['bold', 'italic', 'emoji'],
    });
    _landingRtes['heroHeadline'].setValue(d.hero.headline || '');
  }
  const subHeadlineEl = document.getElementById('heroSubheadline');
  if (subHeadlineEl) {
    _landingRtes['heroSubheadline'] = addInlineToolbar(subHeadlineEl, null, {
      placeholder: 'Subtítulo / proposta de valor',
      features: ['bold', 'italic', 'emoji'],
    });
    _landingRtes['heroSubheadline'].setValue(d.hero.subheadline || '');
  }

  // Steps — toolbar inline nas descrições
  d.howItWorks.steps.forEach((s, i) => {
    const el = document.getElementById(`stepDesc${i}`);
    if (el) {
      _landingRtes[`stepDesc${i}`] = addInlineToolbar(el, null, {
        placeholder: 'Descrição do passo',
        features: ['bold', 'italic'],
      });
      _landingRtes[`stepDesc${i}`].setValue(s.description || '');
    }
  });

  // Features — toolbar inline nas descrições
  d.features.items.forEach((f, i) => {
    const el = document.getElementById(`featDesc${i}`);
    if (el) {
      _landingRtes[`featDesc${i}`] = addInlineToolbar(el, null, {
        placeholder: 'Descrição da funcionalidade',
        features: ['bold', 'italic'],
      });
      _landingRtes[`featDesc${i}`].setValue(f.description || '');
    }
  });

  // Depoimentos — editor rico no campo texto
  d.testimonials.items.forEach((t, i) => {
    const wrap = document.getElementById(`testimonTextWrap${i}`);
    if (wrap) {
      _landingRtes[`testimonText${i}`] = createRichEditor(
        wrap,
        t.text || '',
        null,
        { placeholder: 'Texto do depoimento...', minHeight: 60, features: ['bold', 'italic', 'emoji', 'clear'] }
      );
    }
  });

  // FAQ — editor rico na resposta
  d.faq.items.forEach((f, i) => {
    const wrap = document.getElementById(`faqAWrap${i}`);
    if (wrap) {
      _landingRtes[`faqA${i}`] = createRichEditor(
        wrap,
        f.answer || '',
        null,
        { placeholder: 'Resposta completa...', minHeight: 70, features: ['bold', 'italic', 'underline', 'br', 'list', 'emoji', 'clear'] }
      );
    }
  });

  // CTA e Footer — toolbar inline
  ['ctaTitle', 'ctaSub', 'footerText'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const key = id;
    const vals = { ctaTitle: d.cta.title, ctaSub: d.cta.subtitle, footerText: d.footer.text };
    _landingRtes[key] = addInlineToolbar(el, null, {
      placeholder: el.placeholder || '',
      features: ['bold', 'italic', 'emoji'],
    });
    _landingRtes[key].setValue(vals[key] || '');
  });
}

async function saveLanding() {
  const btn = document.getElementById('saveLandingBtn');
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  try {
    const d = landingData;
    const solutions = ((landingData.solutions || {}).items || []).map((s, i) => ({
      icon: document.getElementById(`solIcon${i}`)?.value || s.icon || '',
      title: document.getElementById(`solTitle${i}`)?.value || s.title || '',
      description: document.getElementById(`solDesc${i}`)?.value || s.description || '',
      active: document.getElementById(`solActive${i}`)?.checked !== false,
      subItems: (s.subItems || []).map((sub, j) => ({
        name: document.getElementById(`subName${i}_${j}`)?.value || sub.name || '',
        description: document.getElementById(`subDesc${i}_${j}`)?.value || sub.description || '',
      })),
    }));

    const steps = d.howItWorks.steps.map((s, i) => ({
      icon: document.getElementById(`stepIcon${i}`)?.value || '',
      title: document.getElementById(`stepTitle${i}`)?.value || '',
      description: _rteVal(`stepDesc${i}`, `stepDesc${i}`) || s.description,
    }));

    const features = d.features.items.map((f, i) => ({
      icon: document.getElementById(`featIcon${i}`)?.value || '',
      title: document.getElementById(`featTitle${i}`)?.value || '',
      description: _rteVal(`featDesc${i}`, `featDesc${i}`) || f.description,
      active: document.getElementById(`featActive${i}`)?.checked !== false,
    }));

    const plans = d.plans.items.map((p, i) => ({
      name: document.getElementById(`planName${i}`)?.value || '',
      price: document.getElementById(`planPrice${i}`)?.value || '',
      period: document.getElementById(`planPeriod${i}`)?.value || '',
      description: document.getElementById(`planDesc${i}`)?.value || '',
      highlighted: document.getElementById(`planHL${i}`)?.checked || false,
      features: (document.getElementById(`planFeatures${i}`)?.value || '').split('\n').filter(f => f.trim()),
    }));

    const testimonials = d.testimonials.items.map((t, i) => ({
      text: _rteVal(`testimonText${i}`, `testimonText${i}`) || t.text,
      author: document.getElementById(`testimonAuthor${i}`)?.value || '',
      role: document.getElementById(`testimonRole${i}`)?.value || '',
      active: document.getElementById(`testimonActive${i}`)?.checked !== false,
    }));

    const faqs = d.faq.items.map((f, i) => ({
      question: document.getElementById(`faqQ${i}`)?.value || '',
      answer: _rteVal(`faqA${i}`, `faqA${i}`) || f.answer,
      active: document.getElementById(`faqActive${i}`)?.checked !== false,
    }));

    const payload = {
      'solutions.title':    document.getElementById('solutionsTitle')?.value || '',
      'solutions.subtitle': document.getElementById('solutionsSub')?.value || '',
      'solutions.items':    solutions,
      'hero.headline':     _rteVal('heroHeadline', 'heroHeadline'),
      'hero.subheadline':  _rteVal('heroSubheadline', 'heroSubheadline'),
      'hero.ctaText':      document.getElementById('heroCtaText')?.value || '',
      'hero.ctaSubtext':   document.getElementById('heroCtaSubtext')?.value || '',
      'howItWorks.title':  document.getElementById('howTitle')?.value || '',
      'howItWorks.steps':  steps,
      'features.title':    document.getElementById('featuresSectionTitle')?.value || d.features.title,
      'features.items':    features,
      'plans.title':       document.getElementById('plansTitle')?.value || '',
      'plans.subtitle':    document.getElementById('plansSub')?.value || '',
      'plans.items':       plans,
      'testimonials.title': document.getElementById('testimonTitle')?.value || '',
      'testimonials.items': testimonials,
      'faq.title':         document.getElementById('faqTitle')?.value || '',
      'faq.items':         faqs,
      'cta.title':         _rteVal('ctaTitle', 'ctaTitle'),
      'cta.subtitle':      _rteVal('ctaSub', 'ctaSub'),
      'cta.buttonText':    document.getElementById('ctaBtn')?.value || '',
      'footer.text':       _rteVal('footerText', 'footerText'),
    };

    await apiRequest('PUT', '/api/admin/landing/config', payload);

    btn.textContent = 'Salvo! ✓';
    btn.style.background = '#065f46';
    setTimeout(() => {
      btn.textContent = 'Salvar tudo';
      btn.style.background = '#6366f1';
      btn.disabled = false;
    }, 2000);
  } catch (err) {
    saasToast('Erro ao salvar: ' + err.message, 'error');
    btn.textContent = 'Salvar tudo';
    btn.disabled = false;
  }
}


export { loadLandingEditor };
