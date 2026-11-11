# Dockerfile para rodar a Agenda da Autoescola na nuvem 24/7
FROM node:20-bookworm-slim

# Dependências para compilar módulos nativos (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Variáveis de ambiente para build e execução
ENV SKIP_ELECTRON_REBUILD=1 \
    PORT=3333 \
    DATA_DIR=/data

# Instalar dependências
COPY package*.json ./
RUN npm install --include=dev

# Copiar código do projeto
COPY . .

# Compilar aplicação (Frontend React + Servidor Node)
RUN npm run build

# Criar diretório do volume de dados
RUN mkdir -p /data

# Volume persistente para o banco SQLite e backups
VOLUME ["/data"]

EXPOSE 3333

CMD ["node", "out/main/server.js"]

