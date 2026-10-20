import { createClient } from 'redis';

let redisClient = null;

export const connectRedis = async () => {
  let errorLogged = false;

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: (retries) => (retries >= 2 ? false : 200)
      }
    });

    redisClient.on('error', (err) => {
      if (!errorLogged) {
        errorLogged = true;
        if (process.env.NODE_ENV === 'production') {
          console.error('Redis Error:', err.message);
        } else {
          console.log('Redis not available locally, using memory fallback');
        }
      }
      redisClient = null;
    });

    redisClient.on('connect', () => {
      console.log('Redis connected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    if (process.env.NODE_ENV === 'production' && !errorLogged) {
      console.error('Redis connection error:', error.message);
    } else if (!errorLogged) {
      console.log('Redis not available locally, skipping Redis features');
    }
    redisClient = null;
    return null;
  }
};

export const getRedisClient = () => {
  if (!redisClient || !redisClient.isReady) {
    return null;
  }
  return redisClient;
};

export const setCache = async (key, value, expireInSeconds = 3600) => {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const serializedValue = JSON.stringify(value);
    await client.setEx(key, expireInSeconds, serializedValue);
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
};

export const getCache = async (key) => {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

export const deleteCache = async (key) => {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
};

export const deleteCachePattern = async (pattern) => {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
    return true;
  } catch (error) {
    console.error('Cache pattern delete error:', error);
    return false;
  }
};
