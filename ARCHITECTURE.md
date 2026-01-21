# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  (Web Browser, Mobile App, Test Clients)                    │
└─────────────────┬───────────────────────┬───────────────────┘
                  │                       │
         HTTP/REST│              WebSocket│/SSE
                  │                       │
┌─────────────────▼───────────────────────▼───────────────────┐
│                     Express Server                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ REST API     │  │ WebSocket    │  │ SSE          │      │
│  │ Routes       │  │ Server       │  │ Controller   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼───────┐    │
│  │           Business Logic Layer                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │    │
│  │  │ Match        │  │ Chat         │  │ Match    │ │    │
│  │  │ Controller   │  │ Manager      │  │ Simulator│ │    │
│  │  └──────┬───────┘  └──────┬───────┘  └────┬─────┘ │    │
│  └─────────┼──────────────────┼───────────────┼───────┘    │
└────────────┼──────────────────┼───────────────┼────────────┘
             │                  │               │
    ┌────────▼────────┐  ┌──────▼──────┐  ┌───▼────────┐
    │  Supabase DB    │  │  Redis      │  │ WebSocket  │
    │  (PostgreSQL)   │  │  Cache      │  │ Rooms      │
    └─────────────────┘  └─────────────┘  └────────────┘
```

## Component Breakdown

### 1. API Layer

**REST Controllers**
- Handle HTTP requests
- Validate input
- Format responses
- Error handling

**WebSocket Manager**
- Connection lifecycle management
- Room-based subscriptions
- Message routing
- Heartbeat mechanism

**SSE Controller**
- Long-lived HTTP connections
- Event stream management
- Client tracking

### 2. Business Logic Layer

**Match Simulator**
- Background service running on intervals
- Generates realistic match events
- Updates match state
- Broadcasts to all subscribers

**Chat Manager**
- Room management
- User tracking
- Message validation
- Rate limiting
- Typing indicators

**Models**
- Database abstraction
- Data validation
- Query builders

### 3. Data Layer

**Supabase (PostgreSQL)**
- Persistent storage
- Relational data
- ACID compliance

**Redis**
- Session storage (future)
- Rate limiting counters
- Cache layer (future)

**In-Memory State**
- Active WebSocket connections
- Chat room data
- Simulator state

## Data Flow

### Match Update Flow
```
Match Simulator (tick)
    ↓
Select Random Player from Team
    ↓
Generate Event → Save to DB (with player_id)
    ↓
Update Match State → Save to DB
    ↓
Update Statistics → Save to DB
    ↓
Broadcast via WebSocket → Room Subscribers
    ↓
Broadcast via SSE → SSE Clients
```

### Chat Message Flow
```
Client (WebSocket)
    ↓
WebSocket Manager → Route to Chat Manager
    ↓
Validate Message (length, rate limit)
    ↓
Store in Memory
    ↓
Broadcast to Room Members
```

### REST API Flow
```
Client HTTP Request
    ↓
Express Router → Controller
    ↓
Model → Database Query
    ↓
Format Response
    ↓
Send JSON Response
```

## Scaling Considerations

### Current Limitations (Single Instance)
- WebSocket connections tied to one server
- Chat messages in memory only
- No horizontal scaling

### Scaling Strategy

**Horizontal Scaling:**
1. Implement Redis Pub/Sub for cross-server communication
2. Store chat messages in Redis or database
3. Use sticky sessions or Redis-based session store
4. Implement message broker (RabbitMQ/Kafka)

**Vertical Scaling:**
- Increase server resources
- Optimize database queries
- Add database read replicas

**CDN Integration:**
- Serve static assets via CDN
- Cache API responses

## Security Considerations

### Current Implementation
- CORS enabled for all origins (development)
- No authentication
- Basic input validation
- Rate limiting on chat

### Production Recommendations
1. **Authentication**: Add JWT or session-based auth
2. **Authorization**: Role-based access control
3. **CORS**: Restrict to specific domains
4. **Rate Limiting**: API-level rate limiting
5. **Input Sanitization**: XSS prevention
6. **HTTPS**: Enforce TLS
7. **WebSocket Security**: Token-based auth

## Performance Optimization

### Database
- Indexes on frequently queried fields
- Connection pooling
- Query optimization
- Prepared statements

### Caching Strategy
- Redis cache for match data
- ETag support for API responses
- Browser caching headers

### WebSocket Optimization
- Efficient broadcast algorithm
- Message batching
- Compression (permessage-deflate)

### Memory Management
- Limit stored messages per room
- Connection cleanup on timeout
- Periodic garbage collection

## Error Handling

### Levels
1. **Application Errors**: Caught and logged
2. **Database Errors**: Graceful degradation
3. **Network Errors**: Retry logic
4. **Client Errors**: Validation messages

### Monitoring
- Error logging to console (dev)
- Production: Use Sentry, LogRocket, etc.
- Health check endpoint
- Connection metrics

## Technology Choices

### Why Node.js?
- Event-driven architecture
- Perfect for real-time applications
- Large ecosystem
- WebSocket support

### Why Express?
- Lightweight and flexible
- Large community
- Easy middleware integration

### Why ws Library?
- Pure WebSocket implementation
- Lightweight
- No Socket.io overhead

### Why Supabase?
- PostgreSQL backend
- Easy setup
- REST API included
- Real-time subscriptions (future)

### Why Redis?
- Fast in-memory operations
- Pub/Sub support
- Session storage
- Rate limiting
