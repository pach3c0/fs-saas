# [NOME DO PROJETO] — Instruções para o Assistente

> Copie este arquivo para a raiz do projeto como `CLAUDE.md` e preencha cada seção.
> Quanto mais completo, menos tokens gastos em exploração.

---

## PROJETO

[Descrição em 2-3 linhas: o que é, para quem é, qual problema resolve.]

Deploy: [VPS/Vercel/Railway/etc], domínio `[dominio.com]`, processo `[pm2/systemd/etc]`.

---

## REGRAS CRÍTICAS

[Liste aqui as regras que, se violadas, quebram o projeto. Exemplos:]

1. **[Frontend] JS = ES Modules** (`import/export`). Nunca `require()`.
2. **[Backend] JS = CommonJS** (`require/module.exports`). `package.json` tem `"type":"commonjs"`.
3. **Multi-tenancy:** toda rota filtra por `organizationId` (ou equivalente).
4. **Upload local** em `/uploads/`. Sem Cloudinary/S3.
5. **Fale em português** em mensagens, labels e comentários.

---

## ARQUITETURA

```
frontend/       # [Descreva: React, vanilla JS, etc]
backend/        # [Descreva: Express, Fastify, etc]
  src/
    routes/     # [Padrão de roteamento]
    models/     # [ORM/ODM usado]
    middleware/ # [Auth, validação, etc]
uploads/        # Arquivos estáticos locais
```

---

## DESIGN SYSTEM

[Cole aqui as CSS variables principais ou o link para o arquivo de tokens.]

```css
--bg: #fff;
--text: #000;
--accent: #0070f3;
--border: #e5e5e5;
```

Componentes padrão: `[botão, modal, toast — onde ficam e como usar]`

---

## MODELO DE DADOS (campos-chave)

```
[NomeDoModelo]: campo1, campo2, campo3
[OutroModelo]: campo1, campo2
```

---

## DEPLOY

```bash
# Comandos de deploy
git pull
npm install   # só se mudou package.json
[pm2 reload / systemctl restart / etc]
```

| O que mudou | Ação |
|---|---|
| Backend | pull + install + reload |
| Frontend sem build | pull (Nginx serve static) |
| CSS novo (Tailwind) | build local + commit + pull |

---

## PADRÕES DE CÓDIGO

| Tarefa | Como |
|---|---|
| Nova rota | `src/routes/X.js` + registrar em `server.js` |
| Novo modelo | Incluir `organizationId` + `timestamps: true` |
| Dados que aparecem no site público | [Qual rota/modelo usar] |
| Upload de imagem | [Utilitário e endpoint] |
| Notificação ao usuário | [Função padrão — ex: showToast()] |

---

## ERROS COMUNS — NÃO REINTRODUZIR

| Sintoma | Causa | Evitar |
|---|---|---|
| [Descreva o sintoma] | [Causa raiz] | [Como evitar] |

---

## SKILLS (ler sob demanda)

`skills/frontend.md` · `skills/backend.md` · `skills/banco-de-dados.md`

**Regra:** ao alterar área coberta por skill, atualizar a skill correspondente.
