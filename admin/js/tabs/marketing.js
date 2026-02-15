/**
 * Tab: Marketing Intelligence
 */

import { appState } from '../state.js';

export async function renderMarketing(container) {
  // Carregar dados (mock por enquanto)
  let data = { visits: 0, leads: 0, whatsapp: 0, cpa: 0 };
  try {
    const res = await fetch('/api/marketing/overview', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) data = json;
    }
  } catch (e) { console.error(e); }

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
            <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Marketing Intelligence</h2>
            <p style="color:#9ca3af; font-size:0.875rem;">Monitoramento de performance e campanhas</p>
        </div>
        <div style="display:flex; gap:0.5rem;">
            <button style="background:#1f2937; color:#9ca3af; border:1px solid #374151; padding:0.375rem 0.75rem; border-radius:0.375rem; cursor:not-allowed;">Meta Ads</button>
            <button style="background:#1f2937; color:#9ca3af; border:1px solid #374151; padding:0.375rem 0.75rem; border-radius:0.375rem; cursor:not-allowed;">Google Ads</button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
        <div style="background:#1f2937; border:1px solid #374151; border-radius:0.75rem; padding:1.25rem;">
            <p style="color:#9ca3af; font-size:0.75rem; font-weight:500; text-transform:uppercase;">Visitas (30d)</p>
            <p style="color:#f3f4f6; font-size:1.5rem; font-weight:bold; margin-top:0.25rem;">${data.visits.toLocaleString()}</p>
            <p style="color:#34d399; font-size:0.75rem; margin-top:0.25rem;">+12% vs mês anterior</p>
        </div>
        <div style="background:#1f2937; border:1px solid #374151; border-radius:0.75rem; padding:1.25rem;">
            <p style="color:#9ca3af; font-size:0.75rem; font-weight:500; text-transform:uppercase;">Leads / WhatsApp</p>
            <p style="color:#f3f4f6; font-size:1.5rem; font-weight:bold; margin-top:0.25rem;">${data.leads + data.whatsapp}</p>
            <p style="color:#34d399; font-size:0.75rem; margin-top:0.25rem;">Taxa de conv. 6.1%</p>
        </div>
        <div style="background:#1f2937; border:1px solid #374151; border-radius:0.75rem; padding:1.25rem;">
            <p style="color:#9ca3af; font-size:0.75rem; font-weight:500; text-transform:uppercase;">Custo por Lead</p>
            <p style="color:#f3f4f6; font-size:1.5rem; font-weight:bold; margin-top:0.25rem;">R$ ${data.cpa.toFixed(2)}</p>
            <p style="color:#f87171; font-size:0.75rem; margin-top:0.25rem;">-2% vs meta</p>
        </div>
        <div style="background:#1f2937; border:1px solid #374151; border-radius:0.75rem; padding:1.25rem;">
            <p style="color:#9ca3af; font-size:0.75rem; font-weight:500; text-transform:uppercase;">Investimento</p>
            <p style="color:#f3f4f6; font-size:1.5rem; font-weight:bold; margin-top:0.25rem;">R$ 850,00</p>
            <p style="color:#9ca3af; font-size:0.75rem; margin-top:0.25rem;">Meta Ads + Google</p>
        </div>
      </div>

      <!-- Funil -->
      <div style="background:#1f2937; border:1px solid #374151; border-radius:0.75rem; padding:1.5rem;">
        <h3 style="font-size:1rem; font-weight:600; color:#d1d5db; margin-bottom:1.5rem;">Funil de Vendas (Estimado)</h3>
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
            <!-- Impressoes -->
            <div style="display:flex; align-items:center; gap:1rem;">
                <div style="width:6rem; text-align:right; font-size:0.75rem; color:#9ca3af;">Impressoes</div>
                <div style="flex:1; background:#111827; height:1.5rem; border-radius:0.25rem; overflow:hidden;">
                    <div style="width:100%; height:100%; background:#3b82f6;"></div>
                </div>
                <div style="width:4rem; font-size:0.75rem; color:#f3f4f6; font-weight:bold;">15.4k</div>
            </div>
            <!-- Cliques -->
            <div style="display:flex; align-items:center; gap:1rem;">
                <div style="width:6rem; text-align:right; font-size:0.75rem; color:#9ca3af;">Cliques</div>
                <div style="flex:1; background:#111827; height:1.5rem; border-radius:0.25rem; overflow:hidden;">
                    <div style="width:45%; height:100%; background:#60a5fa;"></div>
                </div>
                <div style="width:4rem; font-size:0.75rem; color:#f3f4f6; font-weight:bold;">${data.visits}</div>
            </div>
            <!-- Leads -->
            <div style="display:flex; align-items:center; gap:1rem;">
                <div style="width:6rem; text-align:right; font-size:0.75rem; color:#9ca3af;">Leads</div>
                <div style="flex:1; background:#111827; height:1.5rem; border-radius:0.25rem; overflow:hidden;">
                    <div style="width:15%; height:100%; background:#34d399;"></div>
                </div>
                <div style="width:4rem; font-size:0.75rem; color:#f3f4f6; font-weight:bold;">${data.leads + data.whatsapp}</div>
            </div>
        </div>
      </div>

      <!-- Insights -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
        <div style="background:#1f2937; border:1px solid #374151; border-radius:0.75rem; padding:1.5rem;">
            <h3 style="font-size:1rem; font-weight:600; color:#d1d5db; margin-bottom:1rem;">Demografia</h3>
            <div style="display:flex; align-items:center; justify-content:center; height:150px; border:1px dashed #374151; border-radius:0.5rem; color:#9ca3af; font-size:0.75rem;">
                Dados insuficientes para gráfico
            </div>
        </div>
        <div style="background:#1f2937; border:1px solid #374151; border-radius:0.75rem; padding:1.5rem;">
            <h3 style="font-size:1rem; font-weight:600; color:#d1d5db; margin-bottom:1rem;">Geografia</h3>
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; border-bottom:1px solid #374151; padding-bottom:0.25rem;">
                    <span style="color:#f3f4f6;">São Bernardo do Campo</span>
                    <span style="color:#9ca3af;">45%</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; border-bottom:1px solid #374151; padding-bottom:0.25rem;">
                    <span style="color:#f3f4f6;">Santo André</span>
                    <span style="color:#9ca3af;">25%</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; border-bottom:1px solid #374151; padding-bottom:0.25rem;">
                    <span style="color:#f3f4f6;">São Paulo (Zona Sul)</span>
                    <span style="color:#9ca3af;">15%</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  `;
}