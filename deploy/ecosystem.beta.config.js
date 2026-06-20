// PM2 — instância CANARY/BETA do CliqueZoom (código novo, mesmo banco de produção).
// Roda VIZINHO da produção (cliquezoom-saas:3051), numa porta própria (3052).
// APP_ENV=beta liga as TRAVAS de segurança no código:
//   - src/utils/email.js  → NÃO envia e-mail real (registra como "suprimido" no EmailLog)
//   - src/server.js       → schedulers/automações DESLIGADOS
// 1 instância só (não precisa de cluster no beta; e schedulers já estão off).
module.exports = {
  apps: [{
    name: 'cliquezoom-beta',
    script: 'src/server.js',
    instances: 1,
    exec_mode: 'fork',
    wait_ready: true,
    listen_timeout: 15000,
    kill_timeout: 5000,
    env_production: {
      NODE_ENV: 'production',
      APP_ENV: 'beta',
      PORT: 3052
    }
  }]
};
