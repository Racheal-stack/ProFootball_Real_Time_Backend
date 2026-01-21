import MatchModel from '../models/Match.js';
import { errorResponse } from '../utils/response.js';

class SSEController {
  constructor() {
    this.clients = new Map(); // matchId -> Set of response objects
    this.eventSequences = new Map(); // matchId -> integer
    this.eventBuffer = new Map(); // matchId -> [{ id, data }]
    this.bufferSize = 100;
  }

  async streamMatchEvents(req, res) {
    const { id: matchId } = req.params;
    const lastEventIdHeader = req.headers['last-event-id'];
    const lastEventId = Number.isFinite(parseInt(lastEventIdHeader, 10))
      ? parseInt(lastEventIdHeader, 10)
      : null;

    // Verify match exists
    try {
      const match = await MatchModel.findById(matchId);
      if (!match) {
        return res.status(404).json(errorResponse('Match not found', 404));
      }
    } catch (error) {
      return res.status(500).json(errorResponse('Error verifying match'));
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.write('retry: 3000\n\n');

    // Send initial connection message
    this.sendSSE(res, {
      type: 'connected',
      matchId,
      message: 'Connected to match event stream',
    });

    // Add client to tracking
    if (!this.clients.has(matchId)) {
      this.clients.set(matchId, new Set());
    }
    this.clients.get(matchId).add(res);

    console.log(`SSE client connected to match ${matchId}`);

    // Replay buffered events if client reconnects
    if (lastEventId !== null) {
      const buffer = this.eventBuffer.get(matchId) || [];
      buffer
        .filter((entry) => entry.id > lastEventId)
        .forEach((entry) => {
          this.sendSSE(res, entry.data, { id: entry.id });
        });
    }

    // Send periodic heartbeat
    const heartbeatInterval = setInterval(() => {
      this.sendSSE(res, { type: 'heartbeat', timestamp: new Date().toISOString() });
    }, 30000);

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      
      const clients = this.clients.get(matchId);
      if (clients) {
        clients.delete(res);
        if (clients.size === 0) {
          this.clients.delete(matchId);
        }
      }
      
      console.log(`SSE client disconnected from match ${matchId}`);
    });
  }

  sendSSE(res, data, options = {}) {
    try {
      if (options.id !== undefined && options.id !== null) {
        res.write(`id: ${options.id}\n`);
      }
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('Error sending SSE:', error.message);
    }
  }

  getNextEventId(matchId) {
    const current = this.eventSequences.get(matchId) || 0;
    const next = current + 1;
    this.eventSequences.set(matchId, next);
    return next;
  }

  broadcastToMatch(matchId, eventData) {
    const clients = this.clients.get(matchId);
    if (!clients || clients.size === 0) return;

    const eventId = this.getNextEventId(matchId);
    const payload = {
      ...eventData,
      eventId,
    };

    if (!this.eventBuffer.has(matchId)) {
      this.eventBuffer.set(matchId, []);
    }

    const buffer = this.eventBuffer.get(matchId);
    buffer.push({ id: eventId, data: payload });
    if (buffer.length > this.bufferSize) {
      buffer.shift();
    }

    const deadClients = new Set();

    clients.forEach(res => {
      try {
        this.sendSSE(res, payload, { id: eventId });
      } catch (error) {
        deadClients.add(res);
      }
    });

    // Clean up dead connections
    deadClients.forEach(res => clients.delete(res));
    if (clients.size === 0) {
      this.clients.delete(matchId);
    }
  }

  getStats() {
    const stats = [];
    this.clients.forEach((clients, matchId) => {
      stats.push({
        matchId,
        connections: clients.size,
      });
    });
    return stats;
  }
}

export default new SSEController();
