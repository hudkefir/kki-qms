import { WebSocketServer } from 'ws';

let wss = null;

export function setupWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
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
