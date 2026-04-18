// Biblioteca de Componentes do Site Builder (Visualização para o Desenvolvedor)

window.loadComponentesLibrary = function() {
  const el = document.getElementById('componentesEditor');
  
  el.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem; padding-bottom: 3rem;">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
        <h2 style="font-size:1.25rem; font-weight:700; color:#f1f5f9;">Biblioteca de Componentes (Site Builder)</h2>
        <a href="vscode://file/Users/macbook/Documents/ProjetoEstudio/FsSaaS/skills/1_4_builder-componentes.md" style="background:#1e3a5f; color:#93c5fd; padding:0.5rem 1rem; border-radius:0.375rem; font-size:0.8125rem; font-weight:500; text-decoration:none;">Ler Documentação Completa (Skill 1_4)</a>
      </div>
      <p style="color:#94a3b8; font-size:0.875rem;">Esses são os componentes interativos padronizados do Site Builder. Use este layout como referência ao solicitar a criação de novos módulos.</p>

      <!-- PADRÃO AUTO-SAVE: TEXTOS -->
      <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; padding:1.5rem;">
        <h3 style="font-size:0.875rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:1.25rem;">1. Padrão Auto-Save (Inputs de Texto)</h3>
        
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:500; color:#94a3b8; margin-bottom:0.375rem;">Input Simples (oninput com auto-save)</label>
            <input type="text" value="Valor de Exemplo" placeholder="Digite para simular o auto-save..." oninput="simulateAutoSave()" style="padding:0.5rem 0.75rem; border:1px solid #334155; border-radius:0.375rem; background:#0f172a; color:#f1f5f9; font-size:0.8125rem; width:100%; outline:none;">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; font-weight:500; color:#94a3b8; margin-bottom:0.375rem;">Textarea (oninput com auto-save)</label>
            <textarea placeholder="Digite para simular o auto-save..." oninput="simulateAutoSave()" rows="3" style="padding:0.5rem 0.75rem; border:1px solid #334155; border-radius:0.375rem; background:#0f172a; color:#f1f5f9; font-size:0.8125rem; width:100%; outline:none; resize:vertical;">Texto longo de exemplo para exibir o comportamento do auto-save e do textarea expansível.</textarea>
          </div>
          <div>
            <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.8125rem; color:#e2e8f0; cursor:pointer;">
              <input type="checkbox" checked onchange="simulateAutoSave()">
              Opção Ativa (onchange com auto-save)
            </label>
          </div>
        </div>
      </div>

      <!-- PADRÃO AUTO-SAVE: SLIDERS -->
      <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; padding:1.5rem;">
        <h3 style="font-size:0.875rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:1.25rem;">2. Padrão Auto-Save (Sliders de Ajuste)</h3>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
          <div>
            <label style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:500; color:#94a3b8; margin-bottom:0.375rem;">
              <span>Tamanho (Escala)</span>
              <span id="sliderVal1">1.0</span>
            </label>
            <input type="range" min="0.5" max="2" step="0.1" value="1.0" oninput="document.getElementById('sliderVal1').textContent=this.value; simulateAutoSave()" style="width:100%; accent-color:#6366f1;">
          </div>
          <div>
            <label style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:500; color:#94a3b8; margin-bottom:0.375rem;">
              <span>Transparência</span>
              <span id="sliderVal2">100%</span>
            </label>
            <input type="range" min="0" max="100" value="100" oninput="document.getElementById('sliderVal2').textContent=this.value+'%'; simulateAutoSave()" style="width:100%; accent-color:#6366f1;">
          </div>
        </div>
      </div>

      <!-- PADRÃO UPLOAD: SIMPLES -->
      <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; padding:1.5rem;">
        <h3 style="font-size:0.875rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:1.25rem;">3. Padrão Upload (Botão com Progresso)</h3>
        
        <div style="display:flex; align-items:center; gap:1rem;">
          <button onclick="simulateUpload()" style="background:#6366f1; color:white; padding:0.625rem 1.25rem; border-radius:0.375rem; font-size:0.8125rem; font-weight:600; border:none; cursor:pointer;">
            📤 Fazer Upload (Simulação)
          </button>
          <div id="uploadProgressContainer" style="display:none; flex:1; align-items:center; gap:0.5rem;">
            <div style="flex:1; height:6px; background:#0f172a; border-radius:3px; overflow:hidden;">
              <div id="uploadProgressBar" style="height:100%; width:0%; background:#10b981; transition:width 0.2s;"></div>
            </div>
            <span id="uploadProgressText" style="font-size:0.75rem; color:#94a3b8;">0%</span>
          </div>
        </div>
      </div>

      <!-- PADRÃO MÚLTIPLAS IMAGENS / SORTABLE -->
      <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; padding:1.5rem;">
        <h3 style="font-size:0.875rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:1.25rem;">4. Galeria de Imagens (Drag-and-Drop)</h3>
        
        <p style="font-size:0.75rem; color:#64748b; margin-bottom:1rem;">Demonstração estática do grid usado no Portfólio e Álbuns. Em produção usa SortableJS.</p>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:0.75rem;">
          ${[1,2,3,4].map(i => `
            <div style="aspect-ratio:1; background:#0f172a; border:1px solid #334155; border-radius:0.5rem; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; color:#475569;">
              <span style="font-size:2rem;">📷</span>
              <button style="position:absolute; top:0.25rem; right:0.25rem; background:rgba(0,0,0,0.5); color:white; border:none; border-radius:99px; width:1.5rem; height:1.5rem; display:flex; align-items:center; justify-content:center; cursor:pointer;">&times;</button>
            </div>
          `).join('')}
          <div style="aspect-ratio:1; background:#0f172a; border:1px dashed #475569; border-radius:0.5rem; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#64748b; cursor:pointer;" onclick="simulateUpload()">
            <span style="font-size:1.5rem; margin-bottom:0.25rem;">+</span>
            <span style="font-size:0.6875rem;">Adicionar</span>
          </div>
        </div>
      </div>

      <!-- BOTÕES E BADGES -->
      <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; padding:1.5rem;">
        <h3 style="font-size:0.875rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:1.25rem;">5. Padrões Visuais (Stitch Dark)</h3>
        
        <div style="display:flex; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
          <button style="background:#6366f1; color:white; padding:0.5rem 1.25rem; border-radius:0.375rem; font-size:0.8125rem; font-weight:600; border:none; cursor:pointer;">Botão Primário</button>
          <button style="background:#334155; color:#e2e8f0; padding:0.5rem 1.25rem; border-radius:0.375rem; font-size:0.8125rem; font-weight:500; border:none; cursor:pointer;">Botão Secundário</button>
          <button style="background:#7f1d1d; color:#fca5a5; padding:0.5rem 1.25rem; border-radius:0.375rem; font-size:0.8125rem; font-weight:500; border:none; cursor:pointer;">Botão Destrutivo</button>
        </div>
        
        <div style="display:flex; gap:1rem;">
          <span style="background:#065f46; color:#6ee7b7; padding:0.25rem 0.625rem; border-radius:999px; font-size:0.6875rem; font-weight:600;">Status: Ativo</span>
          <span style="background:#78350f; color:#fbbf24; padding:0.25rem 0.625rem; border-radius:999px; font-size:0.6875rem; font-weight:600;">Status: Pendente</span>
        </div>
      </div>

      <!-- PADRÃO EDITOR DE CAMADAS (CANVAS CSS) INTERATIVO -->
      <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; padding:1.5rem;">
        <h3 style="font-size:0.875rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:1.25rem;">6. Editor Visual de Camadas (Canvas CSS) Interativo</h3>
        <p style="font-size:0.75rem; color:#64748b; margin-bottom:1rem;">Protótipo real do módulo Sobre. Edite os parâmetros e arraste as camadas (drag-and-drop).</p>
        
        <div style="display:flex; gap:1.5rem; flex-wrap:wrap;">
          
          <!-- Lista de Camadas -->
          <div style="flex:1; min-width:250px;">
            <div style="font-size:0.75rem; font-weight:600; color:#94a3b8; margin-bottom:0.5rem; text-transform:uppercase;">Camadas</div>
            <div id="demo-layer-list" style="display:flex; flex-direction:column; gap:0.5rem; background:#0f172a; padding:0.5rem; border-radius:0.5rem; border:1px solid #334155;"></div>
            <button onclick="demoAddLayer()" style="margin-top:0.5rem; width:100%; background:#1e3a5f; color:#93c5fd; padding:0.5rem; border-radius:0.375rem; font-size:0.75rem; border:none; cursor:pointer;">+ Adicionar Camada Fake</button>
          </div>

          <!-- Painel de Propriedades -->
          <div style="flex:1.5; min-width:280px; background:#0f172a; padding:1.25rem; border-radius:0.5rem; border:1px solid #334155;">
            <div style="font-size:0.75rem; font-weight:600; color:#6366f1; margin-bottom:1rem; text-transform:uppercase;">Ajustes da Camada Ativa</div>
            <div id="demo-layer-props">Selecione uma camada</div>
          </div>

          <!-- PREVIEW VISUAL -->
          <div style="flex:1.5; min-width:280px;">
            <div style="font-size:0.75rem; font-weight:600; color:#10b981; margin-bottom:0.5rem; text-transform:uppercase;">Preview Em Tempo Real</div>
            <div id="demo-preview-container" style="aspect-ratio:3/4; background:#161b22; border:1px solid #334155; border-radius:0.5rem; position:relative; overflow:hidden;">
            </div>
          </div>
          
        </div>
      </div>

    </div>
  `;
  setTimeout(renderDemoAll, 100);
};

// Funções de simulação
let saveTimeout = null;
window.simulateAutoSave = function() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saasToast('Auto-save acionado simulando alteração local.', 'success');
  }, 500);
};

window.simulateUpload = function() {
  const container = document.getElementById('uploadProgressContainer');
  const bar = document.getElementById('uploadProgressBar');
  const text = document.getElementById('uploadProgressText');
  
  if (!container) return;
  container.style.display = 'flex';
  bar.style.width = '0%';
  
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 20;
    if (progress > 100) progress = 100;
    bar.style.width = progress + '%';
    text.textContent = Math.round(progress) + '%';
    
    if (progress === 100) {
      clearInterval(interval);
      setTimeout(() => {
        container.style.display = 'none';
        saasToast('Upload simulado concluído!', 'success');
      }, 500);
    }
  }, 200);
};

// ==========================================
// SIMULAÇÃO DO CANVAS CSS (Módulo Sobre)
// ==========================================

let _demoLayers = [
  { id: 'sb_1', name: 'Foto Inicial', color: '#3b82f6', x: 50, y: 50, width: 70, height: 70, rotation: 0, opacity: 100, borderRadius: 10, shadow: false, shadowBlur: 10, flipH: false, flipV: false },
  { id: 'sb_2', name: 'Detalhe Fundo', color: '#10b981', x: 20, y: 20, width: 40, height: 40, rotation: -15, opacity: 50, borderRadius: 0, shadow: false, shadowBlur: 10, flipH: false, flipV: false }
];
let _demoSelectedId = 'sb_1';

window.demoAddLayer = function() {
  if (_demoLayers.length >= 4) {
    saasToast('Limite de 4 camadas atingido', 'warning');
    return;
  }
  const colors = ['#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  const col = colors[_demoLayers.length % colors.length];
  const nova = {
    id: 'sb_' + Date.now(),
    name: 'Nova Foto ' + (_demoLayers.length + 1),
    color: col,
    x: 50, y: 50, width: 50, height: 50, rotation: 0, opacity: 100, borderRadius: 0, shadow: false, shadowBlur: 10, flipH: false, flipV: false
  };
  _demoLayers.push(nova);
  _demoSelectedId = nova.id;
  renderDemoAll();
};

function renderDemoAll() {
  renderDemoList();
  renderDemoProps();
  renderDemoPreview();
}

function renderDemoList() {
  const list = document.getElementById('demo-layer-list');
  if (!list) return;
  if (!_demoLayers.length) {
    list.innerHTML = '<div style="font-size:0.75rem; color:#64748b; text-align:center;">Nenhuma camada</div>';
    return;
  }
  
  // Renderiza reverso para refletir o Z-index visualmente
  list.innerHTML = [..._demoLayers].reverse().map((l, idx) => {
    const active = l.id === _demoSelectedId ? 'background:#1e293b; border-color:#6366f1;' : 'background:#161b22; border-color:transparent;';
    return \`
      <div class="demo-layer-item" data-id="\${l.id}" data-idx="\${idx}" draggable="true" style="display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0.75rem; border-radius:0.375rem; border:1px solid transparent; cursor:pointer; \${active}">
        <div style="display:flex; align-items:center; gap:0.5rem; pointer-events:none;">
          <span style="color:\${l.color}">■</span>
          <span style="font-size:0.8125rem; color:#f1f5f9;">\${l.name}</span>
        </div>
        <span onclick="demoDeleteLayer('\${l.id}', event)" style="color:#ef4444; font-size:1rem; cursor:pointer;">&times;</span>
      </div>
    \`;
  }).join('');

  // Setup Drag and Drop
  let dragLayerIdx = null;
  list.querySelectorAll('.demo-layer-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      dragLayerIdx = parseInt(item.dataset.idx);
      item.style.opacity = '0.4';
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => { 
      item.style.opacity = '1'; 
      list.querySelectorAll('.demo-layer-item').forEach(i => i.style.borderTop = ''); 
    });
    item.addEventListener('dragover', (e) => { 
      e.preventDefault(); 
      item.style.borderTop = '2px solid #3b82f6'; 
    });
    item.addEventListener('dragleave', () => { 
      item.style.borderTop = ''; 
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.style.borderTop = '';
      const targetIdx = parseInt(item.dataset.idx);
      if (dragLayerIdx === null || dragLayerIdx === targetIdx) return;
      
      const realLen = _demoLayers.length;
      const realDrag = realLen - 1 - dragLayerIdx;
      const realTarget = realLen - 1 - targetIdx;
      
      const moved = _demoLayers.splice(realDrag, 1)[0];
      _demoLayers.splice(realTarget, 0, moved);
      
      dragLayerIdx = null;
      renderDemoAll();
    });

    item.addEventListener('click', (e) => {
      if (e.target.tagName !== 'SPAN') {
        _demoSelectedId = item.dataset.id;
        renderDemoAll();
      }
    });
  });
}

window.demoDeleteLayer = function(id, e) {
  e.stopPropagation();
  _demoLayers = _demoLayers.filter(l => l.id !== id);
  if (_demoSelectedId === id) _demoSelectedId = _demoLayers.length ? _demoLayers[_demoLayers.length-1].id : null;
  renderDemoAll();
}

function renderDemoProps() {
  const container = document.getElementById('demo-layer-props');
  if (!container) return;
  const l = _demoLayers.find(l => l.id === _demoSelectedId);
  if (!l) {
    container.innerHTML = '<div style="font-size:0.75rem; color:#64748b;">Nenhuma camada selecionada</div>';
    return;
  }
  
  container.innerHTML = \`
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem;">
      \${demoRange('x', 'Eixo X', l.x, 0, 100, '%')}
      \${demoRange('y', 'Eixo Y', l.y, 0, 100, '%')}
      \${demoRange('width', 'Largura', l.width, 5, 150, '%')}
      \${demoRange('height', 'Altura', l.height, 5, 150, '%')}
      \${demoRange('rotation', 'Rotação', l.rotation, -180, 180, '°')}
      \${demoRange('opacity', 'Opacidade', l.opacity, 0, 100, '%')}
      \${demoRange('borderRadius', 'Bordas', l.borderRadius, 0, 200, 'px')}
      \${demoRange('shadowBlur', 'Sombra (Blur)', l.shadowBlur, 0, 60, 'px')}
    </div>
    <div style="margin-top:1.25rem; display:flex; gap:0.5rem;">
      <label style="flex:1; display:flex; align-items:center; gap:0.5rem; font-size:0.75rem; color:#94a3b8; cursor:pointer;">
        <input type="checkbox" \${l.shadow ? 'checked' : ''} onchange="demoUpdateProp('shadow', this.checked)"> Sombra Ativa
      </label>
    </div>
    <div style="margin-top:0.75rem; display:flex; gap:0.5rem;">
      <button onclick="demoUpdateProp('flipH', !\${l.flipH})" style="flex:1; background:\${l.flipH ? '#3b82f6' : '#1e293b'}; color:#e2e8f0; border:1px solid #334155; padding:0.5rem; border-radius:0.375rem; font-size:0.75rem; cursor:pointer;">Espelhar Horiz.</button>
      <button onclick="demoUpdateProp('flipV', !\${l.flipV})" style="flex:1; background:\${l.flipV ? '#3b82f6' : '#1e293b'}; color:#e2e8f0; border:1px solid #334155; padding:0.5rem; border-radius:0.375rem; font-size:0.75rem; cursor:pointer;">Espelhar Vert.</button>
    </div>
  \`;
}

function demoRange(field, label, value, min, max, suffix) {
  return \`
    <div>
      <label style="display:flex; justify-content:space-between; font-size:0.75rem; color:#94a3b8; margin-bottom:0.25rem;">
        <span>\${label}</span> <span id="demoVal_\${field}">\${value}\${suffix}</span>
      </label>
      <input type="range" min="\${min}" max="\${max}" value="\${value}" oninput="demoUpdateProp('\${field}', parseInt(this.value)); document.getElementById('demoVal_\${field}').textContent=this.value+'\${suffix}'" style="width:100%; accent-color:#6366f1;">
    </div>
  \`;
}

window.demoUpdateProp = function(field, val) {
  const l = _demoLayers.find(l => l.id === _demoSelectedId);
  if (l) {
    l[field] = val;
    renderDemoPreview();
    if (field === 'flipH' || field === 'flipV' || field === 'shadow') renderDemoProps();
  }
}

function renderDemoPreview() {
  const container = document.getElementById('demo-preview-container');
  if (!container) return;
  
  container.innerHTML = _demoLayers.map((l, zIndex) => {
    let t = \`translate(-50%, -50%) rotate(\${l.rotation}deg)\`;
    if (l.flipH) t += ' scaleX(-1)';
    if (l.flipV) t += ' scaleY(-1)';
    
    let box = '';
    if (l.shadow) {
      box = \`box-shadow: 0 \${l.shadowBlur/2}px \${l.shadowBlur}px rgba(0,0,0,0.5);\`;
    }
    
    const isSelected = l.id === _demoSelectedId;
    const border = isSelected ? 'border:2px dashed white;' : '';
    
    return \`
      <div style="
        position:absolute;
        left:\${l.x}%; top:\${l.y}%;
        width:\${l.width}%; height:\${l.height}%;
        background:\${l.color};
        transform:\${t};
        opacity:\${l.opacity/100};
        border-radius:\${l.borderRadius}px;
        z-index:\${zIndex};
        \${box}
        \${border}
        display:flex; align-items:center; justify-content:center;
        color:rgba(255,255,255,0.8); font-size:0.75rem; font-weight:bold;
      ">\${l.name}</div>
    \`;
  }).join('');
}


