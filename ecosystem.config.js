module.exports = {
  apps: [{
    name: 'cliquezoom-saas',
    script: 'src/server.js',
    instances: 2,
    exec_mode: 'cluster',
    wait_ready: true,
    listen_timeout: 15000,
    kill_timeout: 5000,
    env: {
      NODE_ENV: 'development',
      PORT: 3051
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3051
    }
  }]
};
