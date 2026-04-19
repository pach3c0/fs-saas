/**
 * Tab: FAQ
 */

import { generateId } from '../utils/helpers.js';
import { apiGet, apiPut } from '../utils/api.js';

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
  const faqData = { faqs: _faqItems };

  let html = `
    <div style="display:flex; flex-direction:column; gap:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2 style="font-size:1.5rem; font-weight:bold; color:var(--text-primary);">FAQ</h2>
        <button id="addFaqBtn" style="background:var(--green); color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:500;">
          + Adicionar
        </button>
      </div>

      <div id="faqList" style="display:flex; flex-direction:column; gap:0.5rem;">
  `;

  faqData.faqs.forEach((faq, index) => {
    html += `
      <div style="border:1px solid var(--border); border-radius:0.375rem; padding:1rem; background:var(--bg-surface);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
          <input type="text" style="flex:1; min-width:0; font-weight:bold; border:1px solid var(--border); border-radius:0.25rem; padding:0.25rem 0.5rem; background:var(--bg-elevated); color:var(--text-primary);"
            value="${faq.question}" data-faq-question="${index}">
          <button style="color:var(--red); margin-left:0.5rem; background:none; border:none; cursor:pointer;" onclick="deleteFaq(${index})">🗑️</button>
        </div>
        <textarea style="width:100%; border:1px solid var(--border); border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.875rem; background:var(--bg-elevated); color:var(--text-primary); resize:vertical;" rows="3"
          data-faq-answer="${index}">${faq.answer}</textarea>
      </div>
    `;
  });

  html += `
      </div>
      <button id="saveFaqBtn" style="background:var(--accent); color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
        Salvar FAQ
      </button>
    </div>
  `;

  container.innerHTML = html;

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
    _faqItems = [];
    container.querySelectorAll('[data-faq-question]').forEach((input, index) => {
      _faqItems.push({
        id: generateId(),
        question: input.value,
        answer: container.querySelector(`[data-faq-answer="${index}"]`)?.value || ''
      });
    });
    await saveFaq();
  };
}
