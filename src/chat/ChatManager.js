import { v4 as uuidv4 } from 'uuid';
import { redis } from '../config/database.js';
import WebSocketManager from '../websocket/WebSocketManager.js';
import config from '../config/index.js';

class ChatManager {
  constructor() {
    this.chatRooms = new Map(); // matchId -> { users: Map, messages: [], typingUsers: Set }
    this.userRateLimits = new Map(); // userId -> { count, resetTime }
    this.typingTimeouts = new Map(); // userId-matchId -> timeoutId
  }

  initialize() {
    // Extend WebSocket message handling for chat
    this.setupChatHandlers();
    console.log('✓ Chat manager initialized');
  }

  setupChatHandlers() {
    const originalHandleMessage = WebSocketManager.handleMessage.bind(WebSocketManager);
    const originalHandleDisconnect = WebSocketManager.handleDisconnect.bind(WebSocketManager);
    
    WebSocketManager.handleMessage = (clientId, rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        
        // Handle chat-specific messages
        switch (message.type) {
          case 'chat_join':
            this.handleJoinRoom(clientId, message);
            break;
          
          case 'chat_leave':
            this.handleLeaveRoom(clientId, message);
            break;
          
          case 'chat_message':
            void this.handleChatMessage(clientId, message);
            break;
          
          case 'typing_start':
            this.handleTypingStart(clientId, message);
            break;
          
          case 'typing_stop':
            this.handleTypingStop(clientId, message);
            break;
          
          default:
            // Pass to original handler for non-chat messages
            originalHandleMessage(clientId, rawMessage);
        }
      } catch (error) {
        WebSocketManager.sendToClient(clientId, {
          type: 'error',
          message: 'Invalid message format',
        });
      }
    };

    WebSocketManager.handleDisconnect = (clientId) => {
      this.handleClientDisconnect(clientId);
      originalHandleDisconnect(clientId);
    };
  }

  getRoomData(matchId) {
    if (!this.chatRooms.has(matchId)) {
      this.chatRooms.set(matchId, {
        users: new Map(), // userId -> { clientIds: Set, username }
        messages: [],
        typingUsers: new Set(),
      });
    }
    return this.chatRooms.get(matchId);
  }

  handleJoinRoom(clientId, message) {
    const { matchId, userId, username } = message;

    if (!matchId || !userId) {
      WebSocketManager.sendToClient(clientId, {
        type: 'error',
        message: 'Match ID and User ID are required',
      });
      return;
    }

    const room = this.getRoomData(matchId);
    const client = WebSocketManager.clients.get(clientId);
    
    if (!client) return;

    // Set user info on client
    client.userId = userId;

    // Handle user in room
    if (!room.users.has(userId)) {
      room.users.set(userId, {
        clientIds: new Set([clientId]),
        username: username || `User${userId.slice(0, 4)}`,
      });
    } else {
      // User already in room (multiple tabs)
      room.users.get(userId).clientIds.add(clientId);
    }

    // Send confirmation to user
    WebSocketManager.sendToClient(clientId, {
      type: 'chat_joined',
      matchId,
      userCount: room.users.size,
      recentMessages: room.messages.slice(-20),
    });

    // Broadcast user joined to others (only once per user, not per tab)
    if (room.users.get(userId).clientIds.size === 1) {
      this.broadcastToRoom(matchId, {
        type: 'user_joined',
        matchId,
        userId,
        username: room.users.get(userId).username,
        userCount: room.users.size,
      }, clientId);
    }

    console.log(`User ${userId} joined chat room ${matchId}`);
  }

  handleLeaveRoom(clientId, message) {
    const { matchId } = message;
    const client = WebSocketManager.clients.get(clientId);
    
    if (!client || !matchId) return;

    const room = this.chatRooms.get(matchId);
    if (!room) return;

    const userId = client.userId;
    if (!userId) return;

    const userData = room.users.get(userId);
    if (!userData) return;

    // Remove this client from user's client set
    userData.clientIds.delete(clientId);

    // If user has no more clients, remove from room
    if (userData.clientIds.size === 0) {
      room.users.delete(userId);
      
      // Broadcast user left
      this.broadcastToRoom(matchId, {
        type: 'user_left',
        matchId,
        userId,
        username: userData.username,
        userCount: room.users.size,
      });

      // Clean up typing status
      room.typingUsers.delete(userId);
      this.clearTypingTimeout(userId, matchId);
    }

    WebSocketManager.sendToClient(clientId, {
      type: 'chat_left',
      matchId,
    });

    console.log(`User ${userId} left chat room ${matchId}`);
  }

  async handleChatMessage(clientId, message) {
    const { matchId, content } = message;
    const client = WebSocketManager.clients.get(clientId);
    
    if (!client || !client.userId) {
      WebSocketManager.sendToClient(clientId, {
        type: 'error',
        message: 'You must join the chat room first',
      });
      return;
    }

    // Validate message
    const validation = await this.validateMessage(content, client.userId);
    if (!validation.valid) {
      WebSocketManager.sendToClient(clientId, {
        type: 'error',
        message: validation.error,
      });
      return;
    }

    const room = this.getRoomData(matchId);
    const userData = room.users.get(client.userId);
    
    if (!userData) {
      WebSocketManager.sendToClient(clientId, {
        type: 'error',
        message: 'You are not in this chat room',
      });
      return;
    }

    // Create message object
    const chatMessage = {
      id: uuidv4(),
      matchId,
      userId: client.userId,
      username: userData.username,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    // Store message (keep last 100)
    room.messages.push(chatMessage);
    if (room.messages.length > 100) {
      room.messages.shift();
    }

    // Clear typing indicator for this user
    room.typingUsers.delete(client.userId);
    this.clearTypingTimeout(client.userId, matchId);

    // Broadcast message to all users in room
    this.broadcastToRoom(matchId, {
      type: 'chat_message',
      data: chatMessage,
    });

    console.log(`Chat message in ${matchId} from ${userData.username}: ${content.substring(0, 50)}`);
  }

  async validateMessage(content, userId) {
    // Empty message check
    if (!content || content.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    // Length check
    if (content.length > config.chat.maxMessageLength) {
      return { 
        valid: false, 
        error: `Message too long (max ${config.chat.maxMessageLength} characters)` 
      };
    }

    // Rate limiting (Redis-backed with in-memory fallback)
    const maxMessages = config.chat.rateLimit.maxMessages;
    const windowMs = config.chat.rateLimit.windowMs;

    try {
      const key = `chat_rate:${userId}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, windowMs);
      }

      if (count > maxMessages) {
        return {
          valid: false,
          error: 'You are sending messages too quickly. Please slow down.',
        };
      }
    } catch (error) {
      const now = Date.now();
      const userLimit = this.userRateLimits.get(userId);

      if (!userLimit || now > userLimit.resetTime) {
        this.userRateLimits.set(userId, {
          count: 1,
          resetTime: now + windowMs,
        });
      } else {
        userLimit.count++;

        if (userLimit.count > maxMessages) {
          return {
            valid: false,
            error: 'You are sending messages too quickly. Please slow down.',
          };
        }
      }
    }

    return { valid: true };
  }

  handleClientDisconnect(clientId) {
    this.chatRooms.forEach((room, matchId) => {
      room.users.forEach((userData, userId) => {
        if (userData.clientIds.has(clientId)) {
          userData.clientIds.delete(clientId);

          if (userData.clientIds.size === 0) {
            room.users.delete(userId);

            this.broadcastToRoom(matchId, {
              type: 'user_left',
              matchId,
              userId,
              username: userData.username,
              userCount: room.users.size,
            });

            room.typingUsers.delete(userId);
            this.clearTypingTimeout(userId, matchId);
          }
        }
      });

      if (room.users.size === 0 && room.messages.length === 0 && room.typingUsers.size === 0) {
        this.chatRooms.delete(matchId);
      }
    });
  }

  handleTypingStart(clientId, message) {
    const { matchId } = message;
    const client = WebSocketManager.clients.get(clientId);
    
    if (!client || !client.userId) return;

    const room = this.getRoomData(matchId);
    const userData = room.users.get(client.userId);
    
    if (!userData) return;

    // Add to typing users
    room.typingUsers.add(client.userId);

    // Broadcast typing indicator
    this.broadcastToRoom(matchId, {
      type: 'typing_indicator',
      matchId,
      userId: client.userId,
      username: userData.username,
      isTyping: true,
    }, clientId);

    // Set timeout to auto-clear
    this.setTypingTimeout(client.userId, matchId);
  }

  handleTypingStop(clientId, message) {
    const { matchId } = message;
    const client = WebSocketManager.clients.get(clientId);
    
    if (!client || !client.userId) return;

    this.clearTyping(client.userId, matchId);
  }

  clearTyping(userId, matchId) {
    const room = this.chatRooms.get(matchId);
    if (!room) return;

    const userData = room.users.get(userId);
    if (!userData) return;

    room.typingUsers.delete(userId);
    this.clearTypingTimeout(userId, matchId);

    this.broadcastToRoom(matchId, {
      type: 'typing_indicator',
      matchId,
      userId,
      username: userData.username,
      isTyping: false,
    });
  }

  setTypingTimeout(userId, matchId) {
    const key = `${userId}-${matchId}`;
    this.clearTypingTimeout(userId, matchId);

    const timeoutId = setTimeout(() => {
      this.clearTyping(userId, matchId);
    }, config.chat.typingTimeout);

    this.typingTimeouts.set(key, timeoutId);
  }

  clearTypingTimeout(userId, matchId) {
    const key = `${userId}-${matchId}`;
    const timeoutId = this.typingTimeouts.get(key);
    
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.typingTimeouts.delete(key);
    }
  }

  broadcastToRoom(matchId, data, excludeClientId = null) {
    const room = this.chatRooms.get(matchId);
    if (!room) return;

    room.users.forEach((userData, userId) => {
      userData.clientIds.forEach(clientId => {
        if (clientId !== excludeClientId) {
          WebSocketManager.sendToClient(clientId, data);
        }
      });
    });
  }

  getRoomStats(matchId) {
    const room = this.chatRooms.get(matchId);
    if (!room) return null;

    return {
      userCount: room.users.size,
      messageCount: room.messages.length,
      typingCount: room.typingUsers.size,
    };
  }

  cleanup() {
    this.typingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.typingTimeouts.clear();
    this.chatRooms.clear();
    this.userRateLimits.clear();
  }
}

export default new ChatManager();
