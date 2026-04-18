# Skill 6.0 — Domínio e DNS (CliqueZoom)

## Registrador

Domínio `cliquezoom.com.br` registrado na **Hostinger** (hpanel.hostinger.com).

---

## IP da VPS

```
5.189.174.18
```

---

## Registros DNS atuais (Hostinger)

| Tipo  | Nome    | Conteúdo              | TTL   |
|-------|---------|-----------------------|-------|
| CNAME | www     | cliquezoom.com.br     | 3600  |
| A     | @       | 5.189.174.18          | 3600  |
| A     | `*`     | 5.189.174.18          | 3600  |
| A     | erp     | 5.189.174.18          | 300   |
| A     | crm     | 5.189.174.18          | 3600  |
| A     | license | 5.189.174.18          | 300   |
| A     | hub     | 5.189.174.18          | 14400 |

O wildcard `*` faz `slug.cliquezoom.com.br` apontar para a VPS para qualquer slug. ✅ Configurado em 2026-04-18.

---

## Nginx na VPS — bloco para subdomínios de fotógrafos

✅ Configurado em 2026-04-18. Arquivo: `/etc/nginx/sites-enabled/cliquezoom-slugs`

```nginx
server {
    listen 80;
    server_name *.cliquezoom.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name *.cliquezoom.com.br;

    ssl_certificate /etc/letsencrypt/live/cliquezoom.com.br-0001/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cliquezoom.com.br-0001/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 50M;

    location /uploads/ {
        alias /var/www/cz-saas/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    location /assets/ {
        alias /var/www/cz-saas/assets/;
        expires 30d;
    }
    location / {
        proxy_pass http://127.0.0.1:3051;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> **CRÍTICO:** `proxy_set_header Host $host;` — sem isso o Node recebe `localhost`
> como hostname e o middleware `tenant.js` não consegue extrair o slug.

**Certificado SSL wildcard:** `cliquezoom.com.br-0001` (cobre `*.cliquezoom.com.br` + `cliquezoom.com.br`).
Emitido via `certbot --manual --preferred-challenges dns`. **Renovação NÃO é automática** — renovar manualmente antes de 2026-07-17 repetindo o mesmo comando e adicionando novo TXT na Hostinger.

---

## Como o tenant é resolvido no backend

`src/middleware/tenant.js` extrai o slug do subdomínio:

```
joao.cliquezoom.com.br → slug = "joao"
cliquezoom.com.br      → slug = OWNER_SLUG (env, padrão "fs")
```

Variáveis de ambiente relevantes:
- `BASE_DOMAIN` — domínio base (padrão: `cliquezoom.com.br`)
- `OWNER_SLUG` — slug do dono da plataforma (padrão: `fs`)
- `SERVER_IP` — IP exibido nas instruções de domínio customizado (padrão: `5.189.174.18`)

---

## URL pública do site de cada fotógrafo

```
https://slug.cliquezoom.com.br/site
```

O admin gera essa URL nos botões "Ver Site" e "Copiar Link" da tab Meu Site
(`admin/js/tabs/meu-site.js`).

Em desenvolvimento local usa `?_tenant=slug` como fallback.

---

## Domínio customizado (fotógrafo com domínio próprio)

Gerenciado pela tab **Domínio** no admin (`admin/js/tabs/dominio.js`).

Fluxo:
1. Fotógrafo cadastra domínio (ex: `www.joaofoto.com.br`) via admin
2. Backend salva em `Organization.customDomain` com `domainStatus: 'pending'`
3. Fotógrafo configura registro A no registrador apontando para `5.189.174.18`
4. Clica em "Verificar DNS" → backend verifica com `src/utils/dnsVerifier.js`
5. Se válido: `domainStatus: 'verified'` + gera SSL via `src/scripts/generate-ssl.sh`

**Nota:** O Nginx precisa de bloco adicional para cada domínio customizado verificado
(gerado automaticamente pelo script `generate-ssl.sh`).

---

## Endereços de email da plataforma (Hostinger)

> Configurados no painel Hostinger junto ao domínio `cliquezoom.com.br`.

<!-- PREENCHER: listar aqui os endereços de email que existem na conta Hostinger -->

---

## Checklist para ativar subdomínios de fotógrafos

- [x] Adicionar registro A wildcard `*` → `5.189.174.18` na Hostinger
- [x] Emitir certificado SSL wildcard (`cliquezoom.com.br-0001`) via certbot DNS challenge
- [x] Criar e ativar bloco Nginx `cliquezoom-slugs` na VPS (HTTP redirect + HTTPS proxy)
- [x] `server.js`: redirecionar `*.cliquezoom.com.br/` → `/site` automaticamente
- [x] `meu-site.js`: botão "Ver Site" gera URL com subdomínio em produção
- [x] Testar: `https://soraia.cliquezoom.com.br` → abre site do fotógrafo

## Renovação do certificado wildcard

O certificado expira em **2026-07-17**. Renovar manualmente antes dessa data:

```bash
certbot certonly --manual --preferred-challenges dns \
  -d "*.cliquezoom.com.br" -d "cliquezoom.com.br" \
  --agree-tos --email pacheco@rhynoproject.com.br
```

Adicionar TXT `_acme-challenge` na Hostinger quando solicitado, aguardar propagação, confirmar.




README                    erp.cliquezoom.com.br      license.cliquezoom.com.br
app.fsfotografias.com.br  fsfotografias.com.br       saas.fsfotografias.com.br
cliquezoom.com.br         fsfotografias.com.br-0001
crm.cliquezoom.com.br     hub.cliquezoom.com.br
