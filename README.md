# 📸 FS FOTOGRAFIAS - Plataforma Fotográfica

Sistema completo de gestão de conteúdo para estúdio fotográfico com painel administrativo e site público.

## 🚀 Stack Tecnológico

- **Frontend**: HTML5, TailwindCSS, JavaScript Vanilla
- **Backend**: Node.js + Express.js
- **Database**: MongoDB Atlas
- **Deploy**: Vercel (Serverless Functions)
- **Storage**: Cloudinary (imagens em produção)

## 📁 Estrutura do Projeto

```
Site/
├── admin/           # Painel administrativo
├── api/             # Serverless functions (Vercel)
├── assets/          # Imagens estáticas
├── cliente/         # Galeria privada (futuro)
├── public/          # Site público
├── src/             # Código backend
│   ├── config/      # Configuração MongoDB
│   ├── data/        # Dados fallback
│   ├── helpers/     # Lógica de negócios
│   ├── models/      # Schemas Mongoose
│   └── routes/      # Rotas API REST
└── uploads/         # Upload local (dev)
```

## 🔧 Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/pach3c0/fs-fotografias.git
cd Site

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# 4. Inicie servidor local
npm start
```

## 🌐 Deploy

### Vercel (Produção)

```bash
# 1. Instale Vercel CLI
npm install -g vercel

# 2. Configure variáveis de ambiente no Vercel
vercel env add MONGODB_URI production
vercel env add CLOUDINARY_CLOUD_NAME production
vercel env add CLOUDINARY_API_KEY production
vercel env add CLOUDINARY_API_SECRET production
vercel env add ADMIN_PASSWORD production

# 3. Deploy
vercel --prod
```

## 📡 API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/site-data` | Retorna todos dados do site |
| `PUT` | `/api/site-data` | Salva dados no MongoDB |
| `POST` | `/api/admin/upload` | Upload de imagem (Cloudinary) |
| `POST` | `/api/admin/site-config` | Atualiza configurações |

## 🔐 Variáveis de Ambiente

```env
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# Cloudinary (obrigatório em produção)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Admin
ADMIN_PASSWORD=sua-senha-segura

# Ambiente
NODE_ENV=production
PORT=3050
```

## 📝 Uso

### Painel Admin
1. Acesse: `https://fsfotografias.com.br/admin`
2. Faça login com a senha configurada
3. Edite conteúdo: Hero, Sobre, Portfolio, Estúdio
4. Clique em "Salvar Dados"

### Site Público
- Acesse: `https://fsfotografias.com.br`
- Dados carregados automaticamente do MongoDB

## 🎯 Features

✅ CMS completo sem banco de dados local  
✅ Upload de imagens para Cloudinary  
✅ Preview ao vivo no admin  
✅ Modo manutenção (cortina)  
✅ Fallback em memória se MongoDB offline  
✅ Responsivo (mobile-first)  

## 📄 Licença

© 2026 FS FOTOGRAFIAS - Todos os direitos reservados
