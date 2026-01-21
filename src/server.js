import express from 'express';
import cors from 'cors';
import http from 'http';
import config from './config/index.js';
import { verifyDatabaseConnection } from './config/database.js';
import routes from './routes/index.js';
import WebSocketManager from './websocket/WebSocketManager.js';
import ChatManager from './chat/ChatManager.js';
import MatchSimulator from './simulator/MatchSimulator.js';
import SSEController from './controllers/sseController.js';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ProFootball API - Real-time Match Center',
    version: '1.0.0',
    endpoints: {
      matches: '/api/matches',
      matchById: '/api/matches/:id',
      eventStream: '/api/matches/:id/events/stream',
      websocket: 'ws://[host]/ws',
      health: '/api/health',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// Startup sequence
async function startServer() {
  try {
    console.log('🚀 Starting ProFootball API...\n');

    // Verify database connection
    console.log('Connecting to database...');
    const dbConnected = await verifyDatabaseConnection();
    if (!dbConnected && config.nodeEnv === 'production') {
      throw new Error('Database connection failed');
    }

    // Initialize WebSocket server
    console.log('Initializing WebSocket server...');
    WebSocketManager.initialize(server);

    // Initialize Chat Manager
    console.log('Initializing Chat Manager...');
    ChatManager.initialize();

    // Integrate SSE with simulator
    const originalBroadcastEvent = MatchSimulator.broadcastEvent.bind(MatchSimulator);
    const originalBroadcastMatchUpdate = MatchSimulator.broadcastMatchUpdate.bind(MatchSimulator);
    const originalBroadcastStatsUpdate = MatchSimulator.broadcastStatsUpdate.bind(MatchSimulator);

    MatchSimulator.broadcastEvent = (matchId, event, match) => {
      // Broadcast via WebSocket
      originalBroadcastEvent(matchId, event, match);

      // Also broadcast via SSE
      SSEController.broadcastToMatch(matchId, {
        type: 'match_event',
        data: {
          matchId,
          event: {
            type: event.type,
            minute: event.minute,
            team: event.team,
            playerId: event.playerId,
            playerName: event.playerName,
            description: event.description,
          },
          currentScore: {
            home: match.homeScore,
            away: match.awayScore,
          },
        },
      });
    };

    MatchSimulator.broadcastMatchUpdate = (matchId, match, updateType) => {
      originalBroadcastMatchUpdate(matchId, match, updateType);

      SSEController.broadcastToMatch(matchId, {
        type: 'match_update',
        updateType,
        data: {
          matchId,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          score: {
            home: match.homeScore,
            away: match.awayScore,
          },
          minute: match.minute,
          status: match.status,
        },
      });
    };

    MatchSimulator.broadcastStatsUpdate = (matchId, stats) => {
      const formattedStats = originalBroadcastStatsUpdate(matchId, stats);

      if (formattedStats) {
        SSEController.broadcastToMatch(matchId, {
          type: 'stats_update',
          data: formattedStats,
        });
      }
    };

    // Start match simulator
    console.log('Starting match simulator...');
    await MatchSimulator.start();

    // Start HTTP server
    server.listen(config.port, () => {
      console.log('\n✅ Server is running!');
      console.log(`📍 HTTP API: http://localhost:${config.port}`);
      console.log(`🔌 WebSocket: ws://localhost:${config.port}/ws`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`\n📖 API Documentation: http://localhost:${config.port}/\n`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  console.log('\n🛑 Shutting down gracefully...');
  
  MatchSimulator.stop();
  WebSocketManager.shutdown();
  ChatManager.cleanup();
  
  server.close(() => {
    console.log('✓ Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
}

// Start the server
startServer();
