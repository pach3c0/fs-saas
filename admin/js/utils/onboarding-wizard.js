import { apiPost } from './api.js';
import { appState } from '../state.js';
import { showToast } from './toast.js';

const CALENDLY_LINK = 'https://calendly.com/'; // Ou link do WhatsApp

export function startGuidedOnboarding() {
  const root = document.getElementById('guided-onboarding-root');
  if (!root) return;

  root.style.display = 'block';
  
  const step = appState.orgData?.onboarding?.guidedStep || 1;
  renderStep(step);
}

function closeWizard() {
  const root = document.getElementById('guided-onboarding-root');
  if (root) root.style.display = 'none';
  // Atualiza o dashboard (ou a aba atual) ao fechar
  if (window.switchTab) window.switchTab('dashboard');
}

async function saveProgress(stepData) {
  try {
    const res = await apiPost('/api/organization/onboarding', stepData);
    if (res.onboarding) {
      if (!appState.orgData) appState.orgData = {};
      appState.orgData.onboarding = res.onboarding;
    }
  } catch (error) {
    console.error('Erro ao salvar onboarding:', error);
  }
}

function renderStep(step) {
  const root = document.getElementById('guided-onboarding-root');
  
  const skipBtnHtml = `
    <button onclick="window._skipOnboarding()" style="position:absolute; top:20px; right:20px; background:transparent; color:var(--ad-text-muted); border:none; cursor:pointer; font-size:14px; text-decoration:underline;">
      Pular por enquanto
    </button>
  `;

  let content = '';

  if (step === 1) {
    content = `
      <div style="text-align:center; max-width:500px; width:100%;">
        <div style="font-size:48px; margin-bottom:1rem;">🎉</div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:10px; color:var(--ad-text);">Bem-vindo ao CliqueZoom!</h1>
        <p style="color:var(--ad-text-muted); line-height:1.6; margin-bottom:2rem;">
          Estamos muito felizes em ter você aqui. Para garantir que você extraia o máximo da nossa plataforma, nós oferecemos um <strong>treinamento gratuito de implantação</strong> com um dos nossos especialistas.
        </p>
        
        <div style="background:var(--ad-bg-surface); padding:2rem; border-radius:12px; border:1px solid var(--ad-border); margin-bottom:2rem;">
          <h3 style="font-size:16px; margin-bottom:10px; color:var(--ad-text);">Agende seu treinamento</h3>
          <p style="font-size:14px; color:var(--ad-text-muted); margin-bottom:1.5rem;">Escolha o melhor horário para montarmos o seu estúdio digital juntos.</p>
          <a href="${CALENDLY_LINK}" target="_blank" style="display:inline-block; background:var(--ad-accent); color:var(--ad-bg-base); padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; font-size:15px; width:100%;">
            📅 Agendar Agora
          </a>
        </div>
        
        <button onclick="window._nextOnboardingStep(2)" style="background:transparent; border:1px solid var(--ad-border); color:var(--ad-text); padding:10px 24px; border-radius:6px; cursor:pointer; font-weight:600;">
          Já agendei (Avançar) →
        </button>
      </div>
    `;
  } else if (step === 2) {
    // Pegar cor e whatsapp atuais
    const currentTheme = appState.siteData?.theme || {};
    const currentColor = currentTheme.primaryColor || '#000000';
    const whatsapp = appState.orgData?.integrations?.whatsapp?.number || '';

    content = `
      <div style="max-width:500px; width:100%; text-align:center;">
        <h1 style="font-size:24px; font-weight:700; margin-bottom:10px; color:var(--ad-text);">A Cara do seu Estúdio</h1>
        <p style="color:var(--ad-text-muted); margin-bottom:2rem;">Vamos deixar o CliqueZoom com a sua identidade.</p>
        
        <div style="background:var(--ad-bg-surface); padding:2rem; border-radius:12px; border:1px solid var(--ad-border); text-align:left; margin-bottom:2rem; display:flex; flex-direction:column; gap:1.5rem;">
          
          <div>
            <label style="display:block; font-size:14px; font-weight:600; margin-bottom:8px; color:var(--ad-text);">1. Sua Cor Principal</label>
            <p style="font-size:12px; color:var(--ad-text-muted); margin-bottom:8px;">Usada nos botões e galerias dos clientes.</p>
            <input type="color" id="ob-color" value="${currentColor}" style="width:100%; height:40px; border-radius:6px; cursor:pointer; border:1px solid var(--ad-border);">
          </div>

          <div>
            <label style="display:block; font-size:14px; font-weight:600; margin-bottom:8px; color:var(--ad-text);">2. WhatsApp de Contato</label>
            <input type="text" id="ob-whatsapp" placeholder="(11) 99999-9999" value="${whatsapp}" class="input" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--ad-border); background:var(--ad-input-bg); color:var(--ad-text);">
          </div>

        </div>
        
        <div style="display:flex; gap:1rem; justify-content:center;">
          <button onclick="window._nextOnboardingStep(1)" style="background:var(--ad-bg-surface); border:1px solid var(--ad-border); color:var(--ad-text); padding:12px 24px; border-radius:8px; cursor:pointer; font-weight:600;">
            Voltar
          </button>
          <button onclick="window._saveStep2AndNext()" style="background:var(--ad-accent); border:none; color:var(--ad-bg-base); padding:12px 24px; border-radius:8px; cursor:pointer; font-weight:600; min-width:120px;">
            Avançar →
          </button>
        </div>
      </div>
    `;
  } else if (step === 3) {
    content = `
      <div style="text-align:center; max-width:500px; width:100%;">
        <div style="font-size:48px; margin-bottom:1rem;">🚀</div>
        <h1 style="font-size:24px; font-weight:700; margin-bottom:10px; color:var(--ad-text);">Tudo Pronto!</h1>
        <p style="color:var(--ad-text-muted); line-height:1.6; margin-bottom:2rem;">
          Sua plataforma está configurada e pronta para receber seus clientes e álbuns.
        </p>
        
        <div style="background:var(--ad-bg-surface); padding:1.5rem; border-radius:12px; border:1px solid var(--ad-border); margin-bottom:2rem; text-align:left;">
          <h3 style="font-size:16px; margin-bottom:1rem; color:var(--ad-text);">Próximos Passos Sugeridos:</h3>
          <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.75rem;">
            <li style="display:flex; gap:10px; color:var(--ad-text-muted); font-size:14px;">
              <span style="color:var(--ad-accent);">1.</span> Crie sua primeira <strong>Sessão</strong>.
            </li>
            <li style="display:flex; gap:10px; color:var(--ad-text-muted); font-size:14px;">
              <span style="color:var(--ad-accent);">2.</span> Envie o link para o cliente escolher as fotos.
            </li>
            <li style="display:flex; gap:10px; color:var(--ad-text-muted); font-size:14px;">
              <span style="color:var(--ad-accent);">3.</span> Acesse <strong>Meu Site</strong> para ver como sua galeria pública ficou.
            </li>
          </ul>
        </div>
        
        <button onclick="window._finishOnboarding()" style="background:var(--ad-accent); border:none; color:var(--ad-bg-base); padding:14px 32px; border-radius:8px; cursor:pointer; font-weight:600; font-size:16px; width:100%;">
          Ir para o meu Painel
        </button>
      </div>
    `;
  }

  root.innerHTML = `
    <div style="position:fixed; inset:0; background:var(--ad-bg-base); z-index:999999; display:flex; align-items:center; justify-content:center; padding:20px; overflow-y:auto;">
      ${skipBtnHtml}
      ${content}
    </div>
  `;
}

window._nextOnboardingStep = (step) => {
  saveProgress({ guidedStep: step });
  renderStep(step);
};

window._saveStep2AndNext = async () => {
  const btn = event.target;
  const originalText = btn.textContent;
  btn.textContent = 'Salvando...';
  btn.disabled = true;

  const color = document.getElementById('ob-color').value;
  const whatsapp = document.getElementById('ob-whatsapp').value;

  try {
    // 1. Salvar siteData (tema)
    const siteUpdate = { siteContent: { theme: { ...(appState.siteData?.theme || {}), primaryColor: color } } };
    await apiPost('/api/site/admin/config', siteUpdate);

    // 2. Salvar WhatsApp da org
    await apiPost('/api/organization/profile', {
      name: appState.orgData.name, // required by schema
      slug: appState.orgData.slug,
      integrations: {
        ...(appState.orgData.integrations || {}),
        whatsapp: { enabled: true, number: whatsapp }
      }
    });

    // Avançar
    window._nextOnboardingStep(3);
  } catch (err) {
    showToast('Erro ao salvar configurações', 'error');
    btn.textContent = originalText;
    btn.disabled = false;
  }
};

window._finishOnboarding = async () => {
  await saveProgress({ completed: true });
  closeWizard();
};

window._skipOnboarding = async () => {
  if (confirm('Tem certeza? Você pode concluir as configurações depois acessando o menu lateral.')) {
    await saveProgress({ skipped: true });
    closeWizard();
  }
};
