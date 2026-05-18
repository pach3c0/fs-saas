import { appState } from '../state.js';
import { apiPut } from '../utils/api.js';

export function renderCliente(container) {
  const siteContent = appState.configData?.siteContent || {};
  
  if (!siteContent.areaCliente) {
    siteContent.areaCliente = {
      isActive: true,
      title: 'Área do Cliente',
      subtitle: 'Acompanhe seu ensaio e escolha suas fotos favoritas',
      description: 'Em nossa área exclusiva, você poderá visualizar suas galerias privadas, selecionar as fotos que mais gostou e acompanhar o progresso das edições.',
      buttonText: 'Acessar Minha Área'
    };
  }
  const cData = siteContent.areaCliente;

  container.innerHTML = `
    <style>
      #config-cliente { display:flex; flex-direction:column; height:100%; overflow:hidden; }
      .sc-sidebar { display:flex; flex-direction:column; flex:1; min-height:0; overflow-y:auto; }
      .sc-sidebar::-webkit-scrollbar { width:4px; }
      .sc-sidebar::-webkit-scrollbar-thumb { background:#374151; border-radius:2px; }
      .sc-section { border-bottom:1px solid #1f2937; }
      .sc-section-head { padding:0.6rem 0.75rem; font-size:0.7rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em; display:flex; align-items:center; justify-content:space-between; }
      .sc-row { padding:0.4rem 0.75rem; display:flex; flex-direction:column; gap:0.2rem; }
      .sc-label { font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; }
      .sc-input, .sc-textarea { width:100%; padding:0.35rem 0.5rem; background:#1f2937; border:1px solid #374151; border-radius:0.375rem; color:#f3f4f6; font-size:0.78rem; outline:none; box-sizing:border-box; }
      .sc-input:focus, .sc-textarea:focus { border-color:#3b82f6; }
      .sc-textarea { resize:vertical; min-height:80px; }
      .sc-btn { padding:0.4rem 0.6rem; border-radius:0.375rem; border:1px solid #374151; background:#1f2937; color:#d1d5db; font-size:0.75rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.3rem; }
      .sc-btn.success { background:#16a34a; border-color:#16a34a; color:#fff; font-weight:700; padding:0.75rem; width:100%; }
      .sc-btn.success:hover { background:#15803d; }
    </style>

    <div class="sc-sidebar">
      <div class="sc-section">
        <div class="sc-section-head">Configurações</div>
        <div class="sc-row">
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; padding:0.2rem 0; color:#f3f4f6; font-size:0.8rem;">
            <input type="checkbox" id="clIsActive" ${cData.isActive ? 'checked' : ''}>
            Mostrar seção Área do Cliente no site
          </label>
        </div>
        <div class="sc-row">
          <span class="sc-label">Título</span>
          <input type="text" class="sc-input" id="clTitle" value="${(cData.title || '').replace(/"/g, '&quot;')}">
        </div>
        <div class="sc-row">
          <span class="sc-label">Subtítulo</span>
          <input type="text" class="sc-input" id="clSubtitle" value="${(cData.subtitle || '').replace(/"/g, '&quot;')}">
        </div>
        <div class="sc-row">
          <span class="sc-label">Descrição</span>
          <textarea class="sc-textarea" id="clDescription">${cData.description || ''}</textarea>
        </div>
        <div class="sc-row">
          <span class="sc-label">Texto do Botão</span>
          <input type="text" class="sc-input" id="clButtonText" value="${(cData.buttonText || '').replace(/"/g, '&quot;')}">
        </div>
      </div>
    </div>
  `;

  const liveNotify = () => window._meuSitePostPreview?.();

  async function saveDados() {
    try {
      await apiPut('/api/site/admin/config', {
        siteContent: {
          ...siteContent,
          areaCliente: cData
        }
      });
      // Optionally show silent toast or update save state
    } catch (err) {
      console.error('Erro ao salvar', err);
    }
  }

  container.querySelector('#clTitle').addEventListener('input', (e) => {
    cData.title = e.target.value;
    liveNotify();
    saveDados();
  });
  
  container.querySelector('#clSubtitle').addEventListener('input', (e) => {
    cData.subtitle = e.target.value;
    liveNotify();
    saveDados();
  });

  container.querySelector('#clDescription').addEventListener('input', (e) => {
    cData.description = e.target.value;
    liveNotify();
    saveDados();
  });

  container.querySelector('#clButtonText').addEventListener('input', (e) => {
    cData.buttonText = e.target.value;
    liveNotify();
    saveDados();
  });

  container.querySelector('#clIsActive').addEventListener('change', (e) => {
    cData.isActive = e.target.checked;
    liveNotify();
    saveDados();
  });
}
