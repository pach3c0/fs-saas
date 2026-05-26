# Skill: Desenvolvimento e Testes Locais (Workflow Seguro)

> Leia esta skill para aprender a clonar, rodar o CliqueZoom em sua máquina local de forma 100% segura, isolar o banco de dados e atualizar a VPS sem nenhum risco de derrubar clientes em produção.

---

## 🎯 POR QUE DESENVOLVER LOCALMENTE?
1. **Risco Zero:** Você pode cometer erros de sintaxe ou de lógica sem derrubar os sites dos clientes ativos na VPS.
2. **Reatividade Ultra Rápida:** O servidor local recarrega as alterações instantaneamente (`nodemon`), sem precisar de builds ou envios lentos.
3. **Isolamento de Dados:** Dados de teste e cadastros fictícios não se misturam com as fotos e dados reais dos clientes da plataforma.

---

## 💾 A ESTRATÉGIA DO BANCO DE DADOS

O banco de dados é separado de forma inteligente através do arquivo `.env` localizado na raiz do projeto.

### 1. Banco de Produção (VPS / Nuvem - MongoDB Atlas)
*   **Onde Fica:** Na nuvem ou na VPS de produção.
*   **Nome do Banco:** `cliquezoom` (Obrigatório! **Nunca** use `fsfotografias`).
*   **Regra de Ouro:** **NUNCA** aponte seu `.env` local para o banco de produção para fazer testes e cadastros fictícios.

### 2. Banco Local / Desenvolvimento (Sua Máquina)
Você tem duas opções profissionais para rodar seu banco de testes:

#### Opção A: MongoDB Atlas de Desenvolvimento (Recomendado)
Crie um banco de dados separado chamado `cliquezoom-dev` no painel do MongoDB Atlas e altere a conexão do seu arquivo `.env` local para ele:
```env
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/cliquezoom-dev
```

#### Opção B: MongoDB Local no Mac
Se você preferir rodar o MongoDB direto no seu Mac (via Homebrew ou Docker), use a URI padrão do localhost que já está configurada:
```env
MONGODB_URI=mongodb://localhost:27017/cliquezoom
```

---

## 🚀 PASSO A PASSO PARA INICIAR OS TESTES LOCAIS

Siga estas instruções passo a passo para rodar o app no seu computador:

### 1. Sincronize com a VPS (Git Pull)
Antes de começar qualquer ajuste, garanta que você tem a última versão que está rodando na VPS:
```bash
git pull origin main
```

### 2. Instale as Dependências
Garanta que todos os pacotes do projeto estão instalados localmente:
```bash
npm install
```

### 3. Inicie o Servidor Local
Execute o script de desenvolvimento que conta com atualização em tempo real (Nodemon):
```bash
npm run dev
```

### 4. Acesse no Navegador
Abra seu navegador e visualize o sistema rodando localmente no endereço:
👉 **`http://localhost:3051`**

*(Se precisar alterar a porta do servidor local, mude a variável `PORT=3051` no seu arquivo `.env`).*

---

## 📦 FLUXO DE DEPLOY SEGURO (MÁQUINA -> VPS)

Quando você terminar de desenvolver e validar localmente que todas as alterações funcionam 100% perfeitamente:

### 1. Compilar Classes do Tailwind (Se houver alterações visuais)
Sempre rode localmente o build do Tailwind antes do commit para atualizar os arquivos de estilos compilados:
```bash
npm run build:css
```

### 2. Salvar e Enviar para o Git
Envie as alterações seguras para o repositório compartilhado:
```bash
git add .
git commit -m "feat: descricao curta da melhoria ou ajuste"
git push origin main
```

### 3. Aplicar na VPS (Sem Quedas)
Conecte via SSH na VPS, vá até a pasta do projeto e execute os comandos:
```bash
# 1. Puxar o código testado e atualizado
git pull

# 2. Reiniciar o app sem indisponibilidade para os clientes (Zero-Downtime)
pm2 reload ecosystem.config.js --env production
```

Se quiser acompanhar se tudo subiu com sucesso na VPS, verifique os logs:
```bash
pm2 logs cliquezoom-saas --lines 30
```

---

## ⚠️ LEMBRETES IMPORTANTES DE CÓDIGO
*   **Padrão Auto-Save:** Nos formulários admin, garanta que suas alterações usem `oninput` ou `onchange` disparando diretamente `saveDados()`, sem botões extras de "Salvar".
*   **Uploads:** Os arquivos locais salvos em desenvolvimento vão para `/uploads/`. Não se preocupe se eles não aparecerem na VPS, o storage local é isolado.
