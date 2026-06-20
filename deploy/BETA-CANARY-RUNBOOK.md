# Runbook — Ambiente CANARY/BETA do CliqueZoom

Objetivo: rodar o **código novo** em produção real, acessível só por quem souber a URL `beta.`,
enquanto `app.cliquezoom.com.br` (Flávia) segue no código atual. Mesmo banco de produção; a
segurança vem do **isolamento multi-tenant** (org de teste = dados isolados) + das travas `APP_ENV=beta`.

> Pré-requisito de segurança já validado em 2026-06-19: o lote de mudanças é **aditivo** (sem
> migração destrutiva), então canary-no-mesmo-banco é seguro. Reauditar se entrar migração destrutiva.

---

## 0. Antes de tudo — VOCÊ precisa fazer

- [ ] **DNS (no seu provedor):** criar registro **A wildcard** `*.beta.cliquezoom.com.br` → `5.189.174.18`
      e também `beta.cliquezoom.com.br` → `5.189.174.18`. (Wildcard porque o cliente/site público
      resolve por subdomínio: `<slug>.beta.cliquezoom.com.br`.)
- [ ] **Commit + push do código novo** — o canary faz deploy do git. O trabalho de Sessões está
      no working tree, não commitado. Decidir o que entra (NÃO `git add -A` às cegas — árvore
      compartilhada). Sem isso, o beta sobe sem as mudanças.

## 1. Clonar o app para a pasta beta (na VPS)
```
cp -a /var/www/cz-saas /var/www/cz-saas-beta
# O beta roda a branch 'beta' (prod fica na 'main', intocada):
cd /var/www/cz-saas-beta && git fetch origin && git checkout beta && git pull
```

## 2. .env do beta
```
# Use deploy/.env.beta.example como base. O essencial:
#   APP_ENV=beta · PORT=3052 · BASE_DOMAIN=beta.cliquezoom.com.br
#   MONGODB_URI = a MESMA da produção  · demais segredos = iguais aos da prod
```

## 3. Compartilhar a pasta de uploads (mesmo banco → mesmos arquivos)
```
# Evita "foto não encontrada" quando um org é acessado nos dois ambientes (ex.: Flávia opt-in).
rm -rf /var/www/cz-saas-beta/uploads
ln -s /var/www/cz-saas/uploads /var/www/cz-saas-beta/uploads
```

## 4. Subir a instância beta no PM2 (porta 3052)
```
cd /var/www/cz-saas-beta
pm2 start deploy/ecosystem.beta.config.js --env production
pm2 logs cliquezoom-beta --lines 20    # checar "Ambiente beta: schedulers DESLIGADOS"
```

## 5. Nginx + SSL (wildcard)
```
cp deploy/nginx-beta.conf /etc/nginx/sites-available/cliquezoom-beta
ln -s /etc/nginx/sites-available/cliquezoom-beta /etc/nginx/sites-enabled/
# Cert wildcard exige desafio DNS-01:
certbot certonly --manual --preferred-challenges dns -d 'beta.cliquezoom.com.br' -d '*.beta.cliquezoom.com.br'
# (descomentar as linhas ssl_certificate no conf), depois:
nginx -t && systemctl reload nginx
```

## 6. Criar o ORG DE TESTE em produção
- Acesse `https://beta.cliquezoom.com.br/admin` → registre um fotógrafo novo (ex.: slug `beta-teste`).
- Como é o mesmo banco, esse org existe em prod, mas **isolado**: ações dele não tocam a Flávia.
- Rode os testes reais aqui (criar sessão, upload, wizard, cliente seleciona/baixa…).

## 7. (Opcional, fase 2) Flávia testando o código novo com os dados dela
- Só quando estiver confiante. Ela acessa `https://beta.cliquezoom.com.br/admin` e loga com a
  conta real → código novo + dados reais dela (uploads compartilhados via symlink do passo 3).

## 8. Promover para produção (quando aprovado)
```
# Promoção = trazer a branch beta para a main, depois deploy normal de prod:
git checkout main && git merge beta && git push origin main
cd /var/www/cz-saas && git pull && pm2 reload ecosystem.config.js --env production --update-env
# Depois pode parar o beta:  pm2 stop cliquezoom-beta   (ou deixar de pé pro próximo ciclo)
```

---

## Rollback
- O beta é descartável: `pm2 delete cliquezoom-beta` + remover o symlink do Nginx + `nginx -s reload`.
- Produção nunca foi tocada até o passo 8.

## Travas de segurança ativas no beta (código)
- E-mail: `src/utils/email.js` — `APP_ENV=beta` suprime envio real (registra no EmailLog).
- Schedulers: `src/server.js` — `APP_ENV=beta` não sobe nenhuma automação.
