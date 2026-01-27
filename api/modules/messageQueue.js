const User = require("../models/User");
const { t } = require("../utils/translator");

/**
 * Telegram Rate Limits:
 * - 30 messages per second to different users
 * - 1 message per second to same user
 * - Recommended: 20-25 messages/sec for safety
 */

class MessageQueue {
  constructor(bot) {
    this.bot = bot;
    this.queue = [];
    this.isProcessing = false;
    this.stats = {
      total: 0,
      sent: 0,
      failed: 0,
      startTime: null,
      endTime: null,
    };

    // Rate limiting config
    this.messagesPerSecond = 25; // Safe limit
    this.messagesPerMinute = 1200; // 20 messages/sec * 60
    this.delayBetweenMessages = Math.ceil(1000 / this.messagesPerSecond); // ~40ms

    // Counters for rate limiting
    this.sentLastSecond = 0;
    this.sentLastMinute = 0;
    this.lastSecondReset = Date.now();
    this.lastMinuteReset = Date.now();

    // For persistent jobs
    this.activeJobs = new Map();
  }

  /**
   * Add message to queue
   */
  async addToQueue(userId, message, options = {}) {
    this.queue.push({
      userId,
      message,
      options,
      retries: 0,
      maxRetries: 3,
    });
  }

  /**
   * Send message to all users with filters
   */
  async sendBulkMessage(message, filters = {}, options = {}) {
    try {
      const jobId = `job_${Date.now()}`;
      console.log(`📨 Starting bulk message job: ${jobId}`);

      // Build query
      const query = { is_block: false };

      if (filters.language) {
        query.language = filters.language;
      }

      if (filters.hasJoinedChannel !== undefined) {
        query.hasJoinedChannel = filters.hasJoinedChannel;
      }

      // Get users
      const users = await User.find(query)
        .select("userId language")
        .maxTimeMS(30000);

      console.log(`👥 Found ${users.length} users matching filters`);

      // Add to queue
      this.stats.total = users.length;
      this.stats.sent = 0;
      this.stats.failed = 0;
      this.stats.startTime = Date.now();

      // Store job info
      this.activeJobs.set(jobId, {
        stats: this.stats,
        status: "processing",
        filters,
        message,
      });

      for (const user of users) {
        // Translate message if needed
        let translatedMessage = message;
        if (options.translate && user.language) {
          // If message has translation keys
          translatedMessage = t(user.language, message) || message;
        }

        await this.addToQueue(user.userId, translatedMessage, {
          ...options,
          parse_mode: options.parse_mode || "HTML",
        });
      }

      // Start processing
      if (!this.isProcessing) {
        this.startProcessing();
      }

      return {
        jobId,
        total: users.length,
        message: `Bulk message queued for ${users.length} users`,
      };
    } catch (error) {
      console.error("Error in sendBulkMessage:", error);
      // DO NOT throw - return error info instead
      return {
        jobId: null,
        total: 0,
        error: error.message,
        message: "Failed to queue bulk message",
      };
    }
  }

  /**
   * Start processing queue
   */
  async startProcessing() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    console.log("🚀 Message queue processing started");

    while (this.queue.length > 0) {
      // Check rate limits
      await this.checkRateLimits();

      const item = this.queue.shift();

      try {
        // Send message
        await this.bot.telegram.sendMessage(
          item.userId,
          item.message,
          item.options
        );

        this.stats.sent++;
        this.sentLastSecond++;
        this.sentLastMinute++;

        // Log progress every 100 messages
        if (this.stats.sent % 100 === 0) {
          const progress = ((this.stats.sent / this.stats.total) * 100).toFixed(
            1
          );
          const elapsed = Math.floor(
            (Date.now() - this.stats.startTime) / 1000
          );
          const rate = (this.stats.sent / elapsed).toFixed(1);
          console.log(
            `📊 Progress: ${this.stats.sent}/${this.stats.total} (${progress}%) | Rate: ${rate} msg/s | Failed: ${this.stats.failed}`
          );
        }

        // Small delay between messages
        await this.sleep(this.delayBetweenMessages);
      } catch (error) {
        this.stats.failed++;

        // Retry logic
        if (item.retries < item.maxRetries) {
          item.retries++;
          this.queue.push(item); // Re-add to queue
        } else {
          console.error(
            `Failed to send message to ${item.userId} after ${item.maxRetries} retries:`,
            error.message
          );
        }

        // If rate limit error, wait longer
        if (
          error.message.includes("429") ||
          error.message.includes("Too Many Requests")
        ) {
          console.warn("⚠️ Rate limit hit, waiting 5 seconds...");
          await this.sleep(5000);
        }
      }
    }

    this.stats.endTime = Date.now();
    this.isProcessing = false;

    // Calculate final stats
    const duration = Math.floor(
      (this.stats.endTime - this.stats.startTime) / 1000
    );
    const avgRate = (this.stats.sent / duration).toFixed(2);

    console.log("\n✅ Message queue completed!");
    console.log(`📊 Final Stats:`);
    console.log(`   Total: ${this.stats.total}`);
    console.log(`   Sent: ${this.stats.sent}`);
    console.log(`   Failed: ${this.stats.failed}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Avg Rate: ${avgRate} msg/s\n`);
  }

  /**
   * Check and enforce rate limits
   */
  async checkRateLimits() {
    const now = Date.now();

    // Reset per-second counter
    if (now - this.lastSecondReset >= 1000) {
      this.sentLastSecond = 0;
      this.lastSecondReset = now;
    }

    // Reset per-minute counter
    if (now - this.lastMinuteReset >= 60000) {
      this.sentLastMinute = 0;
      this.lastMinuteReset = now;
    }

    // Wait if limits reached
    if (this.sentLastSecond >= this.messagesPerSecond) {
      const waitTime = 1000 - (now - this.lastSecondReset);
      if (waitTime > 0) {
        await this.sleep(waitTime);
        this.sentLastSecond = 0;
        this.lastSecondReset = Date.now();
      }
    }

    if (this.sentLastMinute >= this.messagesPerMinute) {
      const waitTime = 60000 - (now - this.lastMinuteReset);
      if (waitTime > 0) {
        console.warn(
          `⏳ Minute limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`
        );
        await this.sleep(waitTime);
        this.sentLastMinute = 0;
        this.lastMinuteReset = Date.now();
      }
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId) {
    return this.activeJobs.get(jobId);
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      activeJobs: this.activeJobs.size,
    };
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Estimate completion time
   */
  estimateCompletion() {
    if (!this.stats.startTime || this.stats.sent === 0) {
      return null;
    }

    const elapsed = Date.now() - this.stats.startTime;
    const rate = this.stats.sent / (elapsed / 1000);
    const remaining = this.stats.total - this.stats.sent;
    const estimatedSeconds = Math.ceil(remaining / rate);

    return {
      remaining,
      estimatedSeconds,
      estimatedMinutes: Math.ceil(estimatedSeconds / 60),
      currentRate: rate.toFixed(2),
    };
  }
}

module.exports = MessageQueue;
