import dotenv from 'dotenv';

dotenv.config();

export default {
  port: parseInt(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  
  simulator: {
    speed: parseInt(process.env.SIMULATOR_SPEED) || 1,
    concurrentMatches: parseInt(process.env.CONCURRENT_MATCHES) || 4,
  },
  
  chat: {
    maxMessageLength: 500,
    typingTimeout: 3000,
    rateLimit: {
      maxMessages: 10,
      windowMs: 60000,
    },
  },
};
