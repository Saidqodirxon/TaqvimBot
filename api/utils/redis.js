const Redis = require("ioredis");
const Settings = require("../models/Settings");
const logger = require("./logger");

class RedisCache {
  constructor() {
    this.client = null;
    this.isEnabled = false;
    this.isConnected = false;
  }

  async initialize() {
    try {
      // Check if Redis is enabled in settings
      this.isEnabled = await Settings.getSetting("redis_enabled", false);

      if (!this.isEnabled) {
        logger.info("Redis caching is disabled");
        return false;
      }

      const host = await Settings.getSetting("redis_host", "localhost");
      const port = await Settings.getSetting("redis_port", 6379);

      this.client = new Redis({
        host,
        port,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      await this.client.connect();

      this.client.on("connect", () => {
        this.isConnected = true;
        logger.info(`✅ Redis connected: ${host}:${port}`);
      });

      this.client.on("error", (err) => {
        this.isConnected = false;
        logger.error("Redis error:", err.message);
      });

      this.client.on("close", () => {
        this.isConnected = false;
        logger.warn("Redis connection closed");
      });

      return true;
    } catch (error) {
      logger.error("Redis initialization failed:", error.message);
      this.isEnabled = false;
      this.isConnected = false;
      return false;
    }
  }

  // Check if Redis is available
  isAvailable() {
    return this.isEnabled && this.isConnected && this.client;
  }

  // Get value from cache
  async get(key) {
    if (!this.isAvailable()) return null;

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis GET error for ${key}:`, error.message);
      return null;
    }
  }

  // Set value in cache with TTL
  async set(key, value, ttlSeconds = null) {
    if (!this.isAvailable()) return false;

    try {
      const serialized = JSON.stringify(value);

      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      return true;
    } catch (error) {
      logger.error(`Redis SET error for ${key}:`, error.message);
      return false;
    }
  }

  // Delete key from cache
  async del(key) {
    if (!this.isAvailable()) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for ${key}:`, error.message);
      return false;
    }
  }

  // Delete keys by pattern
  async delPattern(pattern) {
    if (!this.isAvailable()) return false;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error(`Redis DEL pattern error for ${pattern}:`, error.message);
      return false;
    }
  }

  // Get prayer times with cache
  async getPrayerTimes(latitude, longitude, date) {
    const key = `prayer:${latitude}:${longitude}:${date}`;
    let cached = await this.get(key);

    if (cached) {
      logger.info(`🎯 Cache HIT: ${key}`);
      return cached;
    }

    logger.info(`❌ Cache MISS: ${key}`);
    return null;
  }

  // Set prayer times cache
  async setPrayerTimes(latitude, longitude, date, data) {
    const key = `prayer:${latitude}:${longitude}:${date}`;
    const ttl = await Settings.getSetting("redis_ttl_prayer_times", 86400);
    return await this.set(key, data, ttl);
  }

  // Get location by ID with cache
  async getLocation(locationId) {
    const key = `location:${locationId}`;
    let cached = await this.get(key);

    if (cached) {
      logger.info(`🎯 Cache HIT: ${key}`);
      return cached;
    }

    logger.info(`❌ Cache MISS: ${key}`);
    return null;
  }

  // Set location cache
  async setLocation(locationId, data) {
    const key = `location:${locationId}`;
    const ttl = await Settings.getSetting("redis_ttl_locations", 604800);
    return await this.set(key, data, ttl);
  }

  // Get user data with cache
  async getUserData(userId) {
    const key = `user:${userId}`;
    let cached = await this.get(key);

    if (cached) {
      logger.info(`🎯 Cache HIT: ${key}`);
      return cached;
    }

    return null;
  }

  // Set user data cache
  async setUserData(userId, data) {
    const key = `user:${userId}`;
    const ttl = await Settings.getSetting("redis_ttl_user_data", 3600);
    return await this.set(key, data, ttl);
  }

  // Clear all user caches
  async clearUserCaches() {
    return await this.delPattern("user:*");
  }

  // Clear all prayer time caches
  async clearPrayerCaches() {
    return await this.delPattern("prayer:*");
  }

  // Clear all location caches
  async clearLocationCaches() {
    return await this.delPattern("location:*");
  }

  // Get cache statistics
  async getStats() {
    if (!this.isAvailable()) {
      return { enabled: false, connected: false };
    }

    try {
      const info = await this.client.info("stats");
      const dbsize = await this.client.dbsize();

      return {
        enabled: true,
        connected: true,
        keys: dbsize,
        info: info,
      };
    } catch (error) {
      logger.error("Redis stats error:", error.message);
      return { enabled: true, connected: false, error: error.message };
    }
  }

  // Close connection
  async close() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info("Redis connection closed");
    }
  }
}

// Singleton instance
const redisCache = new RedisCache();

module.exports = redisCache;
