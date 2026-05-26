# OR's Download Studio

Site de download de vídeos do YouTube em MP4 (1080p e 720p).

---

## Como hospedar no Render (GRÁTIS)

### Passo 1 — Criar conta no GitHub
1. Acesse **github.com** e crie uma conta gratuita (se ainda não tiver)

### Passo 2 — Criar repositório
1. Clique em **"New repository"** (botão verde)
2. Nome: `ors-studio`
3. Deixe **público**
4. Clique em **"Create repository"**

### Passo 3 — Subir os arquivos
Você tem duas opções:

**Opção A — Pelo site do GitHub (mais fácil no celular):**
1. No repositório criado, clique em **"uploading an existing file"**
2. Arraste ou selecione TODOS os arquivos desta pasta
3. Clique em **"Commit changes"**

**Opção B — Pelo terminal (computador):**
```bash
cd ors-studio
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/SEU_USUARIO/ors-studio.git
git push -u origin main
```

### Passo 4 — Hospedar no Render
1. Acesse **render.com** e crie uma conta gratuita
2. Clique em **"New +"** → **"Web Service"**
3. Conecte sua conta do GitHub
4. Selecione o repositório **ors-studio**
5. Configure:
   - **Name:** ors-studio
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
6. Clique em **"Create Web Service"**
7. Aguarde ~2 minutos o deploy
8. Seu site estará em: `https://ors-studio.onrender.com`

---

## Estrutura do projeto

```
ors-studio/
├── public/
│   └── index.html      ← Frontend (design preto e branco)
├── src/
│   └── server.js       ← Backend Node.js
├── package.json
├── render.yaml
└── README.md
```

## Como funciona

1. Você cola o link do YouTube
2. O backend busca as informações do vídeo (título, thumbnail, canal)
3. O backend solicita o link de download via **Cobalt API** (serviço open-source)
4. O download passa pelo proxy do servidor para funcionar corretamente no celular
5. Se o Cobalt não estiver disponível, abre o Y2mate automaticamente com o vídeo já carregado

---

Desenvolvido por **OR's** — 2025
