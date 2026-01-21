# ProFootball - Real-Time Match Center Backend

A production-ready backend API for real-time football match updates, featuring WebSocket communication, Server-Sent Events (SSE), live match simulation, and chat functionality.

> **Quick Start:** New to the project? See [QUICKSTART.md](QUICKSTART.md) for a 5-minute setup guide!

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get up and running in 5 minutes
- **[SCHEMA.md](SCHEMA.md)** - Detailed database schema documentation
- **[TESTING.md](TESTING.md)** - How to test all features
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deploy to production
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design and architecture

## 🚀 Features

- **REST API** - Get match data and details
- **Real-time Updates** - WebSocket-based live match events
- **Event Streaming** - SSE endpoint for event streams
- **Match Simulator** - Automated simulation of 4 concurrent matches with realistic events
- **Chat Rooms** - Match-specific chat with typing indicators and rate limiting
- **Normalized Database** - 6-table schema with teams, players, matches, events, stats, and chat
- **Database Integration** - Supabase PostgreSQL backend
- **Redis Support** - In-memory data store for real-time features

## 📋 Prerequisites

- Node.js 18+ 
- Supabase account (for PostgreSQL database)
- Redis server (local or cloud)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd profootball-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=5000
NODE_ENV=development

SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

SIMULATOR_SPEED=1
CONCURRENT_MATCHES=4
```

4. Set up the database:
- Create a Supabase project at https://supabase.com
- In the SQL Editor, run `database/schema.sql` to create tables
- Then run `database/seed.sql` to populate teams and players
- See [SCHEMA.md](SCHEMA.md) for detailed database documentation

5. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## 📡 API Documentation

### REST Endpoints

#### Get All Matches
```
GET /api/matches
```

Response:
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "uuid",
      "homeTeam": "Manchester United",
      "awayTeam": "Liverpool",
      "score": { "home": 2, "away": 1 },
      "minute": 67,
      "status": "SECOND_HALF",
      "competition": "Premier League",
      "stadium": "Old Trafford"
    }
  ]
}
```

#### Get Match Details
```
GET /api/matches/:id
```

Response includes full match data with events and statistics.

#### Stream Match Events (SSE)
```
GET /api/matches/:id/events/stream
```

Server-Sent Events stream that pushes real-time match events.

### WebSocket Connection

Connect to: `ws://localhost:5000/ws`

#### Client → Server Events

**Subscribe to Match:**
```json
{
  "type": "subscribe",
  "matchId": "match-uuid"
}
```

**Unsubscribe from Match:**
```json
{
  "type": "unsubscribe",
  "matchId": "match-uuid"
}
```

**Join Chat Room:**
```json
{
  "type": "chat_join",
  "matchId": "match-uuid",
  "userId": "user-123",
  "username": "JohnDoe"
}
```

**Send Chat Message:**
```json
{
  "type": "chat_message",
  "matchId": "match-uuid",
  "content": "Great goal!"
}
```

**Typing Indicator:**
```json
{
  "type": "typing_start",
  "matchId": "match-uuid"
}
```

#### Server → Client Events

**Match Update:**
```json
{
  "type": "match_update",
  "updateType": "SCORE_UPDATE",
  "data": {
    "matchId": "uuid",
    "score": { "home": 2, "away": 1 },
    "minute": 67
  }
}
```

**Match Event:**
```json
{
  "type": "match_event",
  "data": {
    "matchId": "uuid",
    "event": {
      "type": "GOAL",
      "minute": 67,
      "team": "home",
      "playerName": "Rashford",
      "description": "⚽ GOAL! Rashford scores for Manchester United!"
    }
  }
}
```

**Chat Message:**
```json
{
  "type": "chat_message",
  "data": {
    "id": "msg-uuid",
    "userId": "user-123",
    "username": "JohnDoe",
    "content": "Great goal!",
    "timestamp": "2026-01-20T10:30:00Z"
  }
}
```

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Real-time**: WebSocket (ws library)
- **Database**: Supabase (PostgreSQL)
- **Cache**: Redis (ioredis)
- **Streaming**: Server-Sent Events (SSE)

### Project Structure
```
src/
├── config/          # Configuration and database setup
├── models/          # Database models (Match, Team, Player)
├── controllers/     # Request handlers
├── routes/          # API routes
├── websocket/       # WebSocket server management
├── chat/            # Chat room logic
├── simulator/       # Match simulation engine
└── utils/           # Helper functions

database/
├── schema.sql       # Database table definitions
└── seed.sql         # Initial data (teams & players)
```

### Key Components

**Match Simulator:**
- Simulates 4 concurrent matches
- Realistic event generation (goals, cards, fouls, etc.)
- Match progression: NOT_STARTED → FIRST_HALF → HALF_TIME → SECOND_HALF → FULL_TIME
- Events broadcast via both WebSocket and SSE

**WebSocket Manager:**
- Room-based subscriptions
- Heartbeat/ping-pong for connection health
- Automatic cleanup on disconnect
- Efficient broadcasting to subscribed clients only

**Chat Manager:**
- Match-specific chat rooms
- User tracking across multiple tabs
- Rate limiting (10 messages per minute)
- Typing indicators with auto-timeout
- Message validation

**SSE Controller:**
- Long-lived HTTP connections for event streaming
- Automatic reconnection support
- Heartbeat mechanism

## 🎯 Design Decisions

### Why WebSocket + SSE?
- **WebSocket**: Bidirectional communication for chat and subscriptions
- **SSE**: Simpler for one-way event streaming, better for HTTP/2

### Database Schema6 tables (teams, players, matches, events, statistics, chat)
- Foreign key relationships ensure data integrity
- Indexes on frequently queried fields
- Triggers for automatic timestamp updates
- **See [SCHEMA.md](SCHEMA.md) for complete schema documentation**
- Triggers for automatic timestamp updates

### Rate Limiting
- Per-user message throttling prevents spam
- 10 messages per 60-second window
- Configurable limits in config file

### Connection Management
- Heartbeat every 15 seconds
- Terminate inactive connections after 30 seconds
- Graceful cleanup on disconnect

## 🚢 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_key
REDIS_HOST=your_redis_host
REDIS_PORT=6379
```

### Recommended Platforms
- **Railway** - Easy deployment with WebSocket support
- **Render** - Good for Node.js apps with persistent connections
- **Fly.io** - Global edge deployment
- **DigitalOcean App Platform** - Managed container platform

### Deployment Checklist
- [ ] Set up production database on Supabase
- [ ] Configure Redis (use managed service like Redis Cloud)
- [ ] Set environment variables
- [ ] Enable CORS for your frontend domain
- [ ] Set up health check endpoint monitoring
- [ ] Configure logging/error tracking (e.g., Sentry)

## 🔍 Testing

### Test WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:5000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    matchId: 'your-match-id'
  }));
};

ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

### Test SSE Stream
```javascript
const eventSource = new EventSource('http://localhost:5000/api/matches/your-match-id/events/stream');

eventSource.onmessage = (event) => {
  console.log('Event:', JSON.parse(event.data));
};
```

## ⚠️ Known Limitations

1. **In-Memory Chat**: Chat messages are stored in memory and lost on restart. For production, implement Redis persistence or database storage.

2. **Simulator Reset**: When matches finish and new ones start, old match IDs become invalid. Frontend should handle this gracefully.

3. **No Authentication**: Current implementation has no auth. Add JWT or session-based auth for production.

4. **Single Instance**: WebSocket connections are tied to a single server instance. For horizontal scaling, implement Redis pub/sub or a message broker.

5. **No Persistence of Active Connections**: Connection state is lost on restart. Consider Redis for session persistence.

## 📊 Monitoring

Check server stats:
```bash
curl http://localhost:5000/api/health
```

WebSocket stats are logged to console periodically.

## 🤝 Contributing

This is a take-home assessment project. Modifications and improvements are welcome after submission.

## 📝 License

MIT

## 🆘 Support

For questions or issues, please open a GitHub issue or contact the repository owner.

---

Built with ❤️ for the ProFootball Backend Assessment
