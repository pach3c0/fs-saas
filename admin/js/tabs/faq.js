/**
 * Tab: FAQ
 */

import { appState, saveAppData } from '../state.js';
import { generateId } from '../utils/helpers.js';

export async function renderFaq(container) {
  const faqData = appState.appData.faq || { faqs: [] };

  let html = `
    <div style="display:flex; flex-direction:column; gap:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">FAQ</h2>
        <button id="addFaqBtn" style="background:#16a34a; color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:500;">
          + Adicionar
        </button>
      </div>

      <div id="faqList" style="display:flex; flex-direction:column; gap:0.5rem;">
  `;

  faqData.faqs.forEach((faq, index) => {
    html += `
      <div style="border:1px solid #374151; border-radius:0.375rem; padding:1rem; background:#1f2937;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
          <input type="text" style="flex:1; font-weight:bold; border:1px solid #374151; border-radius:0.25rem; padding:0.25rem 0.5rem; background:#111827; color:#f3f4f6;"
            value="${faq.question}" data-faq-question="${index}">
          <button style="color:#ef4444; margin-left:0.5rem; background:none; border:none; cursor:pointer;" onclick="deleteFaq(${index})">🗑️</button>
        </div>
        <textarea style="width:100%; border:1px solid #374151; border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.875rem; background:#111827; color:#f3f4f6; resize:vertical;" rows="3"
          data-faq-answer="${index}">${faq.answer}</textarea>
      </div>
    `;
  });

  html += `
      </div>
      <button id="saveFaqBtn" style="background:#2563eb; color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
        Salvar FAQ
      </button>
    </div>
  `;

  container.innerHTML = html;

  window.deleteFaq = async (index) => {
    if (!confirm('Remover esta pergunta?')) return;
    faqData.faqs.splice(index, 1);
    appState.appData.faq = faqData;
    await saveAppData('faq', faqData, true);
    renderFaq(container);
  };

  container.querySelector('#addFaqBtn').onclick = () => {
    faqData.faqs.push({ id: generateId(), question: 'Nova pergunta', answer: '' });
    renderFaq(container);
  };

  container.querySelector('#saveFaqBtn').onclick = async () => {
    const updated = { faqs: [] };

    container.querySelectorAll('[data-faq-question]').forEach((input, index) => {
      const question = input.value;
      const answer = container.querySelector(`[data-faq-answer="${index}"]`)?.value || '';
      updated.faqs.push({
        id: faqData.faqs[index]?.id || generateId(),
        question,
        answer
      });
    });

    await saveAppData('faq', updated);
  };
}
