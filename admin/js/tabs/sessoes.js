/**
 * Tab: Sessoes de Clientes
 */

import { appState } from '../state.js';
import { formatDate, copyToClipboard, resolveImagePath, escapeHtml } from '../utils/helpers.js';
import { uploadImage, showUploadProgress, UploadQueue } from '../utils/upload.js';
import { UploadPanel } from '../components/upload-panel.js';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api.js';

const STATUS_LABELS = {
  pending: { text: 'Pendente', color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' },
  in_progress: { text: 'Em seleção', color: 'var(--yellow)', bg: 'rgba(210, 153, 34, 0.1)' },
  submitted: { text: 'Seleção enviada', color: 'var(--green)', bg: 'rgba(63, 185, 80, 0.1)' },
  delivered: { text: 'Entregue', color: 'var(--accent)', bg: 'rgba(47, 129, 247, 0.1)' },
  expired: { text: 'Expirado', color: 'var(--red)', bg: 'rgba(248, 81, 73, 0.1)' }
};

export async function renderSessoes(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1rem; min-height:calc(100vh - 120px);">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2 style="font-size:1.5rem; font-weight:bold; color:var(--text-primary);">Sessoes de Clientes</h2>
        <button id="addSessionBtn" style="background:var(--green); color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:500;">
          + Nova Sessao
        </button>
      </div>

      <!-- Filtros -->
      <div style="background:var(--bg-surface); padding:1rem; border-radius:0.5rem; border:1px solid var(--border); display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; gap:1rem; flex-wrap:wrap;">
            <input type="text" id="filterSearch" placeholder="Buscar cliente..." style="flex:1; min-width:200px; padding:0.5rem; border-radius:0.375rem; border:1px solid var(--border); background:var(--bg-base); color:var(--text-primary);">
            <select id="filterSort" style="padding:0.5rem; border-radius:0.375rem; border:1px solid var(--border); background:var(--bg-base); color:var(--text-primary);">
                <option value="newest">Mais recentes</option>
                <option value="oldest">Mais antigos</option>
                <option value="az">Nome A-Z</option>
                <option value="za">Nome Z-A</option>
            </select>
        </div>
        <div style="display:flex; gap:1rem; flex-wrap:wrap; align-items:center;">
            <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;" id="statusFilters">
                <span style="color:var(--text-secondary); font-size:0.875rem;">Status:</span>
                <label style="color:var(--text-secondary); font-size:0.875rem; display:flex; align-items:center; gap:0.25rem; cursor:pointer;"><input type="checkbox" value="pending" checked> Pendente</label>
                <label style="color:var(--text-secondary); font-size:0.875rem; display:flex; align-items:center; gap:0.25rem; cursor:pointer;"><input type="checkbox" value="in_progress" checked> Em seleção</label>
                <label style="color:var(--text-secondary); font-size:0.875rem; display:flex; align-items:center; gap:0.25rem; cursor:pointer;"><input type="checkbox" value="submitted" checked> Enviada</label>
                <label style="color:var(--text-secondary); font-size:0.875rem; display:flex; align-items:center; gap:0.25rem; cursor:pointer;"><input type="checkbox" value="delivered" checked> Entregue</label>
                <label style="color:var(--text-secondary); font-size:0.875rem; display:flex; align-items:center; gap:0.25rem; cursor:pointer;"><input type="checkbox" value="expired" checked> Expirado</label>
            </div>
            <select id="filterMode" style="padding:0.5rem; border-radius:0.375rem; border:1px solid var(--border); background:var(--bg-base); color:var(--text-primary); margin-left:auto;">
                <option value="all">Todos os modos</option>
                <option value="selection">Seleção</option>
                <option value="multi_selection">Multi-Seleção</option>
                <option value="gallery">Galeria</option>
            </select>
        </div>
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center;">
            <span style="color:var(--text-secondary); font-size:0.875rem;">Período por:</span>
            <select id="filterDateField" style="padding:0.375rem 0.5rem; border-radius:0.375rem; border:1px solid var(--border); background:var(--bg-base); color:var(--text-primary); font-size:0.875rem;">
                <option value="createdAt">Criado em</option>
                <option value="date">Data do Evento</option>
                <option value="selectionDeadline">Prazo de Seleção</option>
            </select>
            <input type="date" id="filterDateFrom" style="padding:0.375rem 0.5rem; border-radius:0.375rem; border:1px solid var(--border); background:var(--bg-base); color:var(--text-primary); font-size:0.875rem;">
            <span style="color:var(--text-muted); font-size:0.875rem;">até</span>
            <input type="date" id="filterDateTo" style="padding:0.375rem 0.5rem; border-radius:0.375rem; border:1px solid var(--border); background:var(--bg-base); color:var(--text-primary); font-size:0.875rem;">
            <button id="clearDateFilter" style="padding:0.375rem 0.75rem; border-radius:0.375rem; border:1px solid var(--border); background:none; color:var(--text-secondary); cursor:pointer; font-size:0.75rem;">Limpar</button>
        </div>
      </div>

      <div id="sessionsList" style="display:flex; flex-direction:column; gap:0.75rem;">
        <p style="color:var(--text-secondary); text-align:center;">Carregando...</p>
      </div>
    </div>

    <!-- Modal Nova Sessao -->
    <div id="newSessionModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:flex-start; justify-content:center; overflow-y:auto; padding:2rem 1rem;">
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.75rem; padding:1.5rem; width:30rem; max-width:100%; display:flex; flex-direction:column; gap:1rem; margin:2rem auto;">
        <h3 style="font-size:1.125rem; font-weight:bold; color:var(--text-primary);">Nova Sessão</h3>

        <!-- BLOCO CLIENTE: busca dinâmica -->
        <div style="position:relative;">
          <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Cliente <span style="color:var(--text-muted);">(opcional)</span></label>
          <input type="text" id="clientSearchInput" autocomplete="off"
            placeholder="Digite o nome para buscar ou criar..."
            style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary); box-sizing:border-box;">
          <input type="hidden" id="sessionClientId" value="">
          <!-- Dropdown de resultados -->
          <div id="clientSearchDropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.375rem; z-index:10; max-height:200px; overflow-y:auto; margin-top:2px;"></div>
          <p id="clientSearchHint" style="font-size:0.625rem; color:var(--text-muted); margin-top:0.25rem;"></p>
        </div>

        <!-- Nome da Sessão -->
        <div>
          <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Nome da Sessão <span style="color:var(--red);">*</span></label>
          <input type="text" id="sessionName"
            placeholder="Ex: Ensaio Família Silva"
            style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary); box-sizing:border-box;">
        </div>

        <!-- Tipo -->
        <div>
          <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Tipo</label>
          <select id="sessionType" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary);">
            <option value="Familia">Família</option>
            <option value="Casamento">Casamento</option>
            <option value="Evento">Evento</option>
            <option value="Ensaio">Ensaio</option>
            <option value="Corporativo">Corporativo</option>
          </select>
        </div>

        <!-- DATAS -->
        <div style="border:1px solid var(--border); border-radius:0.5rem; padding:0.75rem; display:flex; flex-direction:column; gap:0.75rem;">
          <h4 style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin:0;">📅 Datas</h4>
          <div>
            <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Criado em</label>
            <input type="date" id="sessionCreatedAtDate"
              style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary); box-sizing:border-box;">
            <p style="font-size:0.6rem; color:var(--text-muted); margin-top:0.2rem;">Data de abertura da sessão (hoje por padrão).</p>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Data do Evento</label>
            <input type="date" id="sessionDate"
              style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary); box-sizing:border-box;">
            <p style="font-size:0.6rem; color:var(--text-muted); margin-top:0.2rem;">Quando o ensaio/evento aconteceu.</p>
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Prazo de Seleção <span style="color:var(--text-muted);">(opcional)</span></label>
            <input type="datetime-local" id="sessionDeadline"
              style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary); box-sizing:border-box;">
            <p style="font-size:0.6rem; color:var(--text-muted); margin-top:0.2rem;">Limite para o cliente escolher as fotos. Deve ser após a data do evento.</p>
          </div>
          <p id="dateValidationMsg" style="display:none; font-size:0.75rem; color:var(--red); font-weight:500;"></p>
        </div>

        <!-- Foto de Capa -->
        <div>
          <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Foto de Capa</label>
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div id="coverPreview" style="width:80px; height:60px; background:var(--bg-base); border:1px dashed var(--border); border-radius:0.375rem; overflow:hidden; display:flex; align-items:center; justify-content:center;">
              <span style="color:var(--text-muted); font-size:0.625rem;">Sem capa</span>
            </div>
            <label style="background:var(--accent); color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; font-weight:500; cursor:pointer; font-size:0.75rem;">
              Upload
              <input type="file" accept=".jpg,.jpeg,.png" id="coverInput" style="display:none;">
            </label>
            <div id="coverProgress"></div>
          </div>
          <input type="hidden" id="sessionCoverPhoto" value="">
        </div>

        <!-- Config Galeria -->
        <div style="border-top:1px solid var(--border); padding-top:1rem;">
          <h4 style="font-size:0.875rem; font-weight:600; color:var(--text-primary); margin-bottom:0.75rem;">Configuração da Galeria</h4>
          <div>
            <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Modo</label>
            <select id="sessionMode" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary);">
              <option value="selection">Seleção (cliente escolhe favoritas)</option>
              <option value="gallery">Galeria (cliente só visualiza/baixa)</option>
              <option value="multi_selection">Multi-Seleção (formaturas, shows)</option>
            </select>
          </div>
          <div style="margin-top:0.75rem;">
            <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Fluxo de trabalho</label>
            <select id="sessionWorkflow" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary);">
              <option value="ready">Pronto para Entrega — fotos já editadas</option>
              <option value="post_edit">Edição Pós-Seleção — exportar para Lightroom após seleção</option>
            </select>
          </div>
          <div style="margin-top:0.75rem;">
            <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Resolução das fotos de seleção</label>
            <select id="sessionResolution" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary);">
              <option value="960">960px — menor armazenamento (ideal para muitos eventos)</option>
              <option value="1200" selected>1200px — padrão (equilíbrio)</option>
              <option value="1400">1400px — alta qualidade</option>
              <option value="1600">1600px — máxima qualidade (mais armazenamento)</option>
            </select>
            <p style="font-size:0.7rem; color:var(--text-muted); margin-top:0.25rem;">Não pode ser alterado após a criação da sessão.</p>
          </div>
          <div id="selectionFields" style="display:flex; gap:0.75rem; margin-top:0.75rem;">
            <div style="flex:1;">
              <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Fotos do pacote</label>
              <input type="number" id="sessionLimit" value="30" min="1" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary);">
            </div>
            <div style="flex:1;">
              <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Preço foto extra (R$)</label>
              <input type="number" id="sessionExtraPrice" value="25" min="0" step="0.01" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary);">
            </div>
          </div>
          <p id="multiSelectionHint" style="display:none; font-size:0.75rem; color:var(--yellow); margin-top:0.5rem;">No modo Multi-Seleção, você adicionará os participantes após criar a sessão.</p>
        </div>

        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
          <button id="cancelNewSession" style="padding:0.5rem 1rem; color:var(--text-secondary); background:none; border:1px solid var(--border); border-radius:0.375rem; cursor:pointer;">Cancelar</button>
          <button id="confirmNewSession" style="padding:0.5rem 1rem; background:var(--green); color:white; border:none; border-radius:0.375rem; cursor:pointer; font-weight:600;">Criar Sessão</button>
        </div>
      </div>
    </div>

    <!-- Modal Ver Fotos (Dual Grid) -->
    <div id="sessionPhotosModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:50; flex-direction:column;">
      <div style="background:var(--bg-surface); border-bottom:1px solid var(--border); padding:1rem 1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <h3 id="photosModalTitle" style="font-size:1.125rem; font-weight:bold; color:var(--text-primary);">Fotos da Sessao</h3>
        <div style="display:flex; gap:0.75rem; align-items:center;">
          <div id="sessionUploadProgress" style="min-width:150px;"></div>
          
          <!-- Unified Upload Group -->
          <div id="uploadButtonGroup" style="display:flex; align-items:stretch; border-radius:0.375rem; position:relative;">
            <label id="mainUploadBtn" style="padding:0.5rem 1rem; background:var(--accent); color:white; border-radius:0.375rem 0 0 0.375rem; cursor:pointer; font-weight:600; font-size:0.875rem; border:none; display:flex; align-items:center; gap:0.5rem; transition: background 0.2s;"></label>
            <button id="uploadDropdownToggle" style="padding:0.5rem 0.6rem; background:var(--accent); color:white; border-radius:0 0.375rem 0.375rem 0; cursor:pointer; border:none; border-left:1px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:1rem; transition: background 0.2s;">⌄</button>
            
            <!-- Dropdown Menu -->
            <div id="uploadDropdownMenu" style="display:none; position:absolute; top:100%; right:0; margin-top:0.4rem; background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.5rem; box-shadow:0 10px 25px rgba(0,0,0,0.4); z-index:100; min-width:220px; overflow:hidden;">
              <label id="secondaryUploadBtn" style="display:flex; align-items:center; gap:0.6rem; padding:0.75rem 1rem; color:var(--text-primary); cursor:pointer; font-size:0.875rem; transition:background 0.2s;"></label>
            </div>
          </div>

          <!-- Hidden Inputs -->
          <input type="file" id="sessionUploadInput" accept="image/*" multiple style="display:none;">
          <input type="file" id="sessionEditedInput" accept="image/*" multiple style="display:none;">
          
          <button id="closePhotosModal" style="padding:0.5rem 1rem; color:var(--text-secondary); background:none; border:1px solid var(--border); border-radius:0.375rem; cursor:pointer;">Fechar</button>
        </div>
      </div>
      
      <div style="flex:1; display:flex; flex-direction:column; min-height:0; padding:1rem; gap:1.5rem; overflow:hidden;">
          <!-- Seção 1: Todas as Fotos -->
          <div style="flex:1.2; display:flex; flex-direction:column; min-height:0;">
              <h4 style="margin-bottom:0.75rem; color:var(--text-secondary); font-size:0.875rem; font-weight:600; display:flex; align-items:center; gap:0.5rem;">
                🖼️ Galeria Geral
              </h4>
              <div id="sessionPhotosGrid" style="flex:1; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:0.5rem; background:rgba(0,0,0,0.2); padding:1rem; border-radius:0.75rem; border:1px solid var(--border); align-content:start;"></div>
          </div>
          
          <!-- Seção 2: Fotos Finais (Entrega) -->
          <div style="flex:0.8; display:flex; flex-direction:column; min-height:0;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                  <h4 style="color:var(--text-secondary); font-size:0.875rem; font-weight:600; display:flex; align-items:center; gap:0.5rem;">
                    🚀 Entrega Final (Alta Res: <span id="deliveryCountBadge">0</span>)
                  </h4>
                  <button id="exportSelectionBtn" style="background:var(--purple); color:white; padding:0.4rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:600; display:flex; align-items:center; gap:0.4rem;" title="Exportar lista de seleção para o Lightroom">
                    📋 Exportar Lightroom
                  </button>
              </div>
              <div id="selectedPhotosGrid" style="flex:1; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:0.5rem; background:rgba(0,192,115,0.05); padding:1rem; border-radius:0.75rem; border:1px dashed var(--green); align-content:start;"></div>
          </div>
      </div>
    </div>

    <!-- Modal de Validacao de Upload -->
    <div id="uploadValidationModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:100; align-items:center; justify-content:center; padding:1.5rem;">
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:1rem; width:100%; max-width:500px; overflow:hidden; box-shadow:0 20px 50px rgba(0,0,0,0.5);">
        <div style="padding:1.5rem; border-bottom:1px solid var(--border); background:rgba(255,166,87,0.05);">
          <h3 style="font-size:1.125rem; font-weight:bold; color:var(--orange); display:flex; align-items:center; gap:0.5rem;">
            ⚠️ Validação de Entrega
          </h3>
          <p style="font-size:0.875rem; color:var(--text-secondary); margin-top:0.25rem;">Analisamos seus arquivos antes de iniciar o upload.</p>
        </div>
        
        <div id="validationContent" style="padding:1.5rem; max-height:400px; overflow-y:auto; display:flex; flex-direction:column; gap:1rem;">
        </div>

        <div style="padding:1.25rem; background:var(--bg-base); border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:0.75rem;">
          <button id="cancelValidationBtn" style="padding:0.5rem 1rem; color:var(--text-secondary); background:none; border:1px solid var(--border); border-radius:0.375rem; cursor:pointer; font-size:0.875rem;">Cancelar</button>
          <button id="confirmValidationBtn" style="padding:0.5rem 1.25rem; background:var(--accent); color:white; border:none; border-radius:0.375rem; cursor:pointer; font-weight:600; font-size:0.875rem;"></button>
        </div>
      </div>
    </div>

    <!-- Modal Editar Sessao -->
    <div id="editSessionModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:flex-start; justify-content:center; overflow-y:auto; padding:2rem 1rem;">
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.75rem; padding:1.5rem; width:28rem; max-width:100%; display:flex; flex-direction:column; gap:1rem; margin:2rem auto;">
        <h3 style="font-size:1.125rem; font-weight:bold; color:var(--text-primary);">Editar Sessao</h3>
        <div>
          <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Nome da Sessão</label>
          <input type="text" id="editSessionName" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary);">
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Tipo</label>
          <select id="editSessionType" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary);">
            <option value="Familia">Familia</option>
            <option value="Casamento">Casamento</option>
            <option value="Evento">Evento</option>
            <option value="Ensaio">Ensaio</option>
            <option value="Corporativo">Corporativo</option>
          </select>
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Cliente Vinculado</label>
          <select id="editClientId" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary);">
            <option value="">-- Nenhum cliente vinculado --</option>
          </select>
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">E-mail do Cliente <span style="color:var(--text-muted);">(opcional — para notificacoes)</span></label>
          <input type="email" id="editClientEmail" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary);" placeholder="email@cliente.com">
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Prazo Seleção</label>
          <input type="datetime-local" id="editSessionDeadline" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary);">
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Modo</label>
          <select id="editMode" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary);">
            <option value="selection">Selecao (cliente escolhe favoritas)</option>
            <option value="gallery">Galeria (cliente so visualiza/baixa)</option>
          </select>
        </div>
        <div id="editSelectionFields" style="display:flex; gap:0.75rem;">
          <div style="flex:1;">
            <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Fotos do pacote</label>
            <input type="number" id="editLimit" min="1" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary);">
          </div>
          <div style="flex:1;">
            <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Preco foto extra (R$)</label>
            <input type="number" id="editExtraPrice" min="0" step="0.01" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-base); color:var(--text-primary);">
          </div>
        </div>
        <p style="font-size:0.6875rem; color:var(--text-muted);">Cada cliente pode ter valores diferentes de pacote e preco de extras.</p>
        <div style="border-top:1px solid var(--border); padding-top:0.75rem; display:flex; flex-direction:column; gap:0.75rem;">
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="checkbox" id="editHighResDelivery" style="width:1rem; height:1rem; accent-color:var(--accent); cursor:pointer;">
            <span style="color:var(--text-primary); font-size:0.875rem; font-weight:500;">Entrega em alta resolucao</span>
          </label>
          <p style="font-size:0.6875rem; color:var(--text-muted); margin-top:-0.5rem; margin-left:1.5rem;">Quando marcado, o cliente baixa os arquivos originais sem compressao.</p>
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="checkbox" id="editCommentsEnabled" style="width:1rem; height:1rem; accent-color:var(--accent); cursor:pointer;">
            <span style="color:var(--text-primary); font-size:0.875rem; font-weight:500;">Comentarios por foto habilitados</span>
          </label>
          <p style="font-size:0.6875rem; color:var(--text-muted); margin-top:-0.5rem; margin-left:1.5rem;">Quando marcado, o cliente pode comentar em fotos individuais da galeria.</p>
        </div>
        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
          <button id="cancelEditSession" style="padding:0.5rem 1rem; color:var(--text-secondary); background:none; border:1px solid var(--border); border-radius:0.375rem; cursor:pointer;">Cancelar</button>
          <button id="confirmEditSession" style="padding:0.5rem 1rem; background:var(--accent); color:white; border:none; border-radius:0.375rem; cursor:pointer; font-weight:600;">Salvar</button>
        </div>
      </div>
    </div>

    <!-- Modal Ver Selecao -->
    <div id="selectionModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:50; flex-direction:column;">
      <div style="background:var(--bg-surface); border-bottom:1px solid var(--border); padding:1rem 1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 id="selectionModalTitle" style="font-size:1.125rem; font-weight:bold; color:var(--text-primary);">Selecao do Cliente</h3>
          <p id="selectionModalInfo" style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.25rem;"></p>
        </div>
        <div style="display:flex; gap:0.75rem;">
          <button id="exportSelectionBtn" style="padding:0.5rem 1rem; background:var(--green); color:white; border-radius:0.375rem; border:none; cursor:pointer; font-weight:600; font-size:0.875rem;">Exportar Lightroom</button>
          <button id="closeSelectionModal" style="padding:0.5rem 1rem; color:var(--text-secondary); background:none; border:1px solid var(--border); border-radius:0.375rem; cursor:pointer;">Fechar</button>
        </div>
      </div>
      <div style="flex:1; overflow-y:auto; overflow-x:hidden; padding:1.5rem;">
        <div id="selectionPhotosGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:0.75rem;">
        </div>
      </div>
    </div>

    <!-- Modal Participantes (Multi-Seleção) -->
    <div id="participantsModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:50; flex-direction:column;">
      <div style="background:var(--bg-surface); border-bottom:1px solid var(--border); padding:1rem 1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <div>
            <h3 id="participantsModalTitle" style="font-size:1.125rem; font-weight:bold; color:var(--text-primary);">Participantes</h3>
            <p style="font-size:0.75rem; color:var(--text-secondary);">Gerencie os alunos/clientes desta sessão</p>
        </div>
        <div style="display:flex; gap:0.75rem;">
          <button id="exportParticipantsBtn" style="padding:0.5rem 1rem; background:var(--green); color:white; border-radius:0.375rem; border:none; cursor:pointer; font-weight:600; font-size:0.875rem;">Exportar Seleções</button>
          <button id="closeParticipantsModal" style="padding:0.5rem 1rem; color:var(--text-secondary); background:none; border:1px solid var(--border); border-radius:0.375rem; cursor:pointer;">Fechar</button>
        </div>
      </div>
      <div style="flex:1; overflow-y:auto; overflow-x:hidden; padding:1.5rem;">
        <!-- Form Adicionar -->
        <div style="background:var(--bg-base); padding:1rem; border-radius:0.5rem; border:1px solid var(--border); margin-bottom:1.5rem;">
            <h4 style="color:var(--text-primary); font-size:0.875rem; font-weight:600; margin-bottom:0.75rem;">Adicionar Participante</h4>
            <div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:end;">
                <div style="flex:2; min-width:200px;">
                    <input type="text" id="newPartName" placeholder="Nome completo" style="width:100%; padding:0.5rem; border-radius:0.375rem; border:1px solid var(--border); background:var(--bg-surface); color:white;">
                </div>
                <div style="flex:1; min-width:150px;">
                    <input type="email" id="newPartEmail" placeholder="Email (opcional)" style="width:100%; padding:0.5rem; border-radius:0.375rem; border:1px solid var(--border); background:var(--bg-surface); color:white;">
                </div>
                <div style="flex:1; min-width:100px;">
                    <input type="number" id="newPartLimit" placeholder="Limite" value="30" style="width:100%; padding:0.5rem; border-radius:0.375rem; border:1px solid var(--border); background:var(--bg-surface); color:white;">
                </div>
                <button id="addParticipantBtn" style="background:var(--accent); color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:600;">Adicionar</button>
            </div>
        </div>

        <!-- Lista -->
        <div id="participantsList" style="display:flex; flex-direction:column; gap:0.5rem;">
        </div>
      </div>
    </div>

    <!-- Modal Comentarios -->
    <div id="commentsModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:flex-start; justify-content:center; overflow-y:auto; padding:2rem 1rem;">
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.75rem; padding:1.5rem; width:28rem; max-width:100%; display:flex; flex-direction:column; gap:1rem; margin:2rem auto;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:1.125rem; font-weight:bold; color:var(--text-primary);">Comentários da Foto</h3>
            <button id="closeCommentsModal" style="color:var(--text-secondary); background:none; border:none; cursor:pointer; font-size:1.25rem;">&times;</button>
        </div>
        <div id="commentsList" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:0.75rem; min-height:200px; max-height:400px; background:var(--bg-base); padding:1rem; border-radius:0.5rem; border:1px solid var(--border);">
            <!-- Comentarios aqui -->
        </div>
        <div style="display:flex; gap:0.5rem;">
            <input type="text" id="adminCommentInput" placeholder="Escreva uma resposta..." style="flex:1; padding:0.5rem; border-radius:0.375rem; border:1px solid var(--border); background:var(--bg-base); color:white;">
            <button id="sendAdminCommentBtn" style="background:var(--accent); color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:600;">Enviar</button>
        </div>
      </div>
    </div>
  `;

  // Carrega sessoes
  let sessionsData = [];
  try {
    const result = await apiGet('/api/sessions');
    sessionsData = result.sessions || [];
    filterAndRender();
  } catch (error) {
    const list = container.querySelector('#sessionsList');
    if (list) list.innerHTML = `<p style="color:var(--red);">${error.message}</p>`;
  }

  // Função de filtragem e renderização
  function filterAndRender() {
    const searchTerm = container.querySelector('#filterSearch').value.toLowerCase();
    const sortValue = container.querySelector('#filterSort').value;
    const modeValue = container.querySelector('#filterMode').value;
    const checkedStatuses = Array.from(container.querySelectorAll('#statusFilters input:checked')).map(cb => cb.value);
    const dateFromVal = container.querySelector('#filterDateFrom').value;
    const dateToVal = container.querySelector('#filterDateTo').value;
    // Converter para datas com hora no limite do dia
    const dateFrom = dateFromVal ? new Date(dateFromVal + 'T00:00:00') : null;
    const dateTo = dateToVal ? new Date(dateToVal + 'T23:59:59') : null;

    let filtered = sessionsData.filter(session => {
        // Filtro de Texto
        if (searchTerm && !session.name.toLowerCase().includes(searchTerm)) return false;

        // Filtro de Modo
        if (modeValue !== 'all' && session.mode !== modeValue) return false;

        // Verificar expiração para filtro de status
        const now = new Date();
        const deadline = session.selectionDeadline ? new Date(session.selectionDeadline) : null;
        const isExpired = deadline && now > deadline && session.selectionStatus !== 'submitted' && session.selectionStatus !== 'delivered';

        // Determinar status efetivo para filtro
        let effectiveStatus = session.selectionStatus;
        if (isExpired) effectiveStatus = 'expired';

        // Filtro de Status
        if (!checkedStatuses.includes(effectiveStatus)) return false;

        // Filtro de Periodo (campo selecionável)
        if (dateFrom || dateTo) {
            const dateField = container.querySelector('#filterDateField')?.value || 'createdAt';
            const rawValue = session[dateField];
            if (!rawValue) return (dateFrom || dateTo) ? false : true;
            const fieldDate = new Date(rawValue);
            if (dateFrom && fieldDate < dateFrom) return false;
            if (dateTo && fieldDate > dateTo) return false;
        }

        return true;
    });

    // Ordenação
    filtered.sort((a, b) => {
        if (sortValue === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortValue === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortValue === 'az') return a.name.localeCompare(b.name);
        if (sortValue === 'za') return b.name.localeCompare(a.name);
        return 0;
    });

    renderList(filtered);
  }

  function renderList(items) {
    const list = container.querySelector('#sessionsList');
    if (items.length === 0) {
        list.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:2rem;">Nenhuma sessão encontrada com os filtros atuais.</p>';
        return;
    }

    list.innerHTML = items.map(session => {
        const now = new Date();
        const deadline = session.selectionDeadline ? new Date(session.selectionDeadline) : null;
        const isExpired = deadline && now > deadline && session.selectionStatus !== 'submitted' && session.selectionStatus !== 'delivered';
        
        // Usar status 'expired' se aplicável, senão o status original
        const statusKey = isExpired ? 'expired' : session.selectionStatus;
        const status = STATUS_LABELS[statusKey] || STATUS_LABELS.pending;
        
        const mode = session.mode || 'gallery';
        const isMulti = mode === 'multi_selection';
        const selectedCount = (session.selectedPhotos || []).length;
        const limit = session.packageLimit || 30;
        const extras = Math.max(0, selectedCount - limit);
        const extraPrice = session.extraPhotoPrice || 25;

        return `
        <div style="border:1px solid var(--border); border-radius:0.75rem; padding:1rem; background:var(--bg-surface);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="display:flex; gap:1rem; flex:1;">
              <div style="width:80px; height:80px; flex-shrink:0; border-radius:0.5rem; overflow:hidden; background:var(--bg-base); display:flex; align-items:center; justify-content:center; border:1px solid var(--border);">
                ${session.coverPhoto 
                  ? `<img src="${resolveImagePath(session.coverPhoto)}" style="width:100%; height:100%; object-fit:cover;" alt="Capa">` 
                  : `<span style="color:var(--text-muted); font-size:0.625rem; text-align:center;">Sem capa</span>`}
              </div>
              <div style="flex:1;">
                <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                <strong style="color:var(--text-primary); font-size:1.125rem;">${session.name}</strong>
                <span style="color:var(--text-secondary); font-size:0.875rem;">${session.type}</span>
                ${session.clientId ? `<span style="color:var(--green); font-size:0.875rem; display:flex; align-items:center; gap:0.25rem;" title="Cliente vinculado"><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>${session.clientId.name}</span>` : ''}
                <span style="font-size:0.625rem; padding:0.125rem 0.5rem; border-radius:9999px; color:${status.color}; background:${status.bg}; border:1px solid ${status.color}44; font-weight:600;">
                  ${status.text}
                </span>
                ${session.extraRequest?.status === 'pending' ? `<span style="font-size:0.625rem; padding:0.125rem 0.5rem; border-radius:9999px; color:var(--orange); background:rgba(255,166,87,0.15); border:1px solid rgba(255,166,87,0.4); font-weight:600;">📸 ${session.extraRequest.photos?.length || 0} extra(s)</span>` : ''}
                <span style="font-size:0.625rem; padding:0.125rem 0.5rem; border-radius:9999px; color:var(--purple); background:rgba(188, 140, 255, 0.1); border:1px solid rgba(188, 140, 255, 0.3); font-weight:500;">
                  ${mode === 'selection' ? 'Selecao' : (isMulti ? 'Multi-Seleção' : 'Galeria')}
                </span>
                ${session.workflowType === 'post_edit' ? `<span style="font-size:0.625rem; padding:0.125rem 0.5rem; border-radius:9999px; color:var(--yellow); background:rgba(210,153,34,0.12); border:1px solid rgba(210,153,34,0.35); font-weight:500;">✏️ Pós-Edição</span>` : ''}
              </div>
              <div style="color:var(--text-secondary); font-size:0.75rem; margin-top:0.25rem;">
                ${formatDate(session.date)} • ${session.photos?.length || 0} fotos
                ${mode === 'selection' ? ` • ${selectedCount}/${limit} selecionadas` : (isMulti ? ` • ${(session.participants || []).length} participantes` : '')}
                ${deadline ? ` • Prazo: ${new Date(deadline).toLocaleDateString('pt-BR')}` : ''}
                ${!isMulti && extras > 0 ? ` • <span style="color:var(--yellow);">${extras} extras (R$ ${(extras * extraPrice).toFixed(2)})</span>` : ''}
              </div>
              </div>
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center; flex-shrink:0; flex-wrap:wrap; justify-content:flex-end;">
              <button onclick="viewSessionPhotos('${session._id}')" style="background:var(--accent); color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;">
                Fotos
              </button>
              ${isMulti ? `
              <button onclick="viewParticipants('${session._id}')" style="background:var(--purple); color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;">
                Participantes
              </button>` : ''}
              ${!isMulti && session.selectionStatus === 'submitted' ? `
              <button onclick="reopenSelection('${session._id}')" style="background:var(--yellow); color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;">
                Reabrir
              </button>
              <button onclick="deliverSession('${session._id}')" style="background:${session.workflowType === 'post_edit' ? 'transparent' : 'var(--green)'}; color:${session.workflowType === 'post_edit' ? 'var(--green)' : 'white'}; padding:0.375rem 0.75rem; border-radius:0.375rem; border:${session.workflowType === 'post_edit' ? '1px solid var(--green)' : 'none'}; cursor:pointer; font-size:0.75rem; font-weight:500;" title="${session.workflowType === 'post_edit' ? 'Edite no Lightroom antes de entregar' : ''}">
                Entregar
              </button>` : ''}
              ${session.extraRequest?.status === 'pending' ? `
              <button onclick="acceptExtraRequest('${session._id}')" style="background:var(--green); color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;" title="Aceitar fotos extras">
                ✅ Aceitar extras
              </button>
              <button onclick="rejectExtraRequest('${session._id}')" style="background:rgba(248,81,73,0.1); color:var(--red); padding:0.375rem 0.75rem; border-radius:0.375rem; border:1px solid rgba(248,81,73,0.3); cursor:pointer; font-size:0.75rem;" title="Recusar fotos extras">
                ✗ Recusar
              </button>` : ''}
              <button onclick="sendSessionCode('${session._id}', '${session.accessCode}')" style="background:var(--bg-hover); color:var(--text-secondary); padding:0.375rem 0.75rem; border-radius:0.375rem; border:1px solid var(--border); cursor:pointer; font-size:0.75rem;" title="Enviar código por e-mail ao cliente">
                📧 Enviar
              </button>
              <button onclick="editSession('${session._id}')" style="background:var(--orange); color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;">
                Config
              </button>
              <button onclick="copySessionCode('${session.accessCode}')" style="background:var(--bg-hover); color:var(--text-secondary); padding:0.375rem 0.75rem; border-radius:0.375rem; border:1px solid var(--border); cursor:pointer; font-size:0.75rem;" title="Copiar codigo">
                Codigo
              </button>
              <button onclick="deleteSession('${session._id}')" style="background:rgba(248, 81, 73, 0.1); color:var(--red); padding:0.375rem 0.5rem; border-radius:0.375rem; border:1px solid rgba(248, 81, 73, 0.3); cursor:pointer; font-size:0.75rem;" title="Deletar">
                &times;
              </button>
            </div>
          </div>
          <div style="font-size:0.75rem; background:var(--bg-base); border-radius:0.25rem; padding:0.375rem 0.75rem; font-family:monospace; color:var(--accent); margin-top:0.5rem; border:1px solid var(--border);">
            Codigo: ${session.accessCode}
          </div>
        </div>
      `}).join('');
  }

  // Event Listeners para Filtros
  container.querySelector('#filterSearch').addEventListener('input', filterAndRender);
  container.querySelector('#filterSort').addEventListener('change', filterAndRender);
  container.querySelector('#filterMode').addEventListener('change', filterAndRender);
  container.querySelectorAll('#statusFilters input').forEach(cb => {
      cb.addEventListener('change', filterAndRender);
  });
  container.querySelector('#filterDateFrom').addEventListener('change', filterAndRender);
  container.querySelector('#filterDateTo').addEventListener('change', filterAndRender);
  container.querySelector('#filterDateField').addEventListener('change', filterAndRender);
  container.querySelector('#clearDateFilter').addEventListener('click', () => {
      container.querySelector('#filterDateFrom').value = '';
      container.querySelector('#filterDateTo').value = '';
      filterAndRender();
  });

  // Toggle campos de selecao no modal
  const modeSelect = container.querySelector('#sessionMode');
  const selectionFields = container.querySelector('#selectionFields');
  const multiHint = container.querySelector('#multiSelectionHint');

  modeSelect.onchange = () => {
    selectionFields.style.display = modeSelect.value === 'selection' ? 'flex' : 'none';
    multiHint.style.display = modeSelect.value === 'multi_selection' ? 'block' : 'none';
  };

  // Upload de foto de capa
  container.querySelector('#coverInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, appState.authToken, (percent) => {
        showUploadProgress('coverProgress', percent);
      });
      container.querySelector('#sessionCoverPhoto').value = result.url;
      container.querySelector('#coverPreview').innerHTML = `<img src="${resolveImagePath(result.url)}" style="width:100%; height:100%; object-fit:cover;">`;
      e.target.value = '';
    } catch (error) {
      window.showToast?.('Erro no upload: ' + error.message, 'error');
    }
  };

  // Nova sessao - modal
  const newSessionModal = container.querySelector('#newSessionModal');

  container.querySelector('#addSessionBtn').onclick = () => {
    // Resetar campos
    container.querySelector('#clientSearchInput').value = '';
    container.querySelector('#sessionClientId').value = '';
    container.querySelector('#clientSearchHint').textContent = '';
    container.querySelector('#clientSearchDropdown').style.display = 'none';
    container.querySelector('#sessionName').value = '';
    container.querySelector('#dateValidationMsg').style.display = 'none';
    container.querySelector('#sessionCoverPhoto').value = '';
    container.querySelector('#coverPreview').innerHTML = '<span style="color:var(--text-muted); font-size:0.625rem;">Sem capa</span>';
    // Preencher "Criado em" com hoje
    const today = new Date().toISOString().split('T')[0];
    container.querySelector('#sessionCreatedAtDate').value = today;
    container.querySelector('#sessionDate').value = '';
    container.querySelector('#sessionDeadline').value = '';
    newSessionModal.style.display = 'flex';
  };

  // --- Autocomplete de clientes ---
  const clientSearchInput = container.querySelector('#clientSearchInput');
  const clientSearchDropdown = container.querySelector('#clientSearchDropdown');
  const clientSearchHint = container.querySelector('#clientSearchHint');
  let _searchTimer = null;

  function renderClientDropdown(clients, query) {
    clientSearchDropdown.innerHTML = '';
    // Opção de nenhum cliente
    const nenhum = document.createElement('div');
    nenhum.textContent = '— Sem vínculo';
    nenhum.style.cssText = 'padding:0.5rem 0.75rem; cursor:pointer; color:var(--text-muted); font-size:0.875rem;';
    nenhum.onmouseenter = () => nenhum.style.background = 'var(--bg-hover)';
    nenhum.onmouseleave = () => nenhum.style.background = '';
    nenhum.onclick = () => {
      clientSearchInput.value = '';
      container.querySelector('#sessionClientId').value = '';
      clientSearchHint.textContent = '';
      clientSearchDropdown.style.display = 'none';
    };
    clientSearchDropdown.appendChild(nenhum);

    // Resultados encontrados
    clients.forEach(c => {
      const item = document.createElement('div');
      item.style.cssText = 'padding:0.5rem 0.75rem; cursor:pointer; color:var(--text-primary); font-size:0.875rem; border-top:1px solid var(--border);';
      item.innerHTML = `<strong>${escapeHtml(c.name)}</strong>${c.email ? `<span style="color:var(--text-muted); font-size:0.75rem;"> · ${escapeHtml(c.email)}</span>` : ''}`;
      item.onmouseenter = () => item.style.background = 'var(--bg-hover)';
      item.onmouseleave = () => item.style.background = '';
      item.onclick = () => {
        clientSearchInput.value = c.name;
        container.querySelector('#sessionClientId').value = c._id;
        if (!container.querySelector('#sessionName').value) {
          container.querySelector('#sessionName').value = c.name;
        }
        clientSearchHint.textContent = c.email ? `✓ Cliente vinculado · E-mail: ${c.email}` : '✓ Cliente vinculado';
        clientSearchHint.style.color = 'var(--green)';
        clientSearchDropdown.style.display = 'none';
      };
      clientSearchDropdown.appendChild(item);
    });

    // Opção de criar novo
    if (query.trim()) {
      const criar = document.createElement('div');
      criar.style.cssText = 'padding:0.5rem 0.75rem; cursor:pointer; color:var(--accent); font-size:0.875rem; border-top:1px solid var(--border); font-weight:500;';
      criar.textContent = `+ Cadastrar "${query.trim()}" como novo cliente`;
      criar.onmouseenter = () => criar.style.background = 'var(--bg-hover)';
      criar.onmouseleave = () => criar.style.background = '';
      criar.onclick = async () => {
        clientSearchDropdown.style.display = 'none';
        clientSearchHint.textContent = 'Cadastrando...';
        clientSearchHint.style.color = 'var(--text-muted)';
        try {
          const result = await apiPost('/api/clients', { name: query.trim() });
          const newClient = result.client;
          clientSearchInput.value = newClient.name;
          container.querySelector('#sessionClientId').value = newClient._id;
          if (!container.querySelector('#sessionName').value) {
            container.querySelector('#sessionName').value = newClient.name;
          }
          clientSearchHint.textContent = `✓ Novo cliente cadastrado!`;
          clientSearchHint.style.color = 'var(--green)';
        } catch (e) {
          clientSearchHint.textContent = 'Erro ao cadastrar: ' + e.message;
          clientSearchHint.style.color = 'var(--red)';
        }
      };
      clientSearchDropdown.appendChild(criar);
    }

    clientSearchDropdown.style.display = 'block';
  }

  clientSearchInput.oninput = () => {
    clearTimeout(_searchTimer);
    const q = clientSearchInput.value.trim();
    if (!q) {
      clientSearchDropdown.style.display = 'none';
      container.querySelector('#sessionClientId').value = '';
      clientSearchHint.textContent = '';
      return;
    }
    _searchTimer = setTimeout(async () => {
      try {
        const data = await apiGet(`/api/clients/search?q=${encodeURIComponent(q)}`);
        renderClientDropdown(data.clients || [], q);
      } catch (e) { /* silencioso */ }
    }, 300);
  };

  // Fechar dropdown ao clicar fora
  document.addEventListener('click', (e) => {
    if (!clientSearchInput.contains(e.target) && !clientSearchDropdown.contains(e.target)) {
      clientSearchDropdown.style.display = 'none';
    }
  }, { capture: true });

  // --- Validação cruzada de datas ---
  function validateDates() {
    const createdVal = container.querySelector('#sessionCreatedAtDate').value;
    const eventVal   = container.querySelector('#sessionDate').value;
    const deadlineVal = container.querySelector('#sessionDeadline').value;
    const msg = container.querySelector('#dateValidationMsg');

    if (createdVal && eventVal && eventVal < createdVal) {
      msg.textContent = '⚠ A Data do Evento não pode ser anterior ao "Criado em".';
      msg.style.display = 'block';
      return false;
    }
    if (eventVal && deadlineVal) {
      const eventDate = new Date(eventVal + 'T00:00:00');
      const deadline  = new Date(deadlineVal);
      if (deadline < eventDate) {
        msg.textContent = '⚠ O Prazo de Seleção não pode ser anterior à Data do Evento.';
        msg.style.display = 'block';
        return false;
      }
    }
    msg.style.display = 'none';
    return true;
  }

  container.querySelector('#sessionCreatedAtDate').oninput = validateDates;
  container.querySelector('#sessionDate').oninput = validateDates;
  container.querySelector('#sessionDeadline').oninput = validateDates;

  container.querySelector('#cancelNewSession').onclick = () => {
    newSessionModal.style.display = 'none';
  };

  container.querySelector('#confirmNewSession').onclick = async () => {
    if (!validateDates()) return;

    const name = container.querySelector('#sessionName').value.trim();
    const type = container.querySelector('#sessionType').value;
    const date = container.querySelector('#sessionDate').value;           // data do evento
    const selectionDeadline = container.querySelector('#sessionDeadline').value || null;
    const mode = container.querySelector('#sessionMode').value;
    const packageLimit = parseInt(container.querySelector('#sessionLimit').value) || 30;
    const extraPhotoPrice = parseFloat(container.querySelector('#sessionExtraPrice').value) || 25;
    const photoResolution = parseInt(container.querySelector('#sessionResolution').value) || 1200;
    const workflowType = container.querySelector('#sessionWorkflow').value || 'ready';
    const coverPhoto = container.querySelector('#sessionCoverPhoto').value;
    const clientId = container.querySelector('#sessionClientId').value || null;

    if (!name) { window.showToast?.('Nome da sessão é obrigatório', 'warning'); return; }

    // Buscar email do cliente vinculado (se houver)
    let clientEmail = '';
    if (clientId) {
      try {
        const data = await apiGet(`/api/clients/search?q=${encodeURIComponent(container.querySelector('#clientSearchInput').value)}`);
        const linked = (data.clients || []).find(c => c._id === clientId);
        if (linked) clientEmail = linked.email || '';
      } catch (e) { /* silencioso */ }
    }

    try {
      const result = await apiPost('/api/sessions', {
        name, clientEmail, type, date, selectionDeadline,
        mode, packageLimit, extraPhotoPrice, photoResolution, workflowType, coverPhoto, clientId
      });

      newSessionModal.style.display = 'none';
      window.showToast?.(`Sessão criada! Código: ${result.accessCode || result.session?.accessCode}`, 'success', 6000);
      await renderSessoes(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  // Copiar codigo
  window.copySessionCode = (code) => {
    copyToClipboard(code);
  };

  // Ver fotos da sessao
  let currentSessionId = null;
  window.viewSessionPhotos = async (sessionId) => {
    currentSessionId = sessionId;
    const session = sessionsData.find(s => s._id === sessionId);
    if (!session) return;

    const modal = container.querySelector('#sessionPhotosModal');
    const title = container.querySelector('#photosModalTitle');
    const grid = container.querySelector('#sessionPhotosGrid');

    title.textContent = `Fotos - ${session.name}`;

    // Lógica do Botão de Upload Unificado
    const uploadGroup = container.querySelector('#uploadButtonGroup');
    const mainBtn = container.querySelector('#mainUploadBtn');
    const secondaryBtn = container.querySelector('#secondaryUploadBtn');
    const dropdownToggle = container.querySelector('#uploadDropdownToggle');
    const dropdownMenu = container.querySelector('#uploadDropdownMenu');

    // Reset Dropdown
    dropdownMenu.style.display = 'none';
    dropdownToggle.style.display = session.workflowType === 'post_edit' ? 'flex' : 'none';
    mainBtn.style.borderRadius = session.workflowType === 'post_edit' ? '0.375rem 0 0 0.375rem' : '0.375rem';

    const labelAdd = `<span>+</span> Upload`;
    const labelEdit = `<span>✏️</span> Subir Editadas`;

    if (session.workflowType === 'post_edit' && session.selectionStatus === 'submitted') {
        // Primário: Subir Editadas
        mainBtn.innerHTML = labelEdit;
        mainBtn.htmlFor = 'sessionEditedInput';
        mainBtn.title = "Upload das fotos editadas no Lightroom — substitui por nome de arquivo";
        mainBtn.style.background = 'var(--purple)';
        dropdownToggle.style.background = 'var(--purple)';

        secondaryBtn.innerHTML = labelAdd;
        secondaryBtn.htmlFor = 'sessionUploadInput';
        secondaryBtn.onmouseenter = () => secondaryBtn.style.background = 'var(--bg-hover)';
        secondaryBtn.onmouseleave = () => secondaryBtn.style.background = '';
    } else {
        // Primário: Upload Normal
        mainBtn.innerHTML = labelAdd;
        mainBtn.htmlFor = 'sessionUploadInput';
        mainBtn.title = "Adicionar novas fotos à galeria";
        mainBtn.style.background = 'var(--accent)';
        dropdownToggle.style.background = 'var(--accent)';

        secondaryBtn.innerHTML = labelEdit;
        secondaryBtn.htmlFor = 'sessionEditedInput';
        secondaryBtn.onmouseenter = () => secondaryBtn.style.background = 'var(--bg-hover)';
        secondaryBtn.onmouseleave = () => secondaryBtn.style.background = '';
        
        // Se for ready, o menu de editadas nem deve aparecer
        if (session.workflowType === 'ready') {
          dropdownToggle.style.display = 'none';
          mainBtn.style.borderRadius = '0.375rem';
        }
    }

    // Toggle Dropdown
    dropdownToggle.onclick = (e) => {
        e.stopPropagation();
        const isVisible = dropdownMenu.style.display === 'block';
        dropdownMenu.style.display = isVisible ? 'none' : 'block';
    };

    const photos = session.photos || [];
    const selectedIds = session.selectedPhotos || [];

    if (photos.length > 0) {
      grid.innerHTML = photos.map((photo, idx) => {
        const isSelected = selectedIds.includes(photo.id);
        const hasComments = photo.comments && photo.comments.length > 0;
        return `
        <div style="position:relative; aspect-ratio:3/2; background:var(--bg-elevated); border-radius:0.5rem; overflow:hidden; ${isSelected ? 'border:3px solid var(--green);' : ''}">
          <img src="${resolveImagePath(photo.url)}" alt="Foto ${idx + 1}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;">
          ${isSelected ? '<div style="position:absolute; top:0.25rem; right:0.25rem; background:var(--green); color:white; font-size:0.625rem; padding:0.125rem 0.375rem; border-radius:0.25rem;">Selecionada</div>' : ''}
          ${hasComments ? '<div style="position:absolute; top:0.25rem; left:0.25rem; background:var(--accent); color:white; font-size:0.625rem; padding:0.125rem 0.375rem; border-radius:0.25rem;" title="Tem comentários">💬</div>' : ''}
          <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); opacity:0; transition:opacity 0.2s; display:flex; align-items:center; justify-content:center;"
            onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0'">
            <button onclick="openComments('${sessionId}', '${photo.id}')" style="background:var(--accent); color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer; margin-right:0.5rem;" title="Comentários">
              💬
            </button>
            <button onclick="deleteSessionPhoto('${sessionId}', '${photo.id}')" style="background:var(--red); color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer;" title="Remover">
              &times;
            </button>
          </div>
          <div style="position:absolute; bottom:0.25rem; left:0.25rem; background:rgba(0,0,0,0.7); color:white; font-size:0.625rem; padding:0.125rem 0.375rem; border-radius:0.25rem;">${idx + 1}</div>
        </div>
      `}).join('');
    } else {
      grid.innerHTML = '<p style="color:var(--text-secondary); text-align:center; grid-column:1/-1; padding:3rem;">Nenhuma foto. Use o botao Upload acima.</p>';
    }

    // Renderizar Entrega Final (Fotos com urlOriginal)
    const deliveredPhotos = photos.filter(p => p.urlOriginal);
    const selectedGrid = container.querySelector('#selectedPhotosGrid');
    const badge = container.querySelector('#deliveryCountBadge');
    
    const selectedCount = (session.selectedPhotos || []).length;
    badge.textContent = `${deliveredPhotos.length}/${selectedCount || photos.length}`;

    if (deliveredPhotos.length > 0) {
      selectedGrid.innerHTML = deliveredPhotos.map((photo, idx) => `
        <div style="position:relative; aspect-ratio:3/2; background:var(--bg-elevated); border-radius:0.4rem; overflow:hidden; border:2px solid var(--green);">
          <img src="${resolveImagePath(photo.url)}" alt="Final" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;">
          <div style="position:absolute; bottom:0.25rem; right:0.25rem; background:var(--green); color:white; font-size:0.5rem; padding:0.1rem 0.3rem; border-radius:4px; font-weight:bold;">ALTA RES</div>
        </div>
      `).join('');
    } else {
      selectedGrid.innerHTML = `
        <div style="color:var(--text-muted); text-align:center; grid-column:1/-1; padding:2rem; font-size:0.875rem;">
          <p>Nenhuma foto final enviada ainda.</p>
          <p style="font-size:0.75rem; margin-top:0.5rem;">Use o botão <b>Subir Editadas</b> para preencher esta área.</p>
        </div>`;
    }

    // Exportar
    const exportBtn = container.querySelector('#exportSelectionBtn');
    exportBtn.style.display = session.workflowType === 'post_edit' && selectedIds.length > 0 ? 'flex' : 'none';
    exportBtn.onclick = () => {
      window.open(`/api/sessions/${sessionId}/export?token=${appState.authToken}`, '_blank');
    };

    modal.style.display = 'flex';
  };

  // Ver selecao do cliente - Agora aponta para a visão unificada
  window.viewSelection = async (sessionId) => {
    window.viewSessionPhotos(sessionId);
  };

  // Modal de Validação de Upload
  const showUploadValidationModal = (report, onConfirm) => {
    const modal = container.querySelector('#uploadValidationModal');
    const content = container.querySelector('#validationContent');
    const confirmBtn = container.querySelector('#confirmValidationBtn');
    const cancelBtn = container.querySelector('#cancelValidationBtn');

    let html = '';

    if (report.unmatched.length > 0) {
      html += `
        <div style="background:rgba(248,81,73,0.1); border:1px solid rgba(248,81,73,0.2); padding:0.75rem; border-radius:0.5rem;">
          <strong style="color:var(--red); font-size:0.875rem; display:block; margin-bottom:0.25rem;">🔴 Arquivos Não Encontrados (${report.unmatched.length})</strong>
          <p style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem;">Esses nomes não existem na galeria atual. Se continuar, elas serão adicionadas como novas fotos.</p>
          <div style="max-height:80px; overflow-y:auto; font-family:monospace; font-size:0.7rem; color:var(--text-muted); background:rgba(0,0,0,0.2); padding:0.4rem; border-radius:0.25rem;">
            ${report.unmatched.join('<br>')}
          </div>
        </div>
      `;
    }

    if (report.notSelected.length > 0) {
      html += `
        <div style="background:rgba(210,153,34,0.1); border:1px solid rgba(210,153,34,0.2); padding:0.75rem; border-radius:0.5rem;">
          <strong style="color:var(--yellow); font-size:0.875rem; display:block; margin-bottom:0.25rem;">🟡 Não Selecionadas pelo Cliente (${report.notSelected.length})</strong>
          <p style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem;">Estas fotos existem na galeria, mas o cliente NÃO as escolheu no pacote.</p>
          <div style="max-height:80px; overflow-y:auto; font-family:monospace; font-size:0.7rem; color:var(--text-muted); background:rgba(0,0,0,0.2); padding:0.4rem; border-radius:0.25rem;">
            ${report.notSelected.join('<br>')}
          </div>
        </div>
      `;
    }

    if (report.extraCount > 0) {
      html += `
        <div style="background:rgba(47,129,247,0.1); border:1px solid rgba(47,129,247,0.2); padding:0.75rem; border-radius:0.5rem;">
          <strong style="color:var(--accent); font-size:0.875rem; display:block; margin-bottom:0.25rem;">📊 Resumo de Quantidade</strong>
          <p style="font-size:0.875rem; color:var(--text-primary);">Você está enviando <b>${report.total}</b> fotos.</p>
          <p style="font-size:0.75rem; color:var(--text-secondary);">O limite do pacote/seleção é de <b>${report.limit}</b> fotos. Você está entregando <b>${report.extraCount}</b> fotos a mais (Brinde).</p>
        </div>
      `;
    } else if (report.total > 0) {
      html += `
        <div style="background:rgba(63,185,80,0.1); border:1px solid rgba(63,185,80,0.2); padding:0.75rem; border-radius:0.5rem;">
          <strong style="color:var(--green); font-size:0.875rem; display:block; margin-bottom:0.25rem;">✅ Tudo Certo!</strong>
          <p style="font-size:0.875rem; color:var(--text-primary);">Total de <b>${report.total}</b> fotos compatíveis com a seleção.</p>
        </div>
      `;
    }

    content.innerHTML = html;
    confirmBtn.textContent = (report.unmatched.length > 0 || report.notSelected.length > 0) ? 'Subir Tudo (Brinde)' : 'Iniciar Upload';
    
    modal.style.display = 'flex';

    confirmBtn.onclick = () => {
      modal.style.display = 'none';
      onConfirm(true); // Subir tudo
    };
    cancelBtn.onclick = () => {
      modal.style.display = 'none';
      onConfirm(false); // Cancelar
    };
  };

  // Enviar codigo por email ao cliente (acao manual do fotografo)
  window.sendSessionCode = async (sessionId, accessCode) => {
    const session = sessionsData.find(s => s._id === sessionId);
    const clientEmail = session?.clientEmail || session?.clientId?.email || '';
    if (!clientEmail) {
      window.showToast?.('Este cliente não tem e-mail cadastrado. Copie o código manualmente.', 'warning', 5000);
      copyToClipboard(accessCode);
      return;
    }
    const ok = await window.showConfirm?.(`Enviar código de acesso para ${clientEmail}?`);
    if (!ok) return;
    try {
      await apiPost(`/api/sessions/${sessionId}/send-code`);
      window.showToast?.('E-mail enviado com sucesso!', 'success');
    } catch (error) {
      window.showToast?.('Erro ao enviar: ' + error.message, 'error');
    }
  };

  // Reabrir selecao
  window.reopenSelection = async (sessionId) => {
    const ok = await window.showConfirm?.('Reabrir seleção? O cliente poderá alterar as fotos selecionadas.');
    if (!ok) return;
    try {
      await apiPut(`/api/sessions/${sessionId}/reopen`);
      await renderSessoes(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  // Entregar sessao
  window.deliverSession = async (sessionId) => {
    const ok = await window.showConfirm?.('Marcar esta sessão como entregue? O watermark será removido e o cliente poderá baixar as fotos.');
    if (!ok) return;
    try {
      await apiPut(`/api/sessions/${sessionId}/deliver`);
      await renderSessoes(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  // Aceitar fotos extras solicitadas pelo cliente
  window.acceptExtraRequest = async (sessionId) => {
    const session = sessionsData.find(s => s._id === sessionId);
    const count = session?.extraRequest?.photos?.length || 0;
    const ok = await window.showConfirm?.(`Aceitar ${count} foto(s) extra(s) solicitada(s)? Elas serão adicionadas à seleção do cliente.`);
    if (!ok) return;
    try {
      await apiPut(`/api/sessions/${sessionId}/extra-request/accept`);
      window.showToast?.('Extras aceitas e adicionadas à seleção!', 'success');
      await renderSessoes(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  // Recusar fotos extras
  window.rejectExtraRequest = async (sessionId) => {
    const ok = await window.showConfirm?.('Recusar a solicitação de fotos extras?');
    if (!ok) return;
    try {
      await apiPut(`/api/sessions/${sessionId}/extra-request/reject`);
      window.showToast?.('Solicitação recusada.', 'success');
      await renderSessoes(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  // Editar sessao
  let editingSessionId = null;
  const editModal = container.querySelector('#editSessionModal');
  const editModeSelect = container.querySelector('#editMode');
  const editSelFields = container.querySelector('#editSelectionFields');

  editModeSelect.onchange = () => {
    editSelFields.style.display = editModeSelect.value === 'selection' ? 'flex' : 'none';
  };

  window.editSession = async (sessionId) => {
    const session = sessionsData.find(s => s._id === sessionId);
    if (!session) return;
    editingSessionId = sessionId;

    container.querySelector('#editSessionName').value = session.name || '';
    container.querySelector('#editSessionType').value = session.type || 'Familia';
    container.querySelector('#editClientEmail').value = session.clientEmail || '';
    
    const clientSelect = container.querySelector('#editClientId');
    clientSelect.innerHTML = '<option value="">-- Nenhum cliente vinculado --</option>';
    try {
      const data = await apiGet('/api/clients');
      (data.clients || []).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c._id;
        opt.textContent = c.name + (c.email ? ` (${c.email})` : '');
        if (session.clientId && (session.clientId === c._id || session.clientId._id === c._id)) {
          opt.selected = true;
        }
        clientSelect.appendChild(opt);
      });
    } catch (e) { /* silencioso */ }
    container.querySelector('#editSessionDeadline').value = session.selectionDeadline ? new Date(session.selectionDeadline).toISOString().slice(0, 16) : '';
    editModeSelect.value = session.mode || 'selection';
    container.querySelector('#editLimit').value = session.packageLimit || 30;
    container.querySelector('#editExtraPrice').value = session.extraPhotoPrice || 25;
    container.querySelector('#editHighResDelivery').checked = session.highResDelivery || false;
    container.querySelector('#editCommentsEnabled').checked = session.commentsEnabled !== false;
    editSelFields.style.display = editModeSelect.value === 'selection' ? 'flex' : 'none';

    editModal.style.display = 'flex';
  };

  container.querySelector('#cancelEditSession').onclick = () => {
    editModal.style.display = 'none';
    editingSessionId = null;
  };

  container.querySelector('#confirmEditSession').onclick = async () => {
    if (!editingSessionId) return;
    const name = container.querySelector('#editSessionName').value.trim();
    const type = container.querySelector('#editSessionType').value;
    const mode = editModeSelect.value;
    const clientEmail = container.querySelector('#editClientEmail').value.trim();
    const clientId = container.querySelector('#editClientId').value || null;
    const selectionDeadline = container.querySelector('#editSessionDeadline').value || null;
    const packageLimit = parseInt(container.querySelector('#editLimit').value) || 30;
    const extraPhotoPrice = parseFloat(container.querySelector('#editExtraPrice').value) || 25;
    const highResDelivery = container.querySelector('#editHighResDelivery').checked;
    const commentsEnabled = container.querySelector('#editCommentsEnabled').checked;

    try {
      await apiPut(`/api/sessions/${editingSessionId}`, { name, type, mode, clientEmail, clientId, selectionDeadline, packageLimit, extraPhotoPrice, highResDelivery, commentsEnabled });

      editModal.style.display = 'none';
      editingSessionId = null;
      window.showToast?.('Configuração salva!', 'success');
      await renderSessoes(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  // Fechar modal de fotos
  container.querySelector('#closePhotosModal').onclick = () => {
    container.querySelector('#sessionPhotosModal').style.display = 'none';
    currentSessionId = null;
  };

  // Modal de Comentarios
  let currentCommentSessionId = null;
  let currentCommentPhotoId = null;
  const commentsModal = container.querySelector('#commentsModal');
  const commentsList = container.querySelector('#commentsList');
  const commentInput = container.querySelector('#adminCommentInput');

  window.openComments = (sessionId, photoId) => {
    currentCommentSessionId = sessionId;
    currentCommentPhotoId = photoId;
    const session = sessionsData.find(s => s._id === sessionId);
    if (!session) return;
    const photo = session.photos.find(p => p.id === photoId);
    if (!photo) return;

    renderCommentsList(photo.comments || []);
    commentsModal.style.display = 'flex';
  };

  function renderCommentsList(comments) {
    if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<p style="color:var(--text-muted); text-align:center; font-style:italic;">Nenhum comentário.</p>';
        return;
    }
    commentsList.innerHTML = comments.map(c => {
        const isAdmin = c.author === 'admin';
        const date = new Date(c.createdAt).toLocaleString('pt-BR');
        return `
            <div style="align-self:${isAdmin ? 'flex-end' : 'flex-start'}; max-width:80%; background:${isAdmin ? 'rgba(47,129,247,0.2)' : 'var(--bg-elevated)'}; padding:0.5rem 0.75rem; border-radius:0.5rem;">
                <div style="font-size:0.75rem; color:${isAdmin ? 'var(--accent)' : 'var(--text-secondary)'}; margin-bottom:0.25rem; font-weight:bold;">
                    ${isAdmin ? 'Você' : 'Cliente'} <span style="font-weight:normal; opacity:0.7;">${date}</span>
                </div>
                <div style="color:var(--text-primary); font-size:0.875rem;">${escapeHtml(c.text)}</div>
            </div>
        `;
    }).join('');
    commentsList.scrollTop = commentsList.scrollHeight;
  }

  container.querySelector('#closeCommentsModal').onclick = () => {
    commentsModal.style.display = 'none';
  };

  container.querySelector('#sendAdminCommentBtn').onclick = async () => {
    const text = commentInput.value.trim();
    if (!text || !currentCommentSessionId || !currentCommentPhotoId) return;

    const btn = container.querySelector('#sendAdminCommentBtn');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const result = await apiPost(`/api/sessions/${currentCommentSessionId}/photos/${currentCommentPhotoId}/comments`, { text });

        // Atualiza dados locais sem re-renderizar a tela inteira
        const session = sessionsData.find(s => s._id === currentCommentSessionId);
        if (session) {
            const photo = session.photos.find(p => p.id === currentCommentPhotoId);
            if (photo) {
                if (!photo.comments) photo.comments = [];
                photo.comments.push(result.comment);
                renderCommentsList(photo.comments);
            }
        }
        commentInput.value = '';
    } catch (error) {
        window.showToast?.('Erro: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar';
    }
  };

  // --- PARTICIPANTES (Multi-Seleção) ---
  let currentParticipantsSessionId = null;
  const participantsModal = container.querySelector('#participantsModal');
  const participantsList = container.querySelector('#participantsList');

  window.viewParticipants = async (sessionId) => {
    currentParticipantsSessionId = sessionId;
    const session = sessionsData.find(s => s._id === sessionId);
    if (!session) return;

    container.querySelector('#participantsModalTitle').textContent = `Participantes - ${session.name}`;
    renderParticipantsList(session.participants || []);
    participantsModal.style.display = 'flex';
  };

  function renderParticipantsList(participants) {
    if (!participants || participants.length === 0) {
        participantsList.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">Nenhum participante adicionado.</p>';
        return;
    }

    participantsList.innerHTML = participants.map(p => {
        const status = STATUS_LABELS[p.selectionStatus] || STATUS_LABELS.pending;
        const count = (p.selectedPhotos || []).length;
        return `
        <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:0.75rem; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="color:var(--text-primary); font-weight:600;">${p.name}</div>
                <div style="color:var(--text-secondary); font-size:0.75rem;">
                    Código: <span style="font-family:monospace; color:var(--accent); cursor:pointer;" onclick="copySessionCode('${p.accessCode}')" title="Copiar">${p.accessCode}</span>
                    • ${count}/${p.packageLimit} fotos
                    • <span style="color:${status.color};">${status.text}</span>
                </div>
            </div>
            <div style="display:flex; gap:0.5rem;">
                ${p.selectionStatus === 'submitted' ? `
                <button onclick="deliverParticipant('${p._id}')" style="background:var(--green); color:white; padding:0.25rem 0.5rem; border-radius:0.25rem; border:none; cursor:pointer; font-size:0.75rem;">Entregar</button>
                ` : ''}
                <button onclick="deleteParticipant('${p._id}')" style="background:rgba(248,81,73,0.15); color:var(--red); padding:0.25rem 0.5rem; border-radius:0.25rem; border:none; cursor:pointer; font-size:0.75rem;">X</button>
            </div>
        </div>
        `;
    }).join('');
  }

  container.querySelector('#addParticipantBtn').onclick = async () => {
    const name = container.querySelector('#newPartName').value.trim();
    const email = container.querySelector('#newPartEmail').value.trim();
    const packageLimit = container.querySelector('#newPartLimit').value;

    if (!name) return window.showToast?.('Nome é obrigatório', 'warning');

    try {
        const result = await apiPost(`/api/sessions/${currentParticipantsSessionId}/participants`, { name, email, packageLimit });
        if (result.success || result.participants) {
            renderParticipantsList(result.participants || result.session.participants);
            container.querySelector('#newPartName').value = '';
            container.querySelector('#newPartEmail').value = '';
        }
    } catch (e) { window.showToast?.(e.message, 'error'); }
  };

  window.deleteParticipant = async (pid) => {
    const ok = await window.showConfirm?.('Remover participante?');
    if (!ok) return;
    try {
      await apiDelete(`/api/sessions/${currentParticipantsSessionId}/participants/${pid}`);
      await renderSessoes(container);
      viewParticipants(currentParticipantsSessionId);
    } catch (e) { window.showToast?.(e.message, 'error'); }
  };

  window.deliverParticipant = async (pid) => {
    const ok = await window.showConfirm?.('Marcar como entregue?');
    if (!ok) return;
    try {
      await apiPut(`/api/sessions/${currentParticipantsSessionId}/participants/${pid}/deliver`);
      await renderSessoes(container);
      viewParticipants(currentParticipantsSessionId);
    } catch (e) { window.showToast?.(e.message, 'error'); }
  };

  container.querySelector('#closeParticipantsModal').onclick = () => {
    participantsModal.style.display = 'none';
  };

  container.querySelector('#exportParticipantsBtn').onclick = () => {
    window.open(`/api/sessions/${currentParticipantsSessionId}/participants/export?token=${appState.authToken}`, '_blank');
  };

  // Upload de fotos na sessao
  container.querySelector('#sessionUploadInput').onchange = async (e) => {
    if (!currentSessionId) return;
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (!window.globalUploadPanel) {
      window.globalUploadPanel = new UploadPanel('upload-panel-root');
    }
    const panel = window.globalUploadPanel;
    panel.show();

    if (!window.globalUploadQueue) {
      window.globalUploadQueue = new UploadQueue({
        concurrency: 3,
        onItemUpdate: (item) => panel.updateItem(item),
        onQueueUpdate: (stats) => panel.updateStats(stats),
        onQueueDone: async (results) => {
          window.showToast?.('Uploads finalizados!', 'success');
          await renderSessoes(container);
          if (currentSessionId) {
            viewSessionPhotos(currentSessionId);
          }
        }
      });
      panel.onCancel = (id) => window.globalUploadQueue.cancel(id);
      panel.onRetry = (id) => window.globalUploadQueue.retry(id);
    }

    // Adiciona os arquivos à fila, apontando para a sessão atual
    window.globalUploadQueue.add(files, `/api/sessions/${currentSessionId}/photos`);

    e.target.value = '';
  };

  // Upload das fotos editadas (fluxo post_edit) — casa por nome de arquivo usando UploadQueue com validação prévia
  container.querySelector('#sessionEditedInput').onchange = async (e) => {
    if (!currentSessionId) return;
    const session = sessionsData.find(s => s._id === currentSessionId);
    if (!session) return;

    const files = Array.from(e.target.files);
    if (!files.length) return;

    // --- Análise Pré-Upload ---
    const photosInSession = session.photos || [];
    const selectedIds = session.selectedPhotos || [];
    const packageLimit = session.packageLimit || 30;

    const report = {
      unmatched: [],
      notSelected: [],
      extraCount: 0,
      total: files.length,
      limit: packageLimit
    };

    files.forEach(file => {
      const match = photosInSession.find(p => p.filename === file.name);
      if (!match) {
        report.unmatched.push(file.name);
      } else if (!selectedIds.includes(match.id)) {
        report.notSelected.push(file.name);
      }
    });

    report.extraCount = Math.max(0, files.length - selectedIds.length);

    // --- Disparar Validação ---
    showUploadValidationModal(report, (confirmed) => {
      if (!confirmed) {
        e.target.value = '';
        return;
      }

      // Se confirmado, inicia o upload
      if (!window.globalUploadPanel) {
        window.globalUploadPanel = new UploadPanel('upload-panel-root');
      }
      const panel = window.globalUploadPanel;
      panel.show();

      if (!window.globalUploadQueue) {
        window.globalUploadQueue = new UploadQueue({
          concurrency: 3,
          onItemUpdate: (item) => panel.updateItem(item),
          onQueueUpdate: (stats) => panel.updateStats(stats),
          onQueueDone: async (results) => {
            window.showToast?.('Uploads de editadas finalizados!', 'success');
            await renderSessoes(container);
            if (currentSessionId) {
              viewSessionPhotos(currentSessionId);
            }
          }
        });
        panel.onCancel = (id) => window.globalUploadQueue.cancel(id);
        panel.onRetry = (id) => window.globalUploadQueue.retry(id);
      }

      // Adiciona os arquivos à fila, permitindo não-pareadas se detectadas
      const allowUnmatched = report.unmatched.length > 0;
      window.globalUploadQueue.add(files, `/api/sessions/${currentSessionId}/photos/upload-edited?allowUnmatched=${allowUnmatched}`);
      
      e.target.value = '';
    });
  };

  // Deletar foto individual
  window.deleteSessionPhoto = async (sessionId, photoId) => {
    const ok = await window.showConfirm?.('Remover esta foto?');
    if (!ok) return;
    try {
      await apiDelete(`/api/sessions/${sessionId}/photos/${photoId}`);
      await renderSessoes(container);
      viewSessionPhotos(sessionId);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  // Deletar sessao
  window.deleteSession = async (sessionId) => {
    const ok = await window.showConfirm?.('Tem certeza que deseja deletar esta sessão e todas as fotos?');
    if (!ok) return;
    try {
      await apiDelete(`/api/sessions/${sessionId}`);
      await renderSessoes(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };
}
