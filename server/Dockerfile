FROM node:20-slim

WORKDIR /app

# Install dependencies for MCP servers
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy source code
COPY src/ ./src/
COPY .env.example ./.env.example

# Create data directory for SQLite
RUN mkdir -p data

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["node", "src/index.js"]
