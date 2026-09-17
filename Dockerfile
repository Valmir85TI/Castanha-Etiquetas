# Estágio 1: Build do Frontend (Node.js)
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Estágio 2: Setup do Backend e Deploy (Python)
FROM python:3.11-slim
WORKDIR /app

# Instalar dependências essenciais e o CUPS (caso a Zebra precise via Linux, embora suporte socket direto agora)
RUN apt-get update && apt-get install -y libcups2-dev gcc && rm -rf /var/lib/apt/lists/*

# Copiar dependências do backend
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copiar código do backend
COPY backend/ ./backend/

# Copiar o build estático do frontend para o local esperado pelo backend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY --from=frontend-builder /app/frontend/public ./frontend/public

# Expor a porta 8080 (já que a 8000 está ocupada no seu servidor)
EXPOSE 8080

# Definir o comando de inicialização
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8090"]
