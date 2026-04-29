FROM node:20-slim

RUN apt-get update && apt-get install -y curl python3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm install --workspaces

COPY . .

# Build the client
RUN cd client && npm run build

RUN chmod +x start.sh

ENV PORT=8080
ENV KKI_DATA_DIR=/tmp/data

EXPOSE 8080

CMD ["./start.sh"]
