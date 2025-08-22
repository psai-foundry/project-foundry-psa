

/**
 * Enhanced Redis Configuration
 * Phase 2B-4: Queue Infrastructure Setup
 * 
 * Provides robust Redis connection with proper error handling,
 * connection pooling, and graceful recovery mechanisms
 */

import Redis, { RedisOptions } from 'ioredis';

export interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest: number;
  enableOfflineQueue: boolean;
  lazyConnect: boolean;
  keepAlive: number;
  commandTimeout: number;
  connectTimeout: number;
}

class RedisConnectionManager {
  private static instance: RedisConnectionManager;
  private redis: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): RedisConnectionManager {
    if (!RedisConnectionManager.instance) {
      RedisConnectionManager.instance = new RedisConnectionManager();
    }
    return RedisConnectionManager.instance;
  }

  private getRedisConfig(): RedisConnectionConfig {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    let config: RedisConnectionConfig = {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true,
      keepAlive: 30000,
      commandTimeout: 5000,
      connectTimeout: 10000,
    };

    // Parse Redis URL if provided
    if (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://')) {
      try {
        const url = new URL(redisUrl);
        config.host = url.hostname;
        config.port = parseInt(url.port) || 6379;
        if (url.password) config.password = url.password;
        if (url.pathname && url.pathname !== '/') {
          config.db = parseInt(url.pathname.slice(1)) || 0;
        }
      } catch (error) {
        console.error('[Redis] Invalid Redis URL, using defaults:', error);
      }
    }

    // Environment-specific overrides
    if (process.env.REDIS_HOST) config.host = process.env.REDIS_HOST;
    if (process.env.REDIS_PORT) config.port = parseInt(process.env.REDIS_PORT);
    if (process.env.REDIS_PASSWORD) config.password = process.env.REDIS_PASSWORD;
    if (process.env.REDIS_DB) config.db = parseInt(process.env.REDIS_DB);

    return config;
  }

  private createRedisOptions(config: RedisConnectionConfig): RedisOptions {
    return {
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      keyPrefix: config.keyPrefix,
      maxRetriesPerRequest: config.maxRetriesPerRequest,
      enableOfflineQueue: config.enableOfflineQueue,
      lazyConnect: config.lazyConnect,
      keepAlive: config.keepAlive,
      commandTimeout: config.commandTimeout,
      connectTimeout: config.connectTimeout,
      reconnectOnError: (err: Error) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
      },
    };
  }

  async connect(): Promise<Redis> {
    if (this.redis && this.isConnected) {
      return this.redis;
    }

    // Check if Redis is disabled via environment variable
    if (process.env.DISABLE_REDIS === 'true') {
      console.log('[Redis] Redis is disabled via DISABLE_REDIS environment variable');
      throw new Error('Redis is disabled');
    }

    const config = this.getRedisConfig();
    const redisOptions = this.createRedisOptions(config);

    console.log(`[Redis] Connecting to Redis at ${config.host}:${config.port}...`);

    try {
      this.redis = new Redis(redisOptions);
      this.setupEventHandlers(this.redis);
      
      await this.redis.connect();
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      console.log('[Redis] Connected successfully');
      return this.redis;

    } catch (error) {
      console.error('[Redis] Connection failed:', error);
      
      // For development environments, don't throw error to allow graceful degradation
      if (process.env.NODE_ENV === 'development' || process.env.REDIS_OPTIONAL === 'true') {
        console.log('[Redis] Operating in graceful degradation mode - Redis features disabled');
        return this.createMockRedis();
      }
      
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  private createMockRedis(): Redis {
    // Create a mock Redis instance that returns safe defaults
    const mockRedis = {
      ping: () => Promise.resolve('PONG'),
      get: () => Promise.resolve(null),
      set: () => Promise.resolve('OK'),
      del: () => Promise.resolve(0),
      exists: () => Promise.resolve(0),
      hget: () => Promise.resolve(null),
      hset: () => Promise.resolve(0),
      hgetall: () => Promise.resolve({}),
      keys: () => Promise.resolve([]),
      flushdb: () => Promise.resolve('OK'),
      quit: () => Promise.resolve('OK'),
      disconnect: () => Promise.resolve(),
      on: () => {},
      off: () => {},
      status: 'ready'
    } as any;
    
    this.redis = mockRedis;
    this.isConnected = false; // Keep false to indicate mock mode
    return mockRedis;
  }

  async getSubscriber(): Promise<Redis> {
    if (this.subscriber && this.subscriber.status === 'ready') {
      return this.subscriber;
    }

    // Check if Redis is disabled or in graceful degradation mode
    if (process.env.DISABLE_REDIS === 'true' || 
        (process.env.NODE_ENV === 'development' && process.env.REDIS_OPTIONAL === 'true')) {
      console.log('[Redis] Creating mock subscriber for graceful degradation');
      return this.createMockRedis();
    }

    try {
      const config = this.getRedisConfig();
      const redisOptions = this.createRedisOptions(config);

      console.log('[Redis] Creating subscriber connection...');

      this.subscriber = new Redis(redisOptions);
      this.setupEventHandlers(this.subscriber, 'subscriber');
      
      await this.subscriber.connect();
      console.log('[Redis] Subscriber connected successfully');
      
      return this.subscriber;
    } catch (error) {
      console.error('[Redis] Subscriber connection failed:', error);
      
      // Fall back to mock for graceful degradation
      if (process.env.NODE_ENV === 'development' || process.env.REDIS_OPTIONAL === 'true') {
        console.log('[Redis] Creating mock subscriber for graceful degradation');
        return this.createMockRedis();
      }
      
      throw error;
    }
  }

  private setupEventHandlers(redis: Redis, type: string = 'main') {
    redis.on('connect', () => {
      console.log(`[Redis] ${type} connection established`);
    });

    redis.on('ready', () => {
      console.log(`[Redis] ${type} connection ready`);
      if (type === 'main') {
        this.isConnected = true;
      }
    });

    redis.on('error', (error) => {
      console.error(`[Redis] ${type} connection error:`, error);
      if (type === 'main') {
        this.handleConnectionError(error);
      }
    });

    redis.on('close', () => {
      console.log(`[Redis] ${type} connection closed`);
      if (type === 'main') {
        this.isConnected = false;
      }
    });

    redis.on('reconnecting', (ms: number) => {
      console.log(`[Redis] ${type} reconnecting in ${ms}ms`);
    });

    redis.on('end', () => {
      console.log(`[Redis] ${type} connection ended`);
      if (type === 'main') {
        this.isConnected = false;
      }
    });
  }

  private handleConnectionError(error: Error) {
    this.isConnected = false;
    this.connectionAttempts++;

    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.error('[Redis] Max connection attempts reached, giving up');
      return;
    }

    // Exponential backoff reconnection
    const backoffTime = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
    console.log(`[Redis] Scheduling reconnection in ${backoffTime}ms (attempt ${this.connectionAttempts})`);

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(err => {
        console.error('[Redis] Reconnection failed:', err);
      });
    }, backoffTime);
  }

  async disconnect(): Promise<void> {
    console.log('[Redis] Disconnecting from Redis...');

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }

    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }

    this.isConnected = false;
    console.log('[Redis] Disconnected successfully');
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.redis || !this.isConnected) {
        await this.connect();
      }
      
      const result = await this.redis!.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('[Redis] Ping failed:', error);
      return false;
    }
  }

  getConnection(): Redis | null {
    return this.redis;
  }

  isReady(): boolean {
    return this.isConnected && this.redis !== null;
  }

  async waitForConnection(timeout: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    while (!this.isReady() && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return this.isReady();
  }
}

// Export singleton instance
export const redisConnectionManager = RedisConnectionManager.getInstance();

// Export convenience functions
export async function getRedisConnection(): Promise<Redis> {
  return await redisConnectionManager.connect();
}

export async function getRedisSubscriber(): Promise<Redis> {
  return await redisConnectionManager.getSubscriber();
}

export async function closeRedisConnections(): Promise<void> {
  return await redisConnectionManager.disconnect();
}

export default redisConnectionManager;
