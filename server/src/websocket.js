import { WebSocketServer } from 'ws';

let wss = null;

export function setupWebSocket(server) {
  wss = new WebSocketServer({ server });

  let connCount = 0;
  wss.on('connection', (ws) => {
    connCount++;
    if (connCount % 100 === 1) console.log('WebSocket connections (total this session):', connCount);
    ws.on('close', () => {});
  });

  return wss;
}

export function broadcast(type, data) {
  if (!wss) return;
  const message = JSON.stringify({ type, data });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}
