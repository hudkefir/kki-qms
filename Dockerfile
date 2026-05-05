FROM node:20-slim

RUN apt-get update && apt-get install -y curl git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm install --workspaces

COPY . .

# Generate version.json with git commit hash and build timestamp
RUN echo "{\"commit\":\"$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')\",\"buildTime\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > version.json

# Build the client
RUN cd client && npm run build

RUN chmod +x start.sh

ENV PORT=8080

EXPOSE 8080

CMD ["./start.sh"]
