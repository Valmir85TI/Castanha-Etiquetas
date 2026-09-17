# Sistema de Impressão de Etiquetas — Castanha

Sistema web para consulta de produtos e impressão de etiquetas de preço no **Supermercado Castanha**, integrado ao ERP **Bluesoft** e a impressoras térmicas **Zebra** (ZPL).

## Arquitetura

O projeto é dividido em duas partes, orquestradas via Docker:

- **`backend/`** — API em **FastAPI** (Python) responsável por:
  - Consultar produtos e preços na API do Bluesoft (Cosmos).
  - Montar e enviar os templates ZPL para as impressoras Zebra.
  - Autenticação simples da área de gerência (login/senha) para funções administrativas.
  - `agente_local.py`: um agente local (também empacotado como executável via PyInstaller) que roda na máquina com a impressora conectada, recebendo os comandos de impressão vindos do backend/frontend.

- **`frontend/`** — Interface em **React** (Vite), onde o operador busca o produto (por código de barras/EAN ou código interno) e dispara a impressão da etiqueta.

- **Docker / Docker Compose** — builda backend + frontend em uma única imagem (`Dockerfile`, `docker-compose.yml`), expondo a aplicação na porta `8090`.

## Funcionalidades

- Busca de produtos por código de barras (EAN/GTIN) ou código interno Bluesoft.
- Consulta de preço atual e preço a vigorar.
- Geração de etiquetas em ZPL (Zebra Programming Language) para impressão direta.
- Agente local de impressão para máquinas sem acesso direto à impressora pela rede do servidor.
- Área de gerência protegida por login para funções administrativas.

## Estrutura do projeto

```
backend/
  main.py                  # API FastAPI: consulta Bluesoft + geração/impressão de etiquetas ZPL
  agente_local.py          # Agente local de impressão (roda na máquina com a impressora)
  requirements.txt         # Dependências Python
  *.spec                   # Specs do PyInstaller (empacotamento do agente/sistema)
frontend/
  src/                     # Aplicação React (busca de produto, preview e impressão de etiqueta)
  package.json
Dockerfile
docker-compose.yml
```

## Configuração de credenciais

O backend depende de credenciais sensíveis (token da API Bluesoft, login/senha da área de gerência e a chave de assinatura de sessão), que **não** ficam no código-fonte:

1. Copie `backend/.env.example` para `backend/.env`.
2. Preencha `BLUESOFT_TOKEN`, `GERENCIA_USUARIO`, `GERENCIA_SENHA` e `SECRET_KEY` com os valores reais.

O arquivo `backend/.env` está no `.gitignore` e nunca deve ser commitado.

## Como executar

### Via Docker (recomendado)

```bash
docker compose up -d --build
```

O `docker-compose.yml` já carrega `backend/.env` automaticamente (via `env_file`).

A aplicação fica disponível em `http://localhost:8090` (documentação da API em `/docs`).

### Desenvolvimento local

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Agente local de impressão** (na máquina conectada à impressora Zebra):
```bash
cd backend
python agente_local.py
```

## Observação de segurança

Este é um repositório **privado**. As credenciais que antes estavam hardcoded em `backend/main.py` foram removidas do código e migradas para variáveis de ambiente (`backend/.env`, veja acima). Como esses valores já haviam sido enviados ao GitHub, o token Bluesoft, a senha da gerência e a `SECRET_KEY` antigos foram considerados comprometidos e devem ser rotacionados.
