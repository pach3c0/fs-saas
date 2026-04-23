/**
 * Cadastro - CliqueZoom
 * Logica do formulario de registro, FAQ, planos e navegacao dinâmica
 */

// ============================================================================
// DYNAMIC CONTENT LOADING
// ============================================================================

async function loadLandingConfig() {
  try {
    const res = await fetch('/api/landing/config');
    const result = await res.json();
    if (!result.success) return;

    const d = result.data;

    // Hero
    if (d.hero) {
      if (document.getElementById('heroHeadline')) document.getElementById('heroHeadline').innerHTML = d.hero.headline || '';
      if (document.getElementById('heroSubheadline')) document.getElementById('heroSubheadline').textContent = d.hero.subheadline || '';
      if (document.getElementById('heroCtaText')) {
        const ctaBtn = document.getElementById('heroCtaText');
        const svg = ctaBtn.querySelector('svg')?.outerHTML || '';
        ctaBtn.innerHTML = `${d.hero.ctaText || 'Comecar Gratuitamente'} ${svg}`;
      }
      if (document.getElementById('heroCtaSubtext')) document.getElementById('heroCtaSubtext').textContent = d.hero.ctaSubtext || '';
    }

    // How It Works
    if (d.howItWorks && document.getElementById('stepsGrid')) {
      if (document.getElementById('howTitle')) document.getElementById('howTitle').textContent = d.howItWorks.title || '';
      const grid = document.getElementById('stepsGrid');
      grid.innerHTML = (d.howItWorks.steps || []).map((step, i) => `
        <div class="step">
            <div class="step-number">${step.icon || (i + 1)}</div>
            <h3>${step.title || ''}</h3>
            <p>${step.description || ''}</p>
        </div>
      `).join('');
    }

    // Features
    if (d.features && document.getElementById('solutionsGrid')) {
      if (document.getElementById('featuresTitle')) document.getElementById('featuresTitle').textContent = d.features.title || '';
      const grid = document.getElementById('solutionsGrid');
      grid.innerHTML = (d.features.items || []).filter(f => f.active !== false).map(f => `
        <div class="solution-card">
            <div class="solution-icon">
                <span style="font-size: 1.5rem;">${f.icon || '✨'}</span>
            </div>
            <h3>${f.title || ''}</h3>
            <p>${f.description || ''}</p>
        </div>
      `).join('');
    }

    // Plans
    if (d.plans && document.getElementById('pricingGrid')) {
      if (document.getElementById('pricingTitle')) document.getElementById('pricingTitle').textContent = d.plans.title || '';
      if (document.getElementById('pricingSub')) document.getElementById('pricingSub').textContent = d.plans.subtitle || '';
      const grid = document.getElementById('pricingGrid');
      grid.innerHTML = (d.plans.items || []).map(p => `
        <div class="plan-card ${p.highlighted ? 'featured' : ''}">
            ${p.highlighted ? '<div class="plan-badge">Popular</div>' : ''}
            <div class="plan-name">${p.name || ''}</div>
            <div class="plan-desc">${p.description || ''}</div>
            <div class="plan-price">
                <span class="plan-price-value">${p.price || ''}</span>
                <span class="plan-price-period">/${p.period || 'mes'}</span>
            </div>
            <hr class="plan-divider">
            <ul class="plan-features">
                ${(p.features || []).map(feat => `
                  <li class="plan-feature">
                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ${feat}
                  </li>
                `).join('')}
            </ul>
            <a href="#cadastro" class="plan-cta ${p.highlighted ? '' : 'outline'}" data-plan="${p.name?.toLowerCase()}">
              ${p.highlighted ? 'Assinar ' + p.name : 'Comecar ' + p.name}
            </a>
        </div>
      `).join('');

      // Re-attach plan selection listeners
      attachPlanListeners();
    }

    // FAQ
    if (d.faq && document.getElementById('faqList')) {
      if (document.getElementById('faqTitle')) document.getElementById('faqTitle').textContent = d.faq.title || '';
      const list = document.getElementById('faqList');
      list.innerHTML = (d.faq.items || []).filter(f => f.active !== false).map(f => `
        <div class="faq-item">
            <button class="faq-question">
                ${f.question || ''}
                <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div class="faq-answer"><p>${f.answer || ''}</p></div>
        </div>
      `).join('');

      // Re-attach FAQ listeners
      attachFaqListeners();
    }

    // CTA Final
    if (d.cta) {
      if (document.getElementById('ctaFinalTitle')) document.getElementById('ctaFinalTitle').textContent = d.cta.title || '';
      if (document.getElementById('ctaFinalSub')) document.getElementById('ctaFinalSub').textContent = d.cta.subtitle || '';
      if (document.getElementById('ctaFinalBtn')) {
        const btn = document.getElementById('ctaFinalBtn');
        const svg = btn.querySelector('svg')?.outerHTML || '';
        btn.innerHTML = `${d.cta.buttonText || 'Criar Minha Conta'} ${svg}`;
      }
    }

    // Footer
    if (d.footer && document.getElementById('footerText')) {
      document.getElementById('footerText').innerHTML = d.footer.text || `&copy; ${new Date().getFullYear()} CliqueZoom`;
    }

  } catch (err) {
    console.error('Erro ao carregar landing config:', err);
  }
}

function attachPlanListeners() {
  document.querySelectorAll('[data-plan]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var plan = this.getAttribute('data-plan');
      if (plan) {
        selectedPlan = plan;
        var names = { free: 'Free', basic: 'Basic', pro: 'Pro' };
        document.getElementById('planSelectedName').textContent = names[plan] || plan;
        document.getElementById('planSelected').style.display = 'block';
      }
    });
  });
}

function attachFaqListeners() {
  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var answer = this.nextElementSibling;
      var isOpen = this.classList.contains('active');

      // Fechar todos
      document.querySelectorAll('.faq-question').forEach(function (b) {
        b.classList.remove('active');
        b.nextElementSibling.style.maxHeight = null;
      });

      // Abrir o clicado (se estava fechado)
      if (!isOpen) {
        this.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
}

// Chamar ao carregar a página
document.addEventListener('DOMContentLoaded', loadLandingConfig);


var selectedPlan = 'free';

window.clearPlan = function () {
  selectedPlan = 'free';
  document.getElementById('planSelected').style.display = 'none';
};

// ============================================================================
// SLUG SANITIZATION + PREVIEW
// ============================================================================

var slugInput = document.getElementById('slug');
var slugPreview = document.getElementById('slugPreview');
var checkSlugTimeout = null;

slugInput.addEventListener('input', function () {
  var value = this.value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-');
  this.value = value;

  if (value && value.length >= 2) {
    slugPreview.textContent = value + '.cliquezoom.com.br';
    slugPreview.style.color = '#666'; // Cor neutra enquanto digita

    // Debounce para não inundar o servidor
    clearTimeout(checkSlugTimeout);
    checkSlugTimeout = setTimeout(async function() {
      try {
        const res = await fetch(`/api/auth/check-slug/${value}`);
        const data = await res.json();
        
        if (data.success) {
          if (data.available) {
            slugPreview.style.color = '#16a34a'; // Verde - Disponível
            slugPreview.textContent = '✓ ' + value + '.cliquezoom.com.br (Disponível)';
          } else {
            slugPreview.style.color = '#dc2626'; // Vermelho - Ocupado
            slugPreview.textContent = '✗ ' + value + '.cliquezoom.com.br (Indisponível)';
          }
        }
      } catch (err) {
        console.error('Erro ao verificar slug:', err);
      }
    }, 500); // 500ms de espera

  } else {
    slugPreview.textContent = 'seu-estudio.cliquezoom.com.br';
    slugPreview.style.color = '#999';
  }
});

// ============================================================================
// FORM SUBMISSION
// ============================================================================

var form = document.getElementById('registerForm');
var submitBtn = document.getElementById('submitBtn');
var formError = document.getElementById('formError');
var successState = document.getElementById('successState');
var successSlug = document.getElementById('successSlug');

function showError(msg) {
  formError.textContent = msg;
  formError.style.display = 'block';
}

function hideError() {
  formError.style.display = 'none';
}

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  hideError();

  var name = document.getElementById('name').value.trim();
  var email = document.getElementById('email').value.trim();
  var orgName = document.getElementById('orgName').value.trim();
  var slug = document.getElementById('slug').value.trim();
  var password = document.getElementById('password').value;
  var confirmPassword = document.getElementById('confirmPassword').value;

  // Validacoes
  if (!name || !email || !orgName || !slug || !password) {
    showError('Preencha todos os campos.');
    return;
  }

  if (slug.length < 3) {
    showError('A URL deve ter pelo menos 3 caracteres.');
    return;
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    showError('A URL deve conter apenas letras minusculas, numeros e hifens.');
    return;
  }

  if (password.length < 6) {
    showError('A senha deve ter pelo menos 6 caracteres.');
    return;
  }

  if (password !== confirmPassword) {
    showError('As senhas nao conferem.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Criando conta...';

  try {
    var res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password, name: name, orgName: orgName, slug: slug })
    });

    var data = await res.json();

    if (res.ok && data.success) {
      form.style.display = 'none';
      form.nextElementSibling.style.display = 'none'; // form-footer
      document.getElementById('planSelected').style.display = 'none';
      successSlug.textContent = data.organizationSlug + '.cliquezoom.com.br';
      successState.style.display = 'block';
    } else {
      showError(data.error || 'Erro ao criar cadastro. Tente novamente.');
    }
  } catch (err) {
    showError('Erro de conexao. Verifique sua internet e tente novamente.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Criar Minha Conta';
  }
});

// ============================================================================
// SMOOTH SCROLL
// ============================================================================

document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
  anchor.addEventListener('click', function (e) {
    var href = this.getAttribute('href');
    var target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ============================================================================
// NAV SCROLL SHADOW
// ============================================================================

var nav = document.querySelector('.nav');
window.addEventListener('scroll', function () {
  if (window.scrollY > 10) {
    nav.style.boxShadow = '0 1px 8px rgba(0,0,0,0.06)';
  } else {
    nav.style.boxShadow = 'none';
  }
});
