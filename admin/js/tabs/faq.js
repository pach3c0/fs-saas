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

    <div style="max-width:580px; margin:0 auto; display:flex; flex-direction:column; align-items:center; width:100%; box-sizing:border-box; padding-bottom:2rem;">
      <div style="margin-bottom:1.5rem; text-align:center; display:flex; flex-direction:column; align-items:center; width:100%;">
        <h3 style="font-size:1.125rem; font-weight:600; color:var(--text-primary); margin-bottom:0.25rem; text-align:center;">Perguntas Frequentes</h3>
        <p style="color:#9ca3af; font-size:0.875rem; text-align:center; max-width:320px;">Gerencie as dúvidas comuns dos seus clientes.</p>
      </div>

      <div style="display:flex; justify-content:center; width:100%; margin-bottom:1.5rem;">
        <button id="addFaqBtn" class="btn" style="border-radius:9999px; padding:0.5rem 1.25rem; font-weight:600;" title="Adicionar FAQ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Adicionar FAQ
        </button>
      </div>

      <div id="faqList" style="display:flex; flex-direction:column; gap:1rem; width:100%;">
  `;

  _faqItems.forEach((item, idx) => {
    html += `
      <div class="faq-editor-card" data-faq-card="${idx}" style="border:1px solid var(--border); border-radius:0.75rem; background:var(--bg-elevated); padding:0; display:flex; flex-direction:column; position:relative;">
        <div class="faq-editor-header" style="display:flex; align-items:center; gap:0.5rem; padding:0.75rem 1rem; border-bottom:1px solid var(--border); background:var(--bg-surface);">
          <span class="drag-handle" style="cursor:grab; color:#9ca3af; flex-shrink:0;" title="Arraste para reordenar">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="lucide lucide-grip-vertical"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
          </span>
          <div class="faq-q-wrap" style="flex:1;">
            <div id="faqQWrap_${idx}"></div>
            <input type="text" id="faqQ_${idx}" value="${(item.question || '').replace(/"/g, '&quot;')}" style="display:none;" data-faq-question="${idx}">
          </div>
          <button onclick="deleteFaq(${idx})" class="p-action-btn" title="Remover" style="width:28px !important; min-width:28px !important; height:28px !important; border-radius:50% !important; display:inline-flex !important; align-items:center; justify-content:center; padding:0 !important; cursor:pointer; background:var(--bg-surface); border:1px solid var(--border); color:var(--red,#f85149); flex-shrink:0;">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
        <div class="faq-answer-wrap" style="padding:0.75rem 1rem;">
          <div style="font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.375rem;">Resposta</div>
          <div id="faqAWrap_${idx}"></div>
          <textarea id="faqA_${idx}" style="display:none;" data-faq-answer="${idx}">${item.answer || ''}</textarea>
        </div>
      </div>
    `;
  });

  html += `
      </div>
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
        () => { lerEditores(); saveFaq(true); },
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
        () => { lerEditores(); saveFaq(true); },
        {
          placeholder: 'Escreva a resposta completa...',
          minHeight: 80,
          features: ['bold', 'italic', 'underline', 'br', 'list', 'emoji', 'clear'],
        }
      );
      answerRtes[idx] = aRte;
    }
  });

  // Captura o que está digitado nos editores ANTES de qualquer re-render —
  // sem isso, "+ Adicionar"/remover descartavam edições não salvas dos outros cards.
  const lerEditores = () => {
    _faqItems = _faqItems.map((item, idx) => ({
      id: item.id || generateId(),
      question: questionRtes[idx] ? questionRtes[idx].getValue() : item.question,
      answer: answerRtes[idx] ? answerRtes[idx].getValue() : item.answer,
    }));
  };

  window.deleteFaq = async (index) => {
    const ok = await window.showConfirm?.('Remover esta pergunta?', { confirmText: 'Remover', danger: true }) ?? true;
    if (!ok) return;
    lerEditores();
    _faqItems.splice(index, 1);
    await saveFaq(true);
    renderFaq(container);
  };

  container.querySelector('#addFaqBtn').onclick = () => {
    lerEditores();
    _faqItems.push({ id: generateId(), question: 'Nova pergunta', answer: '' });
    renderFaq(container);
    saveFaq(true);
  };
}
