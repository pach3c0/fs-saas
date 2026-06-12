import { state } from './state.js';
import { loadSessions, setupListFilters } from './list.js';
import { setupModalForm } from './modal-form.js';
import { setupComments } from './comments.js';
import { setupParticipantes } from './modal-participantes.js';
import { setupUpload } from './upload.js';
import { setupActions } from './actions.js';
// Wizard de sessões (Onda 2): registra window.openSessionWizard como side-effect do import.
import './wizard/index.js';

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
            <div class="select-wrap">
              <select id="filterEventType" class="select input">
                  <option value="all">Todos os tipos</option>
                  <option value="aniversario">Aniversário</option>
                  <option value="casamento">Casamento</option>
                  <option value="formatura">Formatura</option>
                  <option value="corporativo">Corporativo</option>
                  <option value="show">Show</option>
                  <option value="ensaio">Ensaio</option>
                  <option value="gestante">Gestante</option>
                  <option value="newborn">Newborn</option>
                  <option value="debutante">Debutante</option>
                  <option value="batizado">Batizado</option>
                  <option value="outro">Outro</option>
              </select>
            </div>
            <div class="select-wrap" style="margin-left:auto;">
              <select id="filterMode" class="select input">
                  <option value="all">Todos os modos</option>
                  <option value="selection">Seleção</option>
                  <option value="multi_selection">Multi-Seleção</option>
                  <option value="gallery">Galeria</option>
                  <!-- v2: Multi-Imediata oculta até implementação de face search -->
                  <!-- <option value="multi_instant">Multi-Imediata</option> -->
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

        <!-- PRIMEIRO: Modo da Sessão -->
        <div class="input-group" style="margin-bottom:0;">
          <label>Modo da Sessão <span style="color:var(--red);">*</span></label>
          <div class="select-wrap">
            <select id="sessionMode" class="select input">
              <option value="">Escolher modo de sessão</option>
              <option value="selection">Seleção — cliente escolhe suas favoritas</option>
              <option value="gallery">Galeria — cliente visualiza e baixa</option>
              <option value="multi_selection">Multi-seleção — formaturas, shows, eventos</option>
                  <!-- v2: Multi-Imediata oculta até implementação de face search -->
                  <!-- <option value="multi_instant">Multi-Imediata — cliente escolhe e baixa na hora (Real-Time)</option> -->
            </select>
          </div>
        </div>

        <!-- Wrapper para campos que serão desabilitados até escolher o modo -->
        <div id="sessionFieldsWrapper" style="display:flex; flex-direction:column; gap:1rem; opacity:0.4; pointer-events:none; transition:opacity 0.2s;">

          <!-- Campo Cliente (oculto em multi_selection) -->
          <div id="clientRowWrapper" class="input-group" style="position:relative; margin-bottom:0;">
            <label>Cliente <span style="color:var(--red);">*</span></label>
            <input type="text" id="clientSearchInput" class="input" disabled autocomplete="off" placeholder="Busque ou cadastre o cliente...">
            <input type="hidden" id="sessionClientId" value="">
            <div id="clientSearchDropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.375rem; z-index:10; max-height:200px; overflow-y:auto; margin-top:2px;"></div>
            <p id="clientSearchHint" class="input-hint" style="margin-top:0.25rem;"></p>
          </div>

          <!-- Nome da Sessão -->
          <div class="input-group" style="margin-bottom:0;">
            <label>Nome da Sessão <span style="color:var(--red);">*</span></label>
            <input type="text" id="sessionName" class="input" disabled placeholder="Ex: Ensaio Família Silva ou Formatura Direito 2026">
          </div>

          <!-- Datas -->
          <div style="border:1px solid var(--border); border-radius:0.5rem; padding:0.75rem; display:flex; flex-direction:column; gap:0.75rem;">
            <h4 style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin:0;">📅 Datas</h4>
            <div class="input-group" style="margin-bottom:0;">
              <label>Criado em</label>
              <input type="date" id="sessionCreatedAtDate" class="input" disabled>
              <p class="input-hint">Data de abertura da sessão (hoje por padrão).</p>
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Data do Evento</label>
              <input type="date" id="sessionDate" class="input" disabled>
              <p class="input-hint">Quando o ensaio/evento aconteceu.</p>
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label id="deadlineLabel">Prazo de Seleção <span style="color:var(--text-muted);">(opcional)</span></label>
              <input type="datetime-local" id="sessionDeadline" class="input" disabled>
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
                <input type="file" accept=".jpg,.jpeg,.png" id="coverInput" style="display:none;" disabled>
              </label>
              <div id="coverProgress"></div>
            </div>
            <input type="hidden" id="sessionCoverPhoto" value="">
          </div>

          <!-- Config avançada movida para o painel direito do wizard (visível após criar).
               Mantida no DOM (oculta) só para alimentar os valores-padrão no payload de criação. -->
          <div id="advancedConfigHidden" style="display:none;">
          <!-- Configuração da Galeria -->
          <div style="border-top:1px solid var(--border); padding-top:1rem; display:flex; flex-direction:column; gap:0.75rem;">
            <h4 style="font-size:0.875rem; font-weight:600; color:var(--text-primary); margin:0;">Configuração da Galeria</h4>
            <div class="input-group" style="margin-bottom:0;">
              <label>Resolução do preview (grid de visualização)</label>
              <div class="select-wrap">
                <select id="sessionResolution" class="select input" disabled>
                  <option value="960">960px — menor armazenamento (ideal para muitos eventos)</option>
                  <option value="1200" selected>1200px — padrão (equilíbrio)</option>
                  <option value="1400">1400px — alta qualidade</option>
                  <option value="1600">1600px — máxima qualidade (mais armazenamento)</option>
                </select>
              </div>
              <p class="input-hint">Afeta apenas a miniatura exibida no grid. A entrega usa a resolução original do arquivo subido. Não pode ser alterado após a criação.</p>
            </div>
            <div id="selectionFields" style="display:flex; gap:0.75rem;">
              <div class="input-group" style="flex:1; margin-bottom:0;">
                <label>Fotos do pacote</label>
                <input type="number" id="sessionLimit" class="input" value="30" min="1" disabled>
              </div>
              <div class="input-group" style="flex:1; margin-bottom:0;">
                <label>Preço foto extra (R$)</label>
                <input type="number" id="sessionExtraPrice" class="input" value="25" min="0" step="0.01" disabled>
              </div>
            </div>
            <div id="extraConfigFields" style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem;">
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" id="sessionAllowExtraPurchase" checked class="check" disabled>
                <span style="color:var(--text-primary); font-size:0.875rem;">Habilitar venda de fotos extras</span>
              </label>
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" id="sessionAllowReopen" checked class="check" disabled>
                <span style="color:var(--text-primary); font-size:0.875rem;">Permitir pedido de reabertura</span>
              </label>
            </div>
            <div id="commentsConfigField" style="display:none; flex-direction:column; gap:0.25rem; margin-top:0.5rem;">
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" id="sessionCommentsEnabled" class="check" disabled>
                <span style="color:var(--text-primary); font-size:0.875rem;">Habilitar mensagens por foto</span>
              </label>
              <p class="input-hint" style="margin:0 0 0 1.5rem;">O cliente poderá comentar em cada foto durante a seleção. Você responde diretamente no painel.</p>
            </div>
            <div id="multiOptionsField" style="display:none; flex-direction:column; gap:0.25rem; margin-top:0.5rem;">
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" id="sessionShowQueuePosition" class="check" disabled>
                <span style="color:var(--text-primary); font-size:0.875rem;">Mostrar posição na fila de entrega</span>
              </label>
              <p class="input-hint" style="margin:0 0 0 1.5rem;">Cada participante vê quantos estão à sua frente. Gatilho de urgência: incentiva o cliente a finalizar logo para ser entregue antes.</p>
            </div>
            <p id="multiSelectionHint" style="display:none; font-size:0.75rem; color:var(--yellow); margin-top:0.5rem;">No modo Multi-Seleção, você adicionará os participantes após criar a sessão.</p>
          </div>

          <!-- CRM: classificacao + automacao de vendas -->
          <div id="crmFields" style="border-top:1px solid var(--border); padding-top:1rem; display:flex; flex-direction:column; gap:0.75rem;">
            <h4 style="font-size:0.875rem; font-weight:600; color:var(--text-primary); margin:0;">CRM e Vendas</h4>
            <div class="input-group" style="margin-bottom:0;">
              <label>Tipo de Evento</label>
              <div class="select-wrap">
                <select id="sessionEventType" class="select input" disabled>
                  <option value="outro">Outro</option>
                  <option value="aniversario">Aniversário</option>
                  <option value="casamento">Casamento</option>
                  <option value="formatura">Formatura</option>
                  <option value="corporativo">Corporativo</option>
                  <option value="show">Show</option>
                  <option value="ensaio">Ensaio</option>
                  <option value="gestante">Gestante</option>
                  <option value="newborn">Newborn</option>
                  <option value="debutante">Debutante</option>
                  <option value="batizado">Batizado</option>
                </select>
              </div>
              <p class="input-hint">Categoria do evento para relatórios e filtros.</p>
            </div>
            <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
              <input type="checkbox" id="sessionSalesAutomation" checked class="check" disabled>
              <span style="color:var(--text-primary); font-size:0.875rem; display:flex; align-items:center; gap:0.5rem;"><i data-lucide="bot" style="width:16px; height:16px;"></i> Automação de vendas (escassez)</span>
            </label>
            <p class="input-hint" style="margin:0;">O robô envia e-mails de urgência ao cliente conforme o prazo se aproxima. Requer ativar a automação na configuração da organização.</p>
          </div>

          <!-- Retenção de storage -->
          <div style="border-top:1px solid var(--border); padding-top:1rem; display:flex; flex-direction:column; gap:0.75rem;">
            <h4 style="font-size:0.875rem; font-weight:600; color:var(--text-primary); margin:0;">Armazenamento</h4>
            <div class="input-group" style="margin-bottom:0;">
              <label>Guardar fotos no storage até</label>
              <input type="date" id="sessionStorageRetentionUntil" class="input" disabled>
              <p class="input-hint">Deixe em branco para guardar sem prazo. Quando a data chegar, você receberá uma notificação para decidir o que fazer.</p>
            </div>
            <div id="storageAutoDeleteField" style="display:none; flex-direction:column; gap:0.5rem;">
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" id="sessionStorageAutoDelete" class="check">
                <span style="color:var(--text-primary); font-size:0.875rem;">Deletar automaticamente nesta data</span>
              </label>
              <p class="input-hint" style="margin:0 0 0 1.5rem;">As fotos (exceto a capa) serão excluídas do servidor automaticamente. Use somente se tiver certeza de que não precisará das originais.</p>
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" id="sessionStorageBackupOnExpire" class="check">
                <span style="color:var(--text-primary); font-size:0.875rem;">Gerar backup ZIP antes de deletar</span>
              </label>
              <p class="input-hint" style="margin:0 0 0 1.5rem;">Gera um arquivo .zip com todas as fotos no servidor antes da exclusão. Útil para ter uma cópia local de segurança.</p>
            </div>
          </div>
          </div>
          <!-- /advancedConfigHidden -->

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
          <div id="uploadButtonGroup" style="display:flex; gap:0.5rem; align-items:center;">
            <label id="mainUploadBtn" style="padding:0.5rem 1rem; background:var(--accent); color:white; border-radius:0.375rem; cursor:pointer; font-weight:600; font-size:0.875rem; border:none; display:flex; align-items:center; gap:0.5rem; transition: background 0.2s;"></label>
            <label id="secondaryUploadBtn" style="display:none; padding:0.5rem 1rem; background:var(--purple); color:white; border-radius:0.375rem; cursor:pointer; font-weight:600; font-size:0.875rem; border:none; align-items:center; gap:0.5rem; transition: background 0.2s;"></label>
          </div>
          <input type="file" id="sessionUploadInput" accept="image/*" multiple style="display:none;">
          <input type="file" id="sessionEditedInput" accept="image/*" multiple style="display:none;">
          <button id="closePhotosModal" class="btn">Fechar</button>
        </div>
      </div>

      <div id="photoTabBar" style="padding:0 1.5rem; display:flex; gap:1.5rem; border-bottom:1px solid var(--border); background:var(--bg-surface); flex-shrink:0;">
          <button id="tabGeralBtn" style="padding:1rem 0; background:none; border:none; border-bottom:2px solid var(--accent); color:var(--text-primary); font-weight:600; cursor:pointer; font-size:0.875rem; display:flex; align-items:center; gap:0.5rem;" onclick="window.switchPhotoTab('geral')">
              🖼️ Galeria Geral
          </button>
          <button id="tabEntregaBtn" style="padding:1rem 0; background:none; border:none; border-bottom:2px solid transparent; color:var(--text-secondary); font-weight:600; cursor:pointer; font-size:0.875rem; display:flex; align-items:center; gap:0.5rem;" onclick="window.switchPhotoTab('entrega')">
              🚀 Entrega Final (<span id="deliveryCountBadge">0</span>)
          </button>
      </div>

      <div style="flex:1; display:flex; flex-direction:column; min-height:0; padding:1.5rem; overflow:hidden; background:var(--bg-base);">
          <div id="tabGeral" style="flex:1; display:flex; flex-direction:column; min-height:0;">
              <div id="bulkActionsBar" style="display:none; justify-content:space-between; align-items:center; margin-bottom:1rem; background:var(--bg-elevated); padding:0.5rem 1rem; border-radius:0.5rem; border:1px solid var(--border);">
                  <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.875rem; color:var(--text-primary);">
                      <input type="checkbox" id="selectAllPhotos" class="check">
                      <span>Selecionar Tudo</span>
                  </label>
                  <div style="display:flex; gap:0.75rem; align-items:center;">
                      <span id="selectedPhotosCount" style="font-size:0.875rem; color:var(--text-secondary);">0 selecionadas</span>
                      <button id="bulkDeleteBtn" class="btn btn-danger btn-sm" style="background:var(--red); color:white; border:none; display:none;">Deletar selecionadas</button>
                  </div>
              </div>
              <div id="sessionPhotosGrid" style="flex:1; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); grid-auto-rows: max-content; gap:1rem; align-content:start;"></div>
          </div>

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
        <div id="validationContent" style="padding:1.5rem; max-height:400px; overflow-y:auto; display:flex; flex-direction:column; gap:1rem;"></div>
        <div style="padding:1.25rem; background:var(--bg-base); border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:0.75rem;">
          <button id="cancelValidationBtn" class="btn">Cancelar</button>
          <button id="confirmValidationBtn" class="btn btn-primary"></button>
        </div>
      </div>
    </div>

    <!-- Modal Participantes (Multi-Seleção) -->
    <div id="participantsModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:1200; flex-direction:column;">
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
        <div style="background:var(--bg-base); padding:1rem; border-radius:0.5rem; border:1px solid var(--border); margin-bottom:1.5rem;">
            <h4 style="color:var(--text-primary); font-size:0.875rem; font-weight:600; margin-bottom:0.75rem;">Adicionar Participante</h4>
            <div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:end;">
                <div style="flex:2; min-width:200px; position:relative;">
                    <input type="text" id="newPartName" class="input" placeholder="Buscar cliente ou digitar nome">
                    <div id="partClientDropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.375rem; z-index:200; max-height:200px; overflow-y:auto; box-shadow:0 4px 12px rgba(0,0,0,0.15);"></div>
                    <input type="hidden" id="newPartClientId">
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
        <div id="participantsList" style="display:flex; flex-direction:column; gap:0.5rem;"></div>
      </div>
    </div>

    <!-- Modal Comentarios -->
    <div id="commentsModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1200; align-items:flex-start; justify-content:center; overflow-y:auto; padding:2rem 1rem;">
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.75rem; padding:1.5rem; width:28rem; max-width:100%; display:flex; flex-direction:column; gap:1rem; margin:2rem auto;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:1.125rem; font-weight:bold; color:var(--text-primary);">Comentários da Foto</h3>
            <button id="closeCommentsModal" style="color:var(--text-secondary); background:none; border:none; cursor:pointer; font-size:1.25rem;">&times;</button>
        </div>
        <!-- Preview da foto que está sendo comentada -->
        <div id="commentsPhotoPreview" style="display:flex; gap:0.75rem; align-items:center; padding:0.625rem; background:var(--bg-base); border:1px solid var(--border); border-radius:0.5rem;">
          <img id="commentsPhotoThumb" alt="Foto" style="width:84px; height:84px; object-fit:cover; border-radius:0.375rem; flex-shrink:0; background:var(--bg-elevated);">
          <div style="flex:1; min-width:0;">
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.125rem;">Conversa sobre a foto</div>
            <div id="commentsPhotoFilename" style="font-size:0.8125rem; color:var(--text-primary); font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></div>
            <div id="commentsPhotoMeta" style="font-size:0.6875rem; color:var(--text-muted); margin-top:0.125rem;"></div>
          </div>
        </div>
        <div id="commentsList" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:0.75rem; min-height:200px; max-height:400px; background:var(--bg-base); padding:1rem; border-radius:0.5rem; border:1px solid var(--border);"></div>
        <div style="display:flex; gap:0.5rem;">
            <input type="text" id="adminCommentInput" class="input" placeholder="Escreva uma resposta..." style="flex:1;">
            <button id="sendAdminCommentBtn" class="btn btn-primary">Enviar</button>
        </div>
      </div>
    </div>

    <!-- Modal Estender Retenção de Storage -->
    <div id="storageRetentionModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1200; align-items:center; justify-content:center;">
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.75rem; padding:1.5rem; width:28rem; max-width:100%; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:1.125rem; font-weight:bold; color:var(--text-primary);">Estender Armazenamento</h3>
          <button id="closeStorageRetentionModal" style="color:var(--text-secondary); background:none; border:none; cursor:pointer; font-size:1.25rem;">&times;</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.75rem;">
          <p style="color:var(--text-secondary); font-size:0.875rem; margin:0;">
            As fotos desta sessão expiram em <span id="storageExpiryDaysText" style="font-weight:600; color:var(--orange);">— dias</span>.
          </p>
          <div class="input-group" style="margin-bottom:0;">
            <label>Nova data de expiração</label>
            <input type="date" id="storageRetentionNewDate" class="input">
            <p class="input-hint">Deixe em branco para remover a data de expiração.</p>
          </div>
        </div>
        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
          <button id="cancelStorageRetentionModal" class="btn">Cancelar</button>
          <button id="confirmStorageRetentionExtend" class="btn btn-success">Estender</button>
        </div>
      </div>
    </div>
  `;

  await loadSessions(container, state);
  setupListFilters(container, state);
  setupModalForm(container, state, renderSessoes);
  setupComments(container, state);
  setupParticipantes(container, state, renderSessoes);
  setupUpload(container, state, renderSessoes);
  setupActions(container, state, renderSessoes);
}
