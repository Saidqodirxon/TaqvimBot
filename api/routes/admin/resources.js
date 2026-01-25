const logger = require("../../utils/logger");
const express = require("express");
const router = express.Router();
const adminAuth = require("../../middleware/adminAuth");
const os = require("os");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

/**
 * Get system resource usage
 */
router.get("/", adminAuth, async (req, res) => {
  try {
    // CPU Information
    const cpus = os.cpus();
    const cpuModel = cpus[0].model;
    const cpuCores = cpus.length;

    // Calculate CPU usage
    const cpuUsage =
      cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b);
        const idle = cpu.times.idle;
        return acc + (1 - idle / total) * 100;
      }, 0) / cpus.length;

    // Memory Information
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    // System Uptime
    const systemUptime = os.uptime();
    const uptimeDays = Math.floor(systemUptime / 86400);
    const uptimeHours = Math.floor((systemUptime % 86400) / 3600);
    const uptimeMinutes = Math.floor((systemUptime % 3600) / 60);

    // Process Memory (Node.js)
    const processMemory = process.memoryUsage();

    // Disk Usage (Linux/Unix only)
    let diskUsage = null;
    if (process.platform !== "win32") {
      try {
        const { stdout } = await execPromise("df -h / | tail -1");
        const parts = stdout.trim().split(/\s+/);
        diskUsage = {
          total: parts[1],
          used: parts[2],
          available: parts[3],
          usagePercent: parseFloat(parts[4]),
        };
      } catch (error) {
        console.error("Disk usage error:", error);
      }
    }

    // Node.js Process Info
    const nodeVersion = process.version;
    const processUptime = process.uptime();

    res.json({
      cpu: {
        model: cpuModel,
        cores: cpuCores,
        usage: cpuUsage.toFixed(2),
        loadAverage: os.loadavg(),
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usagePercent: memoryUsagePercent.toFixed(2),
        totalGB: (totalMemory / 1024 / 1024 / 1024).toFixed(2),
        usedGB: (usedMemory / 1024 / 1024 / 1024).toFixed(2),
        freeGB: (freeMemory / 1024 / 1024 / 1024).toFixed(2),
      },
      process: {
        memory: {
          rss: processMemory.rss,
          heapTotal: processMemory.heapTotal,
          heapUsed: processMemory.heapUsed,
          external: processMemory.external,
          rssMB: (processMemory.rss / 1024 / 1024).toFixed(2),
          heapUsedMB: (processMemory.heapUsed / 1024 / 1024).toFixed(2),
        },
        uptime: processUptime,
        uptimeFormatted: formatUptime(processUptime),
      },
      system: {
        platform: os.platform(),
        hostname: os.hostname(),
        nodeVersion,
        uptime: systemUptime,
        uptimeFormatted: `${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m`,
      },
      disk: diskUsage,
    });
  } catch (error) {
    logger.error("Get resources error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/**
 * Get MongoDB statistics
 */
router.get("/mongodb", adminAuth, async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(503).json({ error: "Database not connected" });
    }

    // Get database stats
    const stats = await db.stats();

    // Get collection stats
    const collections = await db.listCollections().toArray();
    const collectionStats = await Promise.all(
      collections.map(async (col) => {
        try {
          const colStats = await db.collection(col.name).stats();
          return {
            name: col.name,
            count: colStats.count || 0,
            size: colStats.size || 0,
            sizeMB: ((colStats.size || 0) / 1024 / 1024).toFixed(2),
            avgObjSize: colStats.avgObjSize || 0,
            storageSize: colStats.storageSize || 0,
            storageSizeMB: ((colStats.storageSize || 0) / 1024 / 1024).toFixed(
              2
            ),
            indexes: colStats.nindexes || 0,
          };
        } catch (error) {
          console.error(`Stats error for ${col.name}:`, error.message);
          return {
            name: col.name,
            count: 0,
            size: 0,
            sizeMB: "0.00",
            avgObjSize: 0,
            storageSize: 0,
            storageSizeMB: "0.00",
            indexes: 0,
            error: error.message,
          };
        }
      })
    );

    res.json({
      database: {
        name: db.databaseName,
        collections: stats.collections || 0,
        dataSize: stats.dataSize || 0,
        storageSize: stats.storageSize || 0,
        indexes: stats.indexes || 0,
        indexSize: stats.indexSize || 0,
        dataSizeMB: ((stats.dataSize || 0) / 1024 / 1024).toFixed(2),
        storageSizeMB: ((stats.storageSize || 0) / 1024 / 1024).toFixed(2),
        indexSizeMB: ((stats.indexSize || 0) / 1024 / 1024).toFixed(2),
      },
      collections: collectionStats,
    });
  } catch (error) {
    logger.error("Get MongoDB stats error:", error);
    res.status(500).json({ error: "Server xatosi", details: error.message });
  }
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

module.exports = router;
