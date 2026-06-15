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
    <div style="max-width:580px; margin:0 auto; display:flex; flex-direction:column; align-items:center; width:100%; box-sizing:border-box; padding-bottom:2rem;">
      
      <div style="margin-bottom:1.5rem; text-align:center; display:flex; flex-direction:column; align-items:center; width:100%;">
        <h3 style="font-size:1.125rem; font-weight:600; color:var(--text-primary); margin-bottom:0.25rem; text-align:center;">Área do Cliente</h3>
        <p style="color:#9ca3af; font-size:0.875rem; text-align:center; max-width:320px;">Configure a seção de acesso do cliente no site.</p>
      </div>

      <div style="background:var(--bg-elevated); padding:1.5rem; border-radius:0.75rem; border:1px solid var(--border); display:flex; flex-direction:column; gap:1.25rem; width:100%; box-sizing:border-box;">
        
        <div class="input-group" style="margin-bottom:0; width:100%;">
          <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Título</label>
          <input type="text" id="clTitle" class="input" value="${(cData.title || '').replace(/"/g, '&quot;')}" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.5rem; border-radius:0.5rem; font-size:0.875rem; outline:none;">
        </div>

        <div class="input-group" style="margin-bottom:0; width:100%;">
          <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Subtítulo</label>
          <input type="text" id="clSubtitle" class="input" value="${(cData.subtitle || '').replace(/"/g, '&quot;')}" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.5rem; border-radius:0.5rem; font-size:0.875rem; outline:none;">
        </div>

        <div class="input-group" style="margin-bottom:0; width:100%;">
          <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Descrição</label>
          <textarea id="clDescription" class="input" rows="3" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.5rem; border-radius:0.5rem; font-size:0.875rem; outline:none; resize:vertical;">${cData.description || ''}</textarea>
        </div>

        <div class="input-group" style="margin-bottom:0; width:100%;">
          <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Texto do Botão</label>
          <input type="text" id="clButtonText" class="input" value="${(cData.buttonText || '').replace(/"/g, '&quot;')}" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.5rem; border-radius:0.5rem; font-size:0.875rem; outline:none;">
        </div>

      </div>
    </div>
  `;

  const liveNotify = () => window._meuSitePostPreview?.();

  async function saveDados() {
    try {
      const indicator = document.getElementById('builder-save-indicator');
      if (indicator) {
        indicator.textContent = 'Salvando...';
        indicator.style.opacity = '1';
      }
      await apiPut('/api/site/admin/config', {
        siteContent: {
          ...siteContent,
          areaCliente: cData
        }
      });
      if (indicator) {
        indicator.textContent = 'Salvo!';
        setTimeout(() => {
          if (indicator.textContent === 'Salvo!') indicator.style.opacity = '0';
        }, 1500);
      }
    } catch (err) {
      console.error('Erro ao salvar', err);
      const indicator = document.getElementById('builder-save-indicator');
      if (indicator) {
        indicator.textContent = 'Erro ao salvar!';
        indicator.style.color = 'var(--red,#f85149)';
      }
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

}
