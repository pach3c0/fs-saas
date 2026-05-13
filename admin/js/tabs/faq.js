/**
 * Tab: FAQ
 */

import { generateId } from '../utils/helpers.js';
import { apiGet, apiPut } from '../utils/api.js';
import { addInlineToolbar, createRichEditor } from '../utils/richtext.js';

let _faqItems = null;

async function saveFaq(silent = false) {
  await apiPut('/api/site/admin/config', { siteContent: { faq: _faqItems } });
  if (!silent) window.showToast?.('FAQ salvo!', 'success');
  window._meuSitePostPreview?.();
}

const DEFAULT_FAQS = [
  { question: 'Quanto tempo leva para receber as fotos editadas?', answer: 'O prazo de entrega das fotos editadas é de 15 a 30 dias úteis após a sessão, dependendo do tipo e volume de imagens.' },
  { question: 'Quantas fotos recebo no pacote?', answer: 'A quantidade de fotos varia conforme o pacote contratado. Consulte nossa tabela de pacotes para mais detalhes.' },
  { question: 'Como funciona a seleção de fotos?', answer: 'Após a sessão, você receberá um link privado para acessar todas as fotos e fazer a seleção das suas favoritas dentro do prazo combinado.' },
  { question: 'Vocês atendem em qual região?', answer: 'Atendemos em toda a região e também aceitamos convites para outras cidades mediante consulta de disponibilidade e deslocamento.' },
  { question: 'É possível remarcar a sessão?', answer: 'Sim! Remarcações podem ser feitas com até 48 horas de antecedência sem custo adicional. Após esse prazo, pode haver cobrança de taxa.' },
  { question: 'Qual é a política de cancelamento?', answer: 'Em caso de cancelamento com mais de 7 dias de antecedência, devolvemos o sinal. Cancelamentos com menos de 7 dias têm o sinal retido.' },
];

export async function renderFaq(container) {
  // Carregar de siteContent na primeira vez
  if (_faqItems === null) {
    try {
      const config = await apiGet('/api/site/admin/config');
      _faqItems = config?.siteContent?.faq || [];
    } catch (_) { _faqItems = []; }
  }
  if (_faqItems.length === 0) {
    _faqItems = DEFAULT_FAQS.map(f => ({ id: generateId(), ...f }));
  }

  let html = `
    <style>
      .faq-editor-card {
        border: 1px solid var(--border);
        border-radius: 0.5rem;
        background: var(--bg-surface);
        overflow: hidden;
        transition: box-shadow 0.15s;
      }
      .faq-editor-card:focus-within {
        box-shadow: 0 0 0 2px var(--ad-accent-soft);
        border-color: var(--accent);
      }
      .faq-editor-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: var(--bg-elevated);
        border-bottom: 1px solid var(--border);
      }
      .faq-editor-header .drag-handle {
        color: var(--text-muted);
        cursor: grab;
        font-size: 1rem;
        flex-shrink: 0;
      }
      .faq-q-wrap { flex: 1; }
      .faq-answer-wrap { padding: 0.75rem 1rem; }
      .faq-answer-label {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
        margin-bottom: 0.375rem;
      }
    </style>

    <div style="display:flex; flex-direction:column; gap:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2 style="font-size:1.5rem; font-weight:bold; color:var(--text-primary);">FAQ</h2>
        <button id="addFaqBtn" style="background:var(--green); color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:500;">
          + Adicionar
        </button>
      </div>

      <div id="faqList" style="display:flex; flex-direction:column; gap:0.75rem;">
  `;

  _faqItems.forEach((item, idx) => {
    html += `
      <div class="faq-editor-card" data-faq-card="${idx}">
        <div class="faq-editor-header">
          <span class="drag-handle" title="Arraste para reordenar">☰</span>
          <div class="faq-q-wrap">
            <div id="faqQWrap_${idx}"></div>
            <input type="text" id="faqQ_${idx}" value="${(item.question || '').replace(/"/g, '&quot;')}"
              style="display:none;" data-faq-question="${idx}">
          </div>
          <button class="btn btn-ghost btn-sm" style="color:var(--red); flex-shrink:0;"
            onclick="deleteFaq(${idx})" title="Remover">🗑️</button>
        </div>
        <div class="faq-answer-wrap">
          <div class="faq-answer-label">Resposta</div>
          <div id="faqAWrap_${idx}"></div>
          <textarea id="faqA_${idx}" style="display:none;" data-faq-answer="${idx}">${item.answer || ''}</textarea>
        </div>
      </div>
    `;
  });

  html += `
      </div>
      <button id="saveFaqBtn" style="background:var(--accent); color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer; margin-top:1rem;">
        Salvar FAQ
      </button>
    </div>
  `;

  container.innerHTML = html;

  // ── Inicializa editores para cada item ──
  const questionRtes = [];
  const answerRtes = [];

  _faqItems.forEach((item, idx) => {
    // Toolbar inline na PERGUNTA
    const qInput = container.querySelector(`#faqQ_${idx}`);
    if (qInput) {
      const qRte = addInlineToolbar(
        qInput,
        () => { /* live update — salva ao clicar Salvar FAQ */ },
        { placeholder: 'Digite a pergunta...', features: ['bold', 'italic', 'emoji'] }
      );
      qRte.setValue(item.question || '');
      questionRtes[idx] = qRte;
    }

    // Editor rico na RESPOSTA
    const aWrap = container.querySelector(`#faqAWrap_${idx}`);
    if (aWrap) {
      const aRte = createRichEditor(
        aWrap,
        item.answer || '',
        () => { /* live update — salva ao clicar Salvar FAQ */ },
        {
          placeholder: 'Escreva a resposta completa...',
          minHeight: 80,
          features: ['bold', 'italic', 'underline', 'br', 'list', 'emoji', 'clear'],
        }
      );
      answerRtes[idx] = aRte;
    }
  });

  window.deleteFaq = async (index) => {
    const ok = await window.showConfirm?.('Remover esta pergunta?', { confirmText: 'Remover', danger: true }) ?? true;
    if (!ok) return;
    _faqItems.splice(index, 1);
    await saveFaq(true);
    renderFaq(container);
  };

  container.querySelector('#addFaqBtn').onclick = () => {
    _faqItems.push({ id: generateId(), question: 'Nova pergunta', answer: '' });
    renderFaq(container);
  };

  container.querySelector('#saveFaqBtn').onclick = async () => {
    _faqItems = _faqItems.map((item, idx) => ({
      id: item.id || generateId(),
      question: questionRtes[idx]?.getValue() || item.question,
      answer: answerRtes[idx]?.getValue() || item.answer,
    }));
    await saveFaq();
  };
}
