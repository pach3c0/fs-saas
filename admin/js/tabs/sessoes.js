/**
 * Tab: Sessoes de Clientes
 */

import { appState } from '../state.js';
import { formatDate, copyToClipboard, resolveImagePath, escapeHtml } from '../utils/helpers.js';
import { uploadImage, showUploadProgress, UploadQueue } from '../utils/upload.js';
import { UploadPanel } from '../components/upload-panel.js';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api.js';
import { setupClientModal, abrirModalClienteNovo } from '../utils/client-modal.js';

const STATUS_LABELS = {
  pending: { text: 'Pendente', class: 'badge-neutral' },
  in_progress: { text: 'Em seleção', class: 'badge-warning' },
  submitted: { text: 'Seleção enviada', class: 'badge-success' },
  delivered: { text: 'Entregue', class: 'badge-blue' },
  expired: { text: 'Expirado', class: 'badge-danger' }
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
      <!-- Filtros -->
      <div style="background:var(--bg-surface); padding:1rem; border-radius:0.5rem; border:1px solid var(--border); display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; gap:1rem; flex-wrap:wrap;">
            <input type="text" id="filterSearch" class="input" placeholder="Buscar cliente..." style="flex:1; min-width:200px;">
            <div class="select-wrap">
              <select id="filterSort" class="select input">
                  <option value="newest">Mais recentes</option>
                  <option value="oldest">Mais antigos</option>
                  <option value="az">Nome A-Z</option>
                  <option value="za">Nome Z-A</option>
              </select>
            </div>
        </div>
        <div style="display:flex; gap:1rem; flex-wrap:wrap; align-items:center;">
            <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;" id="statusFilters">
                <span style="color:var(--text-secondary); font-size:0.875rem;">Status:</span>
                <label style="color:var(--text-secondary); font-size:0.875rem; display:flex; align-items:center; gap:0.4rem; cursor:pointer;"><input type="checkbox" class="check" value="pending" checked> Pendente</label>
                <label style="color:var(--text-secondary); font-size:0.875rem; display:flex; align-items:center; gap:0.4rem; cursor:pointer;"><input type="checkbox" class="check" value="in_progress" checked> Em seleção</label>
                <label style="color:var(--text-secondary); font-size:0.875rem; display:flex; align-items:center; gap:0.4rem; cursor:pointer;"><input type="checkbox" class="check" value="submitted" checked> Enviada</label>
                <label style="color:var(--text-secondary); font-size:0.875rem; display:flex; align-items:center; gap:0.4rem; cursor:pointer;"><input type="checkbox" class="check" value="delivered" checked> Entregue</label>
                <label style="color:var(--text-secondary); font-size:0.875rem; display:flex; align-items:center; gap:0.4rem; cursor:pointer;"><input type="checkbox" class="check" value="expired" checked> Expirado</label>
            </div>
            <div class="select-wrap" style="margin-left:auto;">
              <select id="filterMode" class="select input">
                  <option value="all">Todos os modos</option>
                  <option value="selection">Seleção</option>
                  <option value="multi_selection">Multi-Seleção</option>
                  <option value="gallery">Galeria</option>
              </select>
            </div>
        </div>
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center;">
            <span style="color:var(--text-secondary); font-size:0.875rem;">Período por:</span>
            <div class="select-wrap">
              <select id="filterDateField" class="select input">
                  <option value="createdAt">Criado em</option>
                  <option value="date">Data do Evento</option>
                  <option value="selectionDeadline">Prazo de Seleção</option>
              </select>
            </div>
            <input type="date" id="filterDateFrom" class="input" style="width:auto;">
            <span style="color:var(--text-muted); font-size:0.875rem;">até</span>
            <input type="date" id="filterDateTo" class="input" style="width:auto;">
            <button id="clearDateFilter" class="btn btn-ghost btn-sm">Limpar</button>
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
        <!-- BLOCO CLIENTE: busca dinâmica -->
        <div class="input-group" style="position:relative; margin-bottom:0;">
          <label>Cliente <span style="color:var(--red);">*</span></label>
          <input type="text" id="clientSearchInput" class="input" autocomplete="off" placeholder="Busque ou cadastre o cliente...">
          <input type="hidden" id="sessionClientId" value="">
          <!-- Dropdown de resultados -->
          <div id="clientSearchDropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.375rem; z-index:10; max-height:200px; overflow-y:auto; margin-top:2px;"></div>
          <p id="clientSearchHint" class="input-hint" style="margin-top:0.25rem;"></p>
        </div>

        <!-- Nome da Sessão -->
        <div class="input-group" style="margin-bottom:0;">
          <label>Nome da Sessão <span style="color:var(--red);">*</span></label>
          <input type="text" id="sessionName" class="input" placeholder="Ex: Ensaio Família Silva">
        </div>


        <!-- DATAS -->
        <div style="border:1px solid var(--border); border-radius:0.5rem; padding:0.75rem; display:flex; flex-direction:column; gap:0.75rem;">
          <h4 style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin:0;">📅 Datas</h4>
          <div class="input-group" style="margin-bottom:0;">
            <label>Criado em</label>
            <input type="date" id="sessionCreatedAtDate" class="input">
            <p class="input-hint">Data de abertura da sessão (hoje por padrão).</p>
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Data do Evento</label>
            <input type="date" id="sessionDate" class="input">
            <p class="input-hint">Quando o ensaio/evento aconteceu.</p>
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Prazo de Seleção <span style="color:var(--text-muted);">(opcional)</span></label>
            <input type="datetime-local" id="sessionDeadline" class="input">
            <p class="input-hint">Limite para o cliente escolher as fotos. Deve ser após a data do evento.</p>
          </div>
          <p id="dateValidationMsg" style="display:none; font-size:0.75rem; color:var(--red); font-weight:500;"></p>
        </div>

        <!-- Foto de Capa -->
        <div class="input-group" style="margin-bottom:0;">
          <label>Foto de Capa</label>
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <div id="coverPreview" style="width:80px; height:60px; background:var(--bg-base); border:1px dashed var(--border); border-radius:0.375rem; overflow:hidden; display:flex; align-items:center; justify-content:center;">
              <span style="color:var(--text-muted); font-size:0.625rem;">Sem capa</span>
            </div>
            <label class="btn btn-primary btn-sm" style="margin:0; cursor:pointer; color: white !important;">
              Upload
              <input type="file" accept=".jpg,.jpeg,.png" id="coverInput" style="display:none;">
            </label>
            <div id="coverProgress"></div>
          </div>
          <input type="hidden" id="sessionCoverPhoto" value="">
        </div>

        <!-- Config Galeria -->
        <div style="border-top:1px solid var(--border); padding-top:1rem; display:flex; flex-direction:column; gap:0.75rem;">
          <h4 style="font-size:0.875rem; font-weight:600; color:var(--text-primary); margin:0;">Configuração da Galeria</h4>
          <div class="input-group" style="margin-bottom:0;">
            <label>Modo</label>
            <div class="select-wrap">
              <select id="sessionMode" class="select input">
                <option value="selection">Seleção (cliente escolhe favoritas)</option>
                <option value="gallery">Galeria (cliente só visualiza/baixa)</option>
                <option value="multi_selection">Multi-Seleção (formaturas, shows)</option>
              </select>
            </div>
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Resolução das fotos de seleção</label>
            <div class="select-wrap">
              <select id="sessionResolution" class="select input">
                <option value="960">960px — menor armazenamento (ideal para muitos eventos)</option>
                <option value="1200" selected>1200px — padrão (equilíbrio)</option>
                <option value="1400">1400px — alta qualidade</option>
                <option value="1600">1600px — máxima qualidade (mais armazenamento)</option>
              </select>
            </div>
            <p class="input-hint">Não pode ser alterado após a criação da sessão.</p>
          </div>
          <div id="selectionFields" style="display:flex; gap:0.75rem;">
            <div class="input-group" style="flex:1; margin-bottom:0;">
              <label>Fotos do pacote</label>
              <input type="number" id="sessionLimit" class="input" value="30" min="1">
            </div>
            <div class="input-group" style="flex:1; margin-bottom:0;">
              <label>Preço foto extra (R$)</label>
              <input type="number" id="sessionExtraPrice" class="input" value="25" min="0" step="0.01">
            </div>
          </div>
          <div id="extraConfigFields" style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem;">
            <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
              <input type="checkbox" id="sessionAllowExtraPurchase" checked class="check">
              <span style="color:var(--text-primary); font-size:0.875rem;">Habilitar venda de fotos extras</span>
            </label>
            <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
              <input type="checkbox" id="sessionAllowReopen" checked class="check">
              <span style="color:var(--text-primary); font-size:0.875rem;">Permitir pedido de reabertura</span>
            </label>
          </div>
          <p id="multiSelectionHint" style="display:none; font-size:0.75rem; color:var(--yellow); margin-top:0.5rem;">No modo Multi-Seleção, você adicionará os participantes após criar a sessão.</p>
        </div>

        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
          <button id="cancelNewSession" class="btn">Cancelar</button>
          <button id="confirmNewSession" class="btn btn-success">Criar Sessão</button>
        </div>
      </div>
    </div>

    <!-- Modal Ver Fotos (Dual Grid) -->
    <div id="sessionPhotosModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:50; flex-direction:column;">
      <div style="background:var(--bg-surface); border-bottom:1px solid var(--border); padding:1rem 1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <h3 id="photosModalTitle" style="font-size:1.125rem; font-weight:bold; color:var(--text-primary);">Fotos da Sessao</h3>
        <div style="display:flex; gap:0.75rem; align-items:center;">
          <div id="sessionUploadProgress" style="min-width:150px;"></div>
          
          <!-- Upload Buttons -->
          <div id="uploadButtonGroup" style="display:flex; gap:0.5rem; align-items:center;">
            <label id="mainUploadBtn" style="padding:0.5rem 1rem; background:var(--accent); color:white; border-radius:0.375rem; cursor:pointer; font-weight:600; font-size:0.875rem; border:none; display:flex; align-items:center; gap:0.5rem; transition: background 0.2s;"></label>
            <!-- secondaryUploadBtn: só aparece na aba Entrega Final (injetado via switchPhotoTab) -->
            <label id="secondaryUploadBtn" style="display:none; padding:0.5rem 1rem; background:var(--purple); color:white; border-radius:0.375rem; cursor:pointer; font-weight:600; font-size:0.875rem; border:none; align-items:center; gap:0.5rem; transition: background 0.2s;"></label>
          </div>

          <!-- Hidden Inputs -->
          <input type="file" id="sessionUploadInput" accept="image/*" multiple style="display:none;">
          <input type="file" id="sessionEditedInput" accept="image/*" multiple style="display:none;">
          
          <button id="closePhotosModal" class="btn">Fechar</button>
        </div>
      </div>
      
      <!-- Abas de Navegacao -->
      <div style="padding:0 1.5rem; display:flex; gap:1.5rem; border-bottom:1px solid var(--border); background:var(--bg-surface); flex-shrink:0;">
          <button id="tabGeralBtn" style="padding:1rem 0; background:none; border:none; border-bottom:2px solid var(--accent); color:var(--text-primary); font-weight:600; cursor:pointer; font-size:0.875rem; display:flex; align-items:center; gap:0.5rem;" onclick="window.switchPhotoTab('geral')">
              🖼️ Galeria Geral
          </button>
          <button id="tabEntregaBtn" style="padding:1rem 0; background:none; border:none; border-bottom:2px solid transparent; color:var(--text-secondary); font-weight:600; cursor:pointer; font-size:0.875rem; display:flex; align-items:center; gap:0.5rem;" onclick="window.switchPhotoTab('entrega')">
              🚀 Entrega Final (<span id="deliveryCountBadge">0</span>)
          </button>
      </div>

      <div style="flex:1; display:flex; flex-direction:column; min-height:0; padding:1.5rem; overflow:hidden; background:var(--bg-base);">
          <!-- Seção 1: Todas as Fotos -->
          <div id="tabGeral" style="flex:1; display:flex; flex-direction:column; min-height:0;">
              <!-- Barra de Ações em Massa -->
              <div id="bulkActionsBar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; background:var(--bg-elevated); padding:0.5rem 1rem; border-radius:0.5rem; border:1px solid var(--border); display:none;">
                  <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.875rem; color:var(--text-primary);">
                      <input type="checkbox" id="selectAllPhotos" class="check">
                      <span>Selecionar Tudo</span>
                  </label>
                  <div style="display:flex; gap:0.75rem; align-items:center;">
                      <span id="selectedPhotosCount" style="font-size:0.875rem; color:var(--text-secondary);">0 selecionadas</span>
                      <button id="bulkDeleteBtn" class="btn btn-danger btn-sm" style="background:var(--red); color:white; border:none;">Deletar</button>
                  </div>
              </div>
              <div id="sessionPhotosGrid" style="flex:1; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); grid-auto-rows: max-content; gap:1rem; align-content:start;"></div>
          </div>
          
          <!-- Seção 2: Fotos Finais (Entrega) -->
          <div id="tabEntrega" style="flex:1; display:flex; flex-direction:column; min-height:0; display:none;">
              <div style="display:flex; justify-content:flex-end; align-items:center; margin-bottom:1rem;">
                  <button id="exportSelectionBtn" style="background:var(--purple); color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.875rem; font-weight:600; display:flex; align-items:center; gap:0.5rem;" title="Exportar lista de seleção para o Lightroom">
                    📋 Exportar Lightroom
                  </button>
              </div>
              <div id="selectedPhotosGrid" style="flex:1; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); grid-auto-rows: max-content; gap:1rem; align-content:start;"></div>
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
          <button id="cancelValidationBtn" class="btn">Cancelar</button>
          <button id="confirmValidationBtn" class="btn btn-primary"></button>
        </div>
      </div>
    </div>

    <!-- Modal Editar Sessao -->
    <div id="editSessionModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:flex-start; justify-content:center; overflow-y:auto; padding:2rem 1rem;">
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.75rem; padding:1.5rem; width:28rem; max-width:100%; display:flex; flex-direction:column; gap:1rem; margin:2rem auto;">
        <h3 style="font-size:1.125rem; font-weight:bold; color:var(--text-primary);">Editar Sessao</h3>
        <div class="input-group" style="margin-bottom:0;">
          <label>Nome da Sessão</label>
          <input type="text" id="editSessionName" class="input">
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Cliente Vinculado</label>
          <div class="select-wrap">
            <select id="editClientId" class="select input">
              <option value="">-- Nenhum cliente vinculado --</option>
            </select>
          </div>
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>E-mail do Cliente <span style="color:var(--text-muted);">(opcional — para notificacoes)</span></label>
          <input type="email" id="editClientEmail" class="input" placeholder="email@cliente.com">
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Prazo Seleção</label>
          <input type="datetime-local" id="editSessionDeadline" class="input">
        </div>
        <div class="input-group" style="margin-bottom:0;">
          <label>Modo</label>
          <div class="select-wrap">
            <select id="editMode" class="select input">
              <option value="selection">Selecao (cliente escolhe favoritas)</option>
              <option value="gallery">Galeria (cliente so visualiza/baixa)</option>
            </select>
          </div>
        </div>
        <div id="editSelectionFields" style="display:flex; gap:0.75rem;">
          <div class="input-group" style="flex:1; margin-bottom:0;">
            <label>Fotos do pacote</label>
            <input type="number" id="editLimit" min="1" class="input">
          </div>
          <div class="input-group" style="flex:1; margin-bottom:0;">
            <label>Preco foto extra (R$)</label>
            <input type="number" id="editExtraPrice" min="0" step="0.01" class="input">
          </div>
        </div>
        <p class="input-hint">Cada cliente pode ter valores diferentes de pacote e preco de extras.</p>
        <div style="border-top:1px solid var(--border); padding-top:0.75rem; display:flex; flex-direction:column; gap:0.75rem;">
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="checkbox" id="editCommentsEnabled" class="check">
            <span style="color:var(--text-primary); font-size:0.875rem; font-weight:500;">Comentários por foto habilitados</span>
          </label>
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="checkbox" id="editAllowExtraPurchase" class="check">
            <span style="color:var(--text-primary); font-size:0.875rem; font-weight:500;">Venda de fotos extras habilitada</span>
          </label>
          <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
            <input type="checkbox" id="editAllowReopen" class="check">
            <span style="color:var(--text-primary); font-size:0.875rem; font-weight:500;">Reabertura de sessão permitida</span>
          </label>
        </div>
        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
          <button id="cancelEditSession" class="btn">Cancelar</button>
          <button id="confirmEditSession" class="btn btn-primary">Salvar</button>
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
          <button id="exportSelectionBtn" class="btn btn-success">Exportar Lightroom</button>
          <button id="closeSelectionModal" class="btn">Fechar</button>
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
          <button id="exportParticipantsBtn" class="btn btn-success">Exportar Seleções</button>
          <button id="closeParticipantsModal" class="btn">Fechar</button>
        </div>
      </div>
      <div style="flex:1; overflow-y:auto; overflow-x:hidden; padding:1.5rem;">
        <!-- Form Adicionar -->
        <div style="background:var(--bg-base); padding:1rem; border-radius:0.5rem; border:1px solid var(--border); margin-bottom:1.5rem;">
            <h4 style="color:var(--text-primary); font-size:0.875rem; font-weight:600; margin-bottom:0.75rem;">Adicionar Participante</h4>
            <div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:end;">
                <div style="flex:2; min-width:200px;">
                    <input type="text" id="newPartName" class="input" placeholder="Nome completo">
                </div>
                <div style="flex:1; min-width:150px;">
                    <input type="email" id="newPartEmail" class="input" placeholder="Email (opcional)">
                </div>
                <div style="flex:1; min-width:100px;">
                    <input type="number" id="newPartLimit" class="input" placeholder="Limite" value="30">
                </div>
                <button id="addParticipantBtn" class="btn btn-primary">Adicionar</button>
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
            <input type="text" id="adminCommentInput" class="input" placeholder="Escreva uma resposta..." style="flex:1;">
            <button id="sendAdminCommentBtn" class="btn btn-primary">Enviar</button>
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
      const deliveredPhotosCount = (session.photos || []).filter(p => p.urlOriginal).length;
      const isSubmitted = session.selectionStatus === 'submitted';

      // BG e Borda super leves para identificar o tipo visualmente sem usar badges
      let cardBg = 'var(--bg-surface)';
      let cardBorder = 'var(--border)';

      if (mode === 'selection') {
        cardBg = 'rgba(63, 185, 80, 0.04)'; // Verde super leve
        cardBorder = 'rgba(63, 185, 80, 0.15)';
      } else if (mode === 'multi_selection') {
        cardBg = 'rgba(255, 166, 87, 0.04)'; // Laranja super leve
        cardBorder = 'rgba(255, 166, 87, 0.15)';
      } else if (mode === 'gallery') {
        cardBg = 'rgba(188, 140, 255, 0.04)'; // Roxo super leve
        cardBorder = 'rgba(188, 140, 255, 0.15)';
      }

      return `
        <div style="border:1px solid ${cardBorder}; border-radius:0.75rem; padding:1rem; background:${cardBg};">
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
                ${session.clientId ? `<span style="color:var(--green); font-size:0.875rem; display:flex; align-items:center; gap:0.25rem;" title="Cliente vinculado"><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>${session.clientId.name}</span>` : ''}
                <span class="badge ${status.class}">
                  ${status.text}
                </span>
                ${session.extraRequest?.status === 'pending' ? `<span class="badge badge-warning">📸 ${session.extraRequest.photos?.length || 0} extra(s)</span>` : ''}
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
              <button onclick="viewSessionPhotos(\'${session._id}\')" class="btn btn-sm btn-primary">
                Fotos
              </button>
              ${isMulti ? `
              <button onclick="viewParticipants(\'${session._id}\')" class="btn btn-sm" style="background:var(--purple); border-color:var(--purple); color:white;">
                Participantes
              </button>` : ''}
              ${!isMulti && isSubmitted ? `
              <button onclick="reopenSelection(\'${session._id}\')" class="btn btn-sm" style="background:var(--yellow); border-color:var(--yellow); color:white;">
                Reabrir
              </button>` : ''}
              <button onclick="deliverSession('${session._id}')" 
                style="background:${isSubmitted && deliveredPhotosCount >= selectedCount && selectedCount > 0 ? 'var(--green)' : 'rgba(255,255,255,0.05)'}; 
                       color:${isSubmitted && deliveredPhotosCount >= selectedCount && selectedCount > 0 ? 'white' : 'var(--text-muted)'}; 
                       padding:0.375rem 0.75rem; border-radius:0.375rem; 
                       border:${isSubmitted && deliveredPhotosCount >= selectedCount && selectedCount > 0 ? 'none' : '1px solid var(--border)'}; 
                       cursor:${isSubmitted && deliveredPhotosCount >= selectedCount && selectedCount > 0 ? 'pointer' : 'not-allowed'}; font-size:0.75rem; font-weight:500;" 
                ${isSubmitted && deliveredPhotosCount >= selectedCount && selectedCount > 0 ? '' : 'disabled'}
                title="${!isSubmitted ? 'Aguardando cliente finalizar seleção' : (selectedCount === 0 ? 'Nenhuma foto selecionada' : (deliveredPhotosCount < selectedCount ? `Faltam fotos editadas (${deliveredPhotosCount}/${selectedCount})` : 'Entregar sessão'))}">
                Entregar
              </button>
              ${session.extraRequest?.status === 'pending' ? `
              <button onclick="acceptExtraRequest(\'${session._id}\')" class="btn btn-sm btn-success" title="Aceitar fotos extras">
                ✅ Aceitar extras
              </button>
              <button onclick="rejectExtraRequest(\'${session._id}\')" class="btn btn-sm btn-danger" title="Recusar fotos extras">
                ✗ Recusar
              </button>` : ''}
              <button onclick="sendSessionCode('${session._id}', '${session.accessCode}')" 
                style="background:${(session.photos?.length || 0) >= limit ? 'var(--bg-hover)' : 'rgba(255,255,255,0.05)'}; 
                       color:${(session.photos?.length || 0) >= limit ? 'var(--text-secondary)' : 'var(--text-muted)'}; 
                       padding:0.375rem 0.75rem; border-radius:0.375rem; border:1px solid var(--border); 
                       cursor:${(session.photos?.length || 0) >= limit ? 'pointer' : 'not-allowed'}; font-size:0.75rem;" 
                ${(session.photos?.length || 0) >= limit ? '' : 'disabled'}
                title="${(session.photos?.length || 0) >= limit ? 'Enviar código por e-mail ao cliente' : `Suba pelo menos ${limit} fotos para habilitar o envio`}">
                📧 Enviar
              </button>
              <button onclick="editSession(\'${session._id}\')" class="btn btn-sm" style="background:var(--orange); border-color:var(--orange); color:white;">
                Config
              </button>
              <button onclick="deleteSession(\'${session._id}\')" class="btn btn-sm btn-danger" title="Deletar">
                &times;
              </button>
            </div>
          </div>
          <div style="font-size:0.75rem; background:var(--bg-base); border-radius:0.25rem; padding:0.375rem 0.75rem; font-family:monospace; color:var(--accent); margin-top:0.5rem; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
            <span>Codigo: ${session.accessCode}</span>
            <button onclick="copySessionCode('${session.accessCode}', this)" style="background:var(--bg-hover); color:var(--text-secondary); padding:0.2rem 0.5rem; border-radius:0.25rem; border:1px solid var(--border); cursor:pointer; font-size:0.625rem; font-family:sans-serif; transition: all 0.2s;" title="Copiar codigo">
                Copiar
            </button>
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
      criar.onclick = () => {
        clientSearchDropdown.style.display = 'none';
        
        // Inicializar eventos do modal (salvar/cancelar)
        setupClientModal();

        abrirModalClienteNovo(query.trim(), (newClient) => {
          clientSearchInput.value = newClient.name;
          container.querySelector('#sessionClientId').value = newClient._id;
          if (!container.querySelector('#sessionName').value) {
            container.querySelector('#sessionName').value = newClient.name;
          }
          clientSearchHint.textContent = `✓ Novo cliente cadastrado!`;
          clientSearchHint.style.color = 'var(--green)';
        });
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
    const eventVal = container.querySelector('#sessionDate').value;
    const deadlineVal = container.querySelector('#sessionDeadline').value;
    const msg = container.querySelector('#dateValidationMsg');

    if (createdVal && eventVal && eventVal < createdVal) {
      msg.textContent = '⚠ A Data do Evento não pode ser anterior ao "Criado em".';
      msg.style.display = 'block';
      return false;
    }
    if (eventVal && deadlineVal) {
      const eventDate = new Date(eventVal + 'T00:00:00');
      const deadline = new Date(deadlineVal);
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

    const allowExtraPurchase = container.querySelector('#sessionAllowExtraPurchase').checked;
    const allowReopen = container.querySelector('#sessionAllowReopen').checked;

    if (!name) { window.showToast?.('Nome da sessão é obrigatório', 'warning'); return; }
    if (!clientId) { window.showToast?.('Selecione ou cadastre um cliente para continuar', 'warning'); return; }

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
        name, clientEmail, date, selectionDeadline,
        mode, packageLimit, extraPhotoPrice, photoResolution, coverPhoto, clientId,
        allowExtraPurchasePostSubmit: allowExtraPurchase,
        allowReopen: allowReopen
      });

      newSessionModal.style.display = 'none';
      window.showToast?.(`Sessão criada! Código: ${result.accessCode || result.session?.accessCode}`, 'success', 6000);
      await renderSessoes(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  // Copiar codigo com feedback visual
  window.copySessionCode = (code, btn) => {
    copyToClipboard(code);
    if (btn) {
      const originalText = btn.textContent;
      const originalBg = btn.style.background;
      btn.textContent = 'Copiado!';
      btn.style.background = 'var(--green)';
      btn.style.color = 'white';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = originalBg;
        btn.style.color = 'var(--text-secondary)';
      }, 2000);
    }
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

    const modeLabels = { selection: 'Seleção', gallery: 'Galeria', multi_selection: 'Multi-Seleção' };
    const modeName = modeLabels[session.mode] || 'Galeria';
    title.textContent = `Fotos - ${session.name} (${modeName})`;

    // Lógica dos Botões de Upload (Independentes)
    const mainBtn = container.querySelector('#mainUploadBtn');
    const secondaryBtn = container.querySelector('#secondaryUploadBtn');

    mainBtn.innerHTML = `<span>+</span> Upload`;
    mainBtn.htmlFor = 'sessionUploadInput';
    mainBtn.style.background = 'var(--accent)';
    mainBtn.title = "Adicionar novas fotos à galeria";

    secondaryBtn.innerHTML = `<span>✏️</span> Subir Editadas`;
    secondaryBtn.htmlFor = 'sessionEditedInput';
    secondaryBtn.style.background = 'var(--purple)';
    secondaryBtn.title = "Upload das fotos editadas — substitui por nome de arquivo";
    secondaryBtn.style.display = 'none';

    const photos = session.photos || [];
    const selectedIds = session.selectedPhotos || [];

    // Reset barra de ações em massa
    const bulkBar = container.querySelector('#bulkActionsBar');
    const selectAllCheck = container.querySelector('#selectAllPhotos');
    const bulkDeleteBtn = container.querySelector('#bulkDeleteBtn');
    const countLabel = container.querySelector('#selectedPhotosCount');
    
    if (bulkBar) {
      bulkBar.style.display = photos.length > 0 ? 'flex' : 'none';
      selectAllCheck.checked = false;
      countLabel.textContent = '0 selecionadas';
      bulkDeleteBtn.style.display = 'none';
    }

    if (photos.length > 0) {
      grid.innerHTML = photos.map((photo, idx) => {
        const isSelected = selectedIds.includes(photo.id);
        const hasComments = photo.comments && photo.comments.length > 0;
        const isHidden = photo.hidden === true;
        return `
        <div style="position:relative; aspect-ratio:3/2; background:var(--bg-elevated); border-radius:0.5rem; overflow:hidden; ${isSelected ? 'border:3px solid var(--green);' : ''} ${isHidden ? 'opacity:0.6;' : ''}">
          <img src="${resolveImagePath(photo.url)}" alt="Foto ${idx + 1}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; ${isHidden ? 'filter:grayscale(1);' : ''}">
          
          <!-- Checkbox para seleção em massa -->
          <input type="checkbox" class="photo-bulk-check" data-id="${photo.id}" style="position:absolute; top:0.5rem; left:0.5rem; width:1.25rem; height:1.25rem; cursor:pointer; z-index:10;">

          ${isHidden ? '<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.3); color:white; font-weight:600; font-size:0.75rem; pointer-events:none; z-index:2;">OCULTA</div>' : ''}
          ${isSelected ? '<div style="position:absolute; top:0.25rem; right:0.25rem; background:var(--green); color:white; font-size:0.625rem; padding:0.125rem 0.375rem; border-radius:0.25rem; z-index:2;">Selecionada</div>' : ''}
          ${hasComments ? '<div style="position:absolute; top:2rem; right:0.25rem; background:var(--accent); color:white; font-size:0.625rem; padding:0.125rem 0.375rem; border-radius:0.25rem; z-index:2;" title="Tem comentários">💬</div>' : ''}
          
          <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); opacity:0; transition:opacity 0.2s; display:flex; align-items:center; justify-content:center; z-index:5;"
            onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0'">
            
            <button onclick="window.togglePhotoHidden('${sessionId}', '${photo.id}')" style="background:${isHidden ? 'var(--red)' : 'var(--accent)'}; color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer; margin-right:0.5rem;" title="${isHidden ? 'Mostrar' : 'Ocultar'}">
              ${isHidden ? '👁️‍🗨️' : '👁️'}
            </button>

            <button onclick="openComments('${sessionId}', '${photo.id}')" style="background:var(--accent); color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer; margin-right:0.5rem;" title="Comentários">
              💬
            </button>
            <button onclick="deleteSessionPhoto('${sessionId}', '${photo.id}')" style="background:var(--red); color:white; padding:0.5rem; border-radius:9999px; border:none; cursor:pointer;" title="Remover">
              &times;
            </button>
          </div>
          <div style="position:absolute; bottom:0.25rem; left:0.25rem; background:rgba(0,0,0,0.7); color:white; font-size:0.625rem; padding:0.125rem 0.375rem; border-radius:0.25rem; z-index:2;">${idx + 1}</div>
        </div>
      `}).join('');

      // Lógica de seleção em massa
      const checkboxes = grid.querySelectorAll('.photo-bulk-check');
      const updateBulkUI = () => {
        const checked = Array.from(checkboxes).filter(cb => cb.checked);
        countLabel.textContent = `${checked.length} selecionadas`;
        bulkDeleteBtn.style.display = checked.length > 0 ? 'block' : 'none';
        selectAllCheck.checked = checked.length === checkboxes.length && checkboxes.length > 0;
      };

      checkboxes.forEach(cb => cb.onchange = updateBulkUI);
      
      selectAllCheck.onchange = (e) => {
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        updateBulkUI();
      };

      bulkDeleteBtn.onclick = async () => {
        const ids = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.dataset.id);
        if (!ids.length) return;

        const ok = await window.showConfirm?.(`Deletar permanentemente as ${ids.length} fotos selecionadas?`);
        if (!ok) return;

        try {
          bulkDeleteBtn.disabled = true;
          bulkDeleteBtn.textContent = 'Deletando...';
          await apiDelete(`/api/sessions/${sessionId}/photos/bulk`, { photoIds: ids });
          window.showToast?.('Fotos deletadas!', 'success');
          await renderSessoes(container);
          viewSessionPhotos(sessionId);
          window.loadSidebarStorage?.();
        } catch (error) {
          window.showToast?.('Erro: ' + error.message, 'error');
        } finally {
          bulkDeleteBtn.disabled = false;
          bulkDeleteBtn.textContent = 'Deletar';
        }
      };

    } else {
      grid.innerHTML = '<p style="color:var(--text-secondary); text-align:center; grid-column:1/-1; padding:3rem;">Nenhuma foto na sessão. Use o Upload acima.</p>';
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
          <p>Nenhuma foto editada enviada.</p>
          <p style="font-size:0.75rem; margin-top:0.5rem;">Use o botão <b>Subir Editadas</b> para enviar as fotos de entrega.</p>
        </div>`;
    }

    // Exportar
    const exportBtn = container.querySelector('#exportSelectionBtn');
    exportBtn.style.display = selectedIds.length > 0 ? 'flex' : 'none';
    exportBtn.onclick = () => {
      window.open(`/api/sessions/${sessionId}/export?token=${appState.authToken}`, '_blank');
    };

    // Reseta para a aba Geral ao abrir
    window.switchPhotoTab('geral');

    modal.style.display = 'flex';
  };

  // Funcao para trocar abas de fotos
  window.switchPhotoTab = (tab) => {
    const tabGeral = container.querySelector('#tabGeral');
    const tabEntrega = container.querySelector('#tabEntrega');
    const btnGeral = container.querySelector('#tabGeralBtn');
    const btnEntrega = container.querySelector('#tabEntregaBtn');

    const mainBtn = container.querySelector('#mainUploadBtn');
    const secondaryBtn = container.querySelector('#secondaryUploadBtn');

    const session = sessionsData.find(s => s._id === currentSessionId);
    if (!session) return;

    if (tab === 'geral') {
      tabGeral.style.display = 'flex';
      tabEntrega.style.display = 'none';
      btnGeral.style.borderBottomColor = 'var(--accent)';
      btnGeral.style.color = 'var(--text-primary)';
      btnEntrega.style.borderBottomColor = 'transparent';
      btnEntrega.style.color = 'var(--text-secondary)';

      mainBtn.style.display = 'flex';
      secondaryBtn.style.display = 'none'; // Escondido na Galeria Geral conforme pedido
    } else {
      tabGeral.style.display = 'none';
      tabEntrega.style.display = 'flex';
      btnGeral.style.borderBottomColor = 'transparent';
      btnGeral.style.color = 'var(--text-secondary)';
      btnEntrega.style.borderBottomColor = 'var(--accent)';
      btnEntrega.style.color = 'var(--text-primary)';

      // Aba Entrega Final: Esconde upload normal
      mainBtn.style.display = 'none';

      const selectedCount = (session.selectedPhotos || []).length;
      const limit = session.packageLimit || 30;
      const isSubmitted = session.selectionStatus === 'submitted' || session.selectionStatus === 'delivered';
      const meetsLimit = selectedCount >= limit;

      // Sempre mostra o botão de editadas na Entrega Final, mas bloqueia se não estiver pronto
      secondaryBtn.style.display = 'flex';

      if (isSubmitted && meetsLimit) {
        secondaryBtn.style.opacity = '1';
        secondaryBtn.style.pointerEvents = 'auto';
        secondaryBtn.style.cursor = 'pointer';
        secondaryBtn.title = "Subir fotos editadas";
      } else {
        secondaryBtn.style.opacity = '0.5';
        secondaryBtn.style.pointerEvents = 'none';
        secondaryBtn.style.cursor = 'not-allowed';
        secondaryBtn.title = "Aguardando cliente finalizar seleção";

        // Mostrar aviso se não houver fotos originais (não entregues ainda)
        const selectedGrid = container.querySelector('#selectedPhotosGrid');
        const deliveredCount = (session.photos?.filter(p => p.urlOriginal) || []).length;

        if (deliveredCount === 0) {
          selectedGrid.innerHTML = `
                      <div style="background:rgba(255,166,87,0.05); border:1px solid rgba(255,166,87,0.15); color:var(--orange); padding:2.5rem; border-radius:0.75rem; text-align:center; grid-column:1/-1; font-size:0.875rem; display:flex; flex-direction:column; align-items:center; gap:0.75rem; margin-top:2rem;">
                          <span style="font-size:1.5rem;">⚠️ Aguardando Finalização</span>
                          <p style="color:var(--text-secondary); max-width:400px; margin:0 auto;">Aguardando o cliente finalizar a seleção das imagens (${selectedCount}/${limit}) para poder habilitar o envio das fotos editadas.</p>
                      </div>
                  `;
        }
      }
    }
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
    editModeSelect.disabled = session.selectionStatus === 'submitted' || session.selectionStatus === 'delivered';
    container.querySelector('#editLimit').value = session.packageLimit || 30;
    container.querySelector('#editExtraPrice').value = session.extraPhotoPrice || 25;
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
    const mode = editModeSelect.value;
    const clientEmail = container.querySelector('#editClientEmail').value.trim();
    const clientId = container.querySelector('#editClientId').value || null;
    const selectionDeadline = container.querySelector('#editSessionDeadline').value || null;
    const packageLimit = parseInt(container.querySelector('#editLimit').value) || 30;
    const extraPhotoPrice = parseFloat(container.querySelector('#editExtraPrice').value) || 25;
    const commentsEnabled = container.querySelector('#editCommentsEnabled').checked;
    const allowExtraPurchasePostSubmit = container.querySelector('#editAllowExtraPurchase').checked;
    const allowReopen = container.querySelector('#editAllowReopen').checked;

    try {
      await apiPut(`/api/sessions/${editingSessionId}`, { 
        name, mode, clientEmail, clientId, selectionDeadline, packageLimit, 
        extraPhotoPrice, commentsEnabled, allowExtraPurchasePostSubmit, allowReopen 
      });

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
                <button onclick="deliverParticipant(\'${p._id}\')" class="btn btn-sm btn-success">Entregar</button>
                ` : ''}
                <button onclick="deleteParticipant(\'${p._id}\')" class="btn btn-sm btn-danger">X</button>
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
          window.loadSidebarStorage?.();
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
              // Forçar aba Entrega Final após subir editadas
              window.switchPhotoTab('entrega');
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
      window.loadSidebarStorage?.(); // Atualizar armazenamento na sidebar
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
      window.loadSidebarStorage?.(); // Atualizar armazenamento na sidebar
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  // Ocultar/Mostrar foto
  window.togglePhotoHidden = async (sessionId, photoId) => {
    const session = sessionsData.find(s => s._id === sessionId);
    if (!session) return;

    // Regra de negócio: no modo Seleção, se qtd fotos == pacote, não pode ocultar
    const photo = (session.photos || []).find(p => p.id === photoId);
    const isCurrentlyVisible = !photo?.hidden;
    if (isCurrentlyVisible && session.mode === 'selection') {
      const totalVisible = (session.photos || []).filter(p => !p.hidden).length;
      const pacote = session.packageLimit || 30;
      if (totalVisible <= pacote) {
        window.showToast?.(
          `Não é possível ocultar: você tem ${totalVisible} foto(s) visíveis e o pacote exige ${pacote}. ` +
          `Reduza o pacote em Configurações antes de ocultar.`,
          'warning',
          6000
        );
        return;
      }
    }

    try {
      await apiPut(`/api/sessions/${sessionId}/photos/${photoId}/toggle-hidden`);
      await renderSessoes(container);
      viewSessionPhotos(sessionId);
    } catch (error) {
      window.showToast?.(error.message, 'error');
    }
  };
}
