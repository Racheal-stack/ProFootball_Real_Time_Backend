import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { redis } from '../config/database.js';

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // clientId -> { ws, subscriptions: Set(), userId, lastPing }
    this.rooms = new Map(); // matchId -> Set of clientIds
    this.pingInterval = null;
  }

  initialize(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    
    this.wss.on('connection', (ws, req) => {
      const clientId = uuidv4();
      
      this.clients.set(clientId, {
        ws,
        subscriptions: new Set(),
        userId: null,
        lastPing: Date.now(),
      });

      console.log(`Client connected: ${clientId}`);

      // Send connection confirmation
      this.sendToClient(clientId, {
        type: 'connected',
        clientId,
        timestamp: new Date().toISOString(),
      });

      ws.on('message', (message) => {
        this.handleMessage(clientId, message);
      });

      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = Date.now();
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error.message);
      });
    });

    // Start heartbeat mechanism
    this.startHeartbeat();
    
    console.log('✓ WebSocket server initialized');
  }

  handleMessage(clientId, rawMessage) {
    try {
      const message = JSON.parse(rawMessage.toString());
      const client = this.clients.get(clientId);

      if (!client) return;

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, message.matchId);
          break;
        
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, message.matchId);
          break;
        
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
          break;
        
        default:
          this.sendToClient(clientId, {
            type: 'error',
            message: `Unknown message type: ${message.type}`,
          });
      }
    } catch (error) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format',
      });
    }
  }

  handleSubscribe(clientId, matchId) {
    if (!matchId) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Match ID is required for subscription',
      });
      return;
    }

    const client = this.clients.get(clientId);
    if (!client) return;

    // Add to client subscriptions
    client.subscriptions.add(matchId);

    // Add to room
    if (!this.rooms.has(matchId)) {
      this.rooms.set(matchId, new Set());
    }
    this.rooms.get(matchId).add(clientId);

    this.sendToClient(clientId, {
      type: 'subscribed',
      matchId,
      timestamp: new Date().toISOString(),
    });

    console.log(`Client ${clientId} subscribed to match ${matchId}`);
  }

  handleUnsubscribe(clientId, matchId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(matchId);

    const room = this.rooms.get(matchId);
    if (room) {
      room.delete(clientId);
      if (room.size === 0) {
        this.rooms.delete(matchId);
      }
    }

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      matchId,
      timestamp: new Date().toISOString(),
    });

    console.log(`Client ${clientId} unsubscribed from match ${matchId}`);
  }

  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all rooms
    client.subscriptions.forEach(matchId => {
      const room = this.rooms.get(matchId);
      if (room) {
        room.delete(clientId);
        if (room.size === 0) {
          this.rooms.delete(matchId);
        }
      }
    });

    this.clients.delete(clientId);
    console.log(`Client disconnected: ${clientId}`);
  }

  broadcastToMatch(matchId, data) {
    const room = this.rooms.get(matchId);
    if (!room || room.size === 0) return;

    const message = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
    });

    room.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === 1) { // OPEN
        client.ws.send(message);
      }
    });
  }

  broadcastToAll(data) {
    const message = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
    });

    this.clients.forEach(client => {
      if (client.ws.readyState === 1) {
        client.ws.send(message);
      }
    });
  }

  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== 1) return;

    client.ws.send(JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
    }));
  }

  startHeartbeat() {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      
      this.clients.forEach((client, clientId) => {
        if (client.ws.readyState === 1) {
          // Check if client hasn't responded in 30 seconds
          if (now - client.lastPing > 30000) {
            console.log(`Terminating inactive client: ${clientId}`);
            client.ws.terminate();
            this.handleDisconnect(clientId);
          } else {
            client.ws.ping();
          }
        }
      });
    }, 15000); // Every 15 seconds
  }

  getStats() {
    return {
      totalConnections: this.clients.size,
      activeRooms: this.rooms.size,
      roomDetails: Array.from(this.rooms.entries()).map(([matchId, clients]) => ({
        matchId,
        subscribers: clients.size,
      })),
    };
  }

  shutdown() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.clients.forEach((client, clientId) => {
      client.ws.close(1000, 'Server shutting down');
    });

    this.clients.clear();
    this.rooms.clear();
  }
}

export default new WebSocketManager();
