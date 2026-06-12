// Reporter de erros JS do frontend → POST /api/client-error → aba Eventos do SaaS Admin.
// Script clássico (não module) para capturar inclusive erros de load dos ES modules.
// 100% defensivo: nunca pode quebrar a página que o inclui.
(function () {
  try {
    var SOURCE = (document.currentScript && document.currentScript.dataset.source) || 'frontend-admin';
    var MAX_REPORTS = 10;       // teto por carregamento de página
    var sent = 0;
    var vistos = {};            // dedupe por mensagem

    function report(message, stack) {
      try {
        if (sent >= MAX_REPORTS) return;
        message = String(message || '').slice(0, 500);
        if (!message || vistos[message]) return;
        // Ruído cross-origin (extensões/scripts de terceiros) sem stack útil
        if (message === 'Script error.' && !stack) return;
        vistos[message] = true;
        sent++;

        var payload = JSON.stringify({
          source: SOURCE,
          message: message,
          stack: stack ? String(stack).slice(0, 3000) : undefined,
          url: location.href,
          organizationId: localStorage.getItem('organizationId') || undefined
        });

        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/client-error', new Blob([payload], { type: 'application/json' }));
        } else {
          fetch('/api/client-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true
          }).catch(function () {});
        }
      } catch (e) { /* nunca propagar */ }
    }

    window.addEventListener('error', function (ev) {
      try {
        report(ev.message, ev.error && ev.error.stack);
      } catch (e) { /* noop */ }
    });

    window.addEventListener('unhandledrejection', function (ev) {
      try {
        var r = ev.reason;
        report(
          (r && r.message) ? r.message : 'Unhandled rejection: ' + String(r).slice(0, 200),
          r && r.stack
        );
      } catch (e) { /* noop */ }
    });
  } catch (e) { /* noop */ }
})();
