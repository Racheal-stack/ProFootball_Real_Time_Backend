import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import config from './index.js';

// Initialize Supabase client
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Initialize Redis client
export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('✓ Redis connected successfully');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

// Helper function to verify database connection
export async function verifyDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('✓ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('Supabase connection error:', error.message);
    return false;
  }
}
