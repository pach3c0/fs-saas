/**
 * Cadastro - FS Fotografias SaaS
 * Logica do formulario de registro, FAQ, planos e navegacao
 */

// ============================================================================
// PLAN SELECTION
// ============================================================================

var selectedPlan = 'free';

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

window.clearPlan = function () {
  selectedPlan = 'free';
  document.getElementById('planSelected').style.display = 'none';
};

// ============================================================================
// SLUG SANITIZATION + PREVIEW
// ============================================================================

var slugInput = document.getElementById('slug');
var slugPreview = document.getElementById('slugPreview');

slugInput.addEventListener('input', function () {
  var value = this.value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-');
  this.value = value;

  if (value && value.length >= 2) {
    slugPreview.textContent = value + '.fsfotografias.com.br';
    slugPreview.style.color = '#2563eb';
  } else {
    slugPreview.textContent = 'seu-estudio.fsfotografias.com.br';
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
      successSlug.textContent = data.organizationSlug + '.fsfotografias.com.br';
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
// FAQ ACCORDION
// ============================================================================

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
