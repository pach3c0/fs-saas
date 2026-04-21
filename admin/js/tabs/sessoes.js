/**
 * Tab: Sessoes de Clientes
 */

import { appState } from '../state.js';
import { formatDate, copyToClipboard, resolveImagePath, escapeHtml } from '../utils/helpers.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';
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
        <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Sessoes de Clientes</h2>
        <button id="addSessionBtn" style="background:#16a34a; color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:500;">
          + Nova Sessao
        </button>
      </div>

      <!-- Filtros -->
      <div style="background:#1f2937; padding:1rem; border-radius:0.5rem; border:1px solid #374151; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; gap:1rem; flex-wrap:wrap;">
            <input type="text" id="filterSearch" placeholder="Buscar cliente..." style="flex:1; min-width:200px; padding:0.5rem; border-radius:0.375rem; border:1px solid #374151; background:#111827; color:#f3f4f6;">
            <select id="filterSort" style="padding:0.5rem; border-radius:0.375rem; border:1px solid #374151; background:#111827; color:#f3f4f6;">
                <option value="newest">Mais recentes</option>
                <option value="oldest">Mais antigos</option>
                <option value="az">Nome A-Z</option>
                <option value="za">Nome Z-A</option>
            </select>
        </div>
        <div style="display:flex; gap:1rem; flex-wrap:wrap; align-items:center;">
            <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;" id="statusFilters">
                <span style="color:#9ca3af; font-size:0.875rem;">Status:</span>
                <label style="color:#d1d5db; font-size:0.875rem; display:flex; align-items:center; gap:0.25rem; cursor:pointer;"><input type="checkbox" value="pending" checked> Pendente</label>
                <label style="color:#d1d5db; font-size:0.875rem; display:flex; align-items:center; gap:0.25rem; cursor:pointer;"><input type="checkbox" value="in_progress" checked> Em seleção</label>
                <label style="color:#d1d5db; font-size:0.875rem; display:flex; align-items:center; gap:0.25rem; cursor:pointer;"><input type="checkbox" value="submitted" checked> Enviada</label>
                <label style="color:#d1d5db; font-size:0.875rem; display:flex; align-items:center; gap:0.25rem; cursor:pointer;"><input type="checkbox" value="delivered" checked> Entregue</label>
                <label style="color:#d1d5db; font-size:0.875rem; display:flex; align-items:center; gap:0.25rem; cursor:pointer;"><input type="checkbox" value="expired" checked> Expirado</label>
            </div>
            <select id="filterMode" style="padding:0.5rem; border-radius:0.375rem; border:1px solid #374151; background:#111827; color:#f3f4f6; margin-left:auto;">
                <option value="all">Todos os modos</option>
                <option value="selection">Seleção</option>
                <option value="multi_selection">Multi-Seleção</option>
                <option value="gallery">Galeria</option>
            </select>
        </div>
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center;">
            <span style="color:#9ca3af; font-size:0.875rem;">Periodo:</span>
            <input type="date" id="filterDateFrom" style="padding:0.375rem 0.5rem; border-radius:0.375rem; border:1px solid #374151; background:#111827; color:#f3f4f6; font-size:0.875rem;">
            <span style="color:#6b7280; font-size:0.875rem;">ate</span>
            <input type="date" id="filterDateTo" style="padding:0.375rem 0.5rem; border-radius:0.375rem; border:1px solid #374151; background:#111827; color:#f3f4f6; font-size:0.875rem;">
            <button id="clearDateFilter" style="padding:0.375rem 0.75rem; border-radius:0.375rem; border:1px solid #374151; background:none; color:#9ca3af; cursor:pointer; font-size:0.75rem;">Limpar</button>
        </div>
      </div>

      <div id="sessionsList" style="display:flex; flex-direction:column; gap:0.75rem;">
        <p style="color:#9ca3af; text-align:center;">Carregando...</p>
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

    <!-- Modal Ver Fotos -->
    <div id="sessionPhotosModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:50; flex-direction:column;">
      <div style="background:#1f2937; border-bottom:1px solid #374151; padding:1rem 1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <h3 id="photosModalTitle" style="font-size:1.125rem; font-weight:bold; color:#f3f4f6;">Fotos da Sessao</h3>
        <div style="display:flex; gap:0.75rem; align-items:center;">
          <div id="sessionUploadProgress" style="min-width:150px;"></div>
          <label id="uploadMoreBtn" style="padding:0.5rem 1rem; background:#2563eb; color:white; border-radius:0.375rem; cursor:pointer; font-weight:600; font-size:0.875rem;">
            + Upload
            <input type="file" id="sessionUploadInput" accept="image/*" multiple style="display:none;">
          </label>
          <button id="closePhotosModal" style="padding:0.5rem 1rem; color:#9ca3af; background:none; border:1px solid #374151; border-radius:0.375rem; cursor:pointer;">Fechar</button>
        </div>
      </div>
      <div style="flex:1; overflow-y:auto; overflow-x:hidden; padding:1.5rem;">
        <div id="sessionPhotosGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:0.75rem;">
        </div>
      </div>
    </div>

    <!-- Modal Editar Sessao -->
    <div id="editSessionModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:flex-start; justify-content:center; overflow-y:auto; padding:2rem 1rem;">
      <div style="background:#1f2937; border:1px solid #374151; border-radius:0.75rem; padding:1.5rem; width:28rem; max-width:100%; display:flex; flex-direction:column; gap:1rem; margin:2rem auto;">
        <h3 style="font-size:1.125rem; font-weight:bold; color:#f3f4f6;">Editar Sessao</h3>
        <div>
          <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Nome da Sessão</label>
          <input type="text" id="editSessionName" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Tipo</label>
          <select id="editSessionType" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
            <option value="Familia">Familia</option>
            <option value="Casamento">Casamento</option>
            <option value="Evento">Evento</option>
            <option value="Ensaio">Ensaio</option>
            <option value="Corporativo">Corporativo</option>
          </select>
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Cliente Vinculado</label>
          <select id="editClientId" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
            <option value="">-- Nenhum cliente vinculado --</option>
          </select>
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">E-mail do Cliente <span style="color:#6b7280;">(opcional — para notificacoes)</span></label>
          <input type="email" id="editClientEmail" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;" placeholder="email@cliente.com">
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Prazo Seleção</label>
          <input type="datetime-local" id="editSessionDeadline" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Modo</label>
          <select id="editMode" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
            <option value="selection">Selecao (cliente escolhe favoritas)</option>
            <option value="gallery">Galeria (cliente so visualiza/baixa)</option>
          </select>
        </div>
        <div id="editSelectionFields" style="display:flex; gap:0.75rem;">
          <div style="flex:1;">
            <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Fotos do pacote</label>
            <input type="number" id="editLimit" min="1" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
          </div>
          <div style="flex:1;">
            <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Preco foto extra (R$)</label>
            <input type="number" id="editExtraPrice" min="0" step="0.01" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
          </div>
        </div>
        <p style="font-size:0.6875rem; color:#6b7280;">Cada cliente pode ter valores diferentes de pacote e preco de extras.</p>
        <div style="border-top:1px solid #374151; padding-top:0.75rem;">
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="checkbox" id="editHighResDelivery" style="width:1rem; height:1rem; accent-color:#2563eb; cursor:pointer;">
            <span style="color:#f3f4f6; font-size:0.875rem; font-weight:500;">Entrega em alta resolucao</span>
          </label>
          <p style="font-size:0.6875rem; color:#6b7280; margin-top:0.25rem; margin-left:1.5rem;">Quando marcado, o cliente baixa os arquivos originais sem compressao.</p>
        </div>
        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
          <button id="cancelEditSession" style="padding:0.5rem 1rem; color:#9ca3af; background:none; border:1px solid #374151; border-radius:0.375rem; cursor:pointer;">Cancelar</button>
          <button id="confirmEditSession" style="padding:0.5rem 1rem; background:#2563eb; color:white; border:none; border-radius:0.375rem; cursor:pointer; font-weight:600;">Salvar</button>
        </div>
      </div>
    </div>

    <!-- Modal Ver Selecao -->
    <div id="selectionModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:50; flex-direction:column;">
      <div style="background:#1f2937; border-bottom:1px solid #374151; padding:1rem 1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 id="selectionModalTitle" style="font-size:1.125rem; font-weight:bold; color:#f3f4f6;">Selecao do Cliente</h3>
          <p id="selectionModalInfo" style="font-size:0.75rem; color:#9ca3af; margin-top:0.25rem;"></p>
        </div>
        <div style="display:flex; gap:0.75rem;">
          <button id="exportSelectionBtn" style="padding:0.5rem 1rem; background:#16a34a; color:white; border-radius:0.375rem; border:none; cursor:pointer; font-weight:600; font-size:0.875rem;">Exportar Lightroom</button>
          <button id="closeSelectionModal" style="padding:0.5rem 1rem; color:#9ca3af; background:none; border:1px solid #374151; border-radius:0.375rem; cursor:pointer;">Fechar</button>
        </div>
      </div>
      <div style="flex:1; overflow-y:auto; overflow-x:hidden; padding:1.5rem;">
        <div id="selectionPhotosGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:0.75rem;">
        </div>
      </div>
    </div>

    <!-- Modal Participantes (Multi-Seleção) -->
    <div id="participantsModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:50; flex-direction:column;">
      <div style="background:#1f2937; border-bottom:1px solid #374151; padding:1rem 1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <div>
            <h3 id="participantsModalTitle" style="font-size:1.125rem; font-weight:bold; color:#f3f4f6;">Participantes</h3>
            <p style="font-size:0.75rem; color:#9ca3af;">Gerencie os alunos/clientes desta sessão</p>
        </div>
        <div style="display:flex; gap:0.75rem;">
          <button id="exportParticipantsBtn" style="padding:0.5rem 1rem; background:#16a34a; color:white; border-radius:0.375rem; border:none; cursor:pointer; font-weight:600; font-size:0.875rem;">Exportar Seleções</button>
          <button id="closeParticipantsModal" style="padding:0.5rem 1rem; color:#9ca3af; background:none; border:1px solid #374151; border-radius:0.375rem; cursor:pointer;">Fechar</button>
        </div>
      </div>
      <div style="flex:1; overflow-y:auto; overflow-x:hidden; padding:1.5rem;">
        <!-- Form Adicionar -->
        <div style="background:#111827; padding:1rem; border-radius:0.5rem; border:1px solid #374151; margin-bottom:1.5rem;">
            <h4 style="color:#f3f4f6; font-size:0.875rem; font-weight:600; margin-bottom:0.75rem;">Adicionar Participante</h4>
            <div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:end;">
                <div style="flex:2; min-width:200px;">
                    <input type="text" id="newPartName" placeholder="Nome completo" style="width:100%; padding:0.5rem; border-radius:0.375rem; border:1px solid #374151; background:#1f2937; color:white;">
                </div>
                <div style="flex:1; min-width:150px;">
                    <input type="email" id="newPartEmail" placeholder="Email (opcional)" style="width:100%; padding:0.5rem; border-radius:0.375rem; border:1px solid #374151; background:#1f2937; color:white;">
                </div>
                <div style="flex:1; min-width:100px;">
                    <input type="number" id="newPartLimit" placeholder="Limite" value="30" style="width:100%; padding:0.5rem; border-radius:0.375rem; border:1px solid #374151; background:#1f2937; color:white;">
                </div>
                <button id="addParticipantBtn" style="background:#2563eb; color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:600;">Adicionar</button>
            </div>
        </div>

        <!-- Lista -->
        <div id="participantsList" style="display:flex; flex-direction:column; gap:0.5rem;">
        </div>
      </div>
    </div>

    <!-- Modal Comentarios -->
    <div id="commentsModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:flex-start; justify-content:center; overflow-y:auto; padding:2rem 1rem;">
      <div style="background:#1f2937; border:1px solid #374151; border-radius:0.75rem; padding:1.5rem; width:28rem; max-width:100%; display:flex; flex-direction:column; gap:1rem; margin:2rem auto;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:1.125rem; font-weight:bold; color:#f3f4f6;">Comentários da Foto</h3>
            <button id="closeCommentsModal" style="color:#9ca3af; background:none; border:none; cursor:pointer; font-size:1.25rem;">&times;</button>
        </div>
        <div id="commentsList" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:0.75rem; min-height:200px; max-height:400px; background:#111827; padding:1rem; border-radius:0.5rem; border:1px solid #374151;">
            <!-- Comentarios aqui -->
        </div>
        <div style="display:flex; gap:0.5rem;">
            <input type="text" id="adminCommentInput" placeholder="Escreva uma resposta..." style="flex:1; padding:0.5rem; border-radius:0.375rem; border:1px solid #374151; background:#111827; color:white;">
            <button id="sendAdminCommentBtn" style="background:#2563eb; color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:600;">Enviar</button>
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

        // Filtro de Periodo (por data de criacao da sessao)
        if (dateFrom || dateTo) {
            const createdAt = new Date(session.createdAt);
            if (dateFrom && createdAt < dateFrom) return false;
            if (dateTo && createdAt > dateTo) return false;
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
        list.innerHTML = '<p style="color:#9ca3af; text-align:center; padding:2rem;">Nenhuma sessão encontrada com os filtros atuais.</p>';
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
                <span style="font-size:0.625rem; padding:0.125rem 0.5rem; border-radius:9999px; color:var(--purple); background:rgba(188, 140, 255, 0.1); border:1px solid rgba(188, 140, 255, 0.3); font-weight:500;">
                  ${mode === 'selection' ? 'Selecao' : (isMulti ? 'Multi-Seleção' : 'Galeria')}
                </span>
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
              ${mode === 'selection' && selectedCount > 0 ? `
              <button onclick="viewSelection('${session._id}')" style="background:var(--purple); color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;">
                Selecao
              </button>` : ''}
              ${isMulti ? `
              <button onclick="viewParticipants('${session._id}')" style="background:var(--purple); color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;">
                Participantes
              </button>` : ''}
              ${!isMulti && session.selectionStatus === 'submitted' ? `
              <button onclick="reopenSelection('${session._id}')" style="background:var(--yellow); color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;">
                Reabrir
              </button>
              <button onclick="deliverSession('${session._id}')" style="background:var(--green); color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;">
                Entregar
              </button>` : ''}
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
        mode, packageLimit, extraPhotoPrice, coverPhoto, clientId
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
    const photos = session.photos || [];

    if (photos.length > 0) {
      const selectedIds = session.selectedPhotos || [];
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
      grid.innerHTML = '<p style="color:#9ca3af; text-align:center; grid-column:1/-1; padding:3rem;">Nenhuma foto. Use o botao Upload acima.</p>';
    }

    modal.style.display = 'flex';
  };

  // Ver selecao do cliente
  window.viewSelection = async (sessionId) => {
    const session = sessionsData.find(s => s._id === sessionId);
    if (!session) return;

    const modal = container.querySelector('#selectionModal');
    const title = container.querySelector('#selectionModalTitle');
    const info = container.querySelector('#selectionModalInfo');
    const grid = container.querySelector('#selectionPhotosGrid');

    const selectedIds = session.selectedPhotos || [];
    const limit = session.packageLimit || 30;
    const extras = Math.max(0, selectedIds.length - limit);
    const extraPrice = session.extraPhotoPrice || 25;

    title.textContent = `Selecao - ${session.name}`;
    let infoText = `${selectedIds.length}/${limit} fotos selecionadas`;
    if (extras > 0) {
      infoText += ` • ${extras} extras (R$ ${(extras * extraPrice).toFixed(2)})`;
    }
    info.textContent = infoText;

    const photos = session.photos || [];
    // Mostrar selecionadas primeiro, depois as demais
    const sorted = [...photos].sort((a, b) => {
      const aSelected = selectedIds.includes(a.id) ? 0 : 1;
      const bSelected = selectedIds.includes(b.id) ? 0 : 1;
      return aSelected - bSelected;
    });

    grid.innerHTML = sorted.map((photo, idx) => {
      const isSelected = selectedIds.includes(photo.id);
      return `
        <div style="position:relative; aspect-ratio:3/2; background:var(--bg-elevated); border-radius:0.5rem; overflow:hidden; ${isSelected ? 'border:3px solid var(--green);' : 'opacity:0.4;'}">
          <img src="${resolveImagePath(photo.url)}" alt="${photo.filename}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;">
          ${isSelected ? '<div style="position:absolute; top:0.25rem; right:0.25rem; background:var(--green); color:white; font-size:0.625rem; padding:0.125rem 0.375rem; border-radius:9999px; font-weight:bold;">&#10003;</div>' : ''}
        </div>
      `;
    }).join('');

    // Exportar
    container.querySelector('#exportSelectionBtn').onclick = () => {
      window.open(`/api/sessions/${sessionId}/export?token=${appState.authToken}`, '_blank');
    };

    modal.style.display = 'flex';
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

    try {
      await apiPut(`/api/sessions/${editingSessionId}`, { name, type, mode, clientEmail, clientId, selectionDeadline, packageLimit, extraPhotoPrice, highResDelivery });

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

  // Fechar modal de selecao
  container.querySelector('#closeSelectionModal').onclick = () => {
    container.querySelector('#selectionModal').style.display = 'none';
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
        commentsList.innerHTML = '<p style="color:#6b7280; text-align:center; font-style:italic;">Nenhum comentário.</p>';
        return;
    }
    commentsList.innerHTML = comments.map(c => {
        const isAdmin = c.author === 'admin';
        const date = new Date(c.createdAt).toLocaleString('pt-BR');
        return `
            <div style="align-self:${isAdmin ? 'flex-end' : 'flex-start'}; max-width:80%; background:${isAdmin ? '#1e3a8a' : '#374151'}; padding:0.5rem 0.75rem; border-radius:0.5rem;">
                <div style="font-size:0.75rem; color:${isAdmin ? '#93c5fd' : '#d1d5db'}; margin-bottom:0.25rem; font-weight:bold;">
                    ${isAdmin ? 'Você' : 'Cliente'} <span style="font-weight:normal; opacity:0.7;">${date}</span>
                </div>
                <div style="color:#f3f4f6; font-size:0.875rem;">${escapeHtml(c.text)}</div>
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
        participantsList.innerHTML = '<p style="color:#9ca3af; text-align:center;">Nenhum participante adicionado.</p>';
        return;
    }

    participantsList.innerHTML = participants.map(p => {
        const status = STATUS_LABELS[p.selectionStatus] || STATUS_LABELS.pending;
        const count = (p.selectedPhotos || []).length;
        return `
        <div style="background:#1f2937; border:1px solid #374151; border-radius:0.5rem; padding:0.75rem; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="color:#f3f4f6; font-weight:600;">${p.name}</div>
                <div style="color:#9ca3af; font-size:0.75rem;">
                    Código: <span style="font-family:monospace; color:#60a5fa; cursor:pointer;" onclick="copySessionCode('${p.accessCode}')" title="Copiar">${p.accessCode}</span>
                    • ${count}/${p.packageLimit} fotos
                    • <span style="color:${status.color};">${status.text}</span>
                </div>
            </div>
            <div style="display:flex; gap:0.5rem;">
                ${p.selectionStatus === 'submitted' ? `
                <button onclick="deliverParticipant('${p._id}')" style="background:#16a34a; color:white; padding:0.25rem 0.5rem; border-radius:0.25rem; border:none; cursor:pointer; font-size:0.75rem;">Entregar</button>
                ` : ''}
                <button onclick="deleteParticipant('${p._id}')" style="background:#7f1d1d; color:#fca5a5; padding:0.25rem 0.5rem; border-radius:0.25rem; border:none; cursor:pointer; font-size:0.75rem;">X</button>
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

    showUploadProgress('sessionUploadProgress', 0);
    const totalFiles = files.length;
    let completedFiles = 0;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('photos', file);

      try {
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (ev) => {
            if (ev.lengthComputable) {
              const filePercent = ev.loaded / ev.total;
              const globalPercent = Math.round(((completedFiles + filePercent) / totalFiles) * 100);
              showUploadProgress('sessionUploadProgress', globalPercent);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              completedFiles++;
              showUploadProgress('sessionUploadProgress', Math.round((completedFiles / totalFiles) * 100));
              resolve();
            } else {
              reject(new Error('Falha no upload'));
            }
          });

          xhr.addEventListener('error', () => reject(new Error('Erro de conexão')));

          xhr.open('POST', `/api/sessions/${currentSessionId}/photos`);
          xhr.setRequestHeader('Authorization', `Bearer ${appState.authToken}`);
          xhr.send(formData);
        });
      } catch (error) {
        window.showToast?.(`Erro ao enviar ${file.name}: ${error.message}`, 'error');
      }
    }

    e.target.value = '';
    await renderSessoes(container);
    viewSessionPhotos(currentSessionId);
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
