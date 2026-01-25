#!/usr/bin/env node
/**
 * MongoDB Backup Script
 * Har kuni avtomatik backup yaratadi va log kanaliga yuboradi
 */

require("dotenv").config();
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { Telegraf } = require("telegraf");
const logger = require("./utils/logger");

const bot = new Telegraf(process.env.BOT_TOKEN);
const BACKUP_DIR = path.join(__dirname, "backups");
const MAX_BACKUPS = 7; // Keep last 7 days

async function createBackup() {
  try {
    console.log("🔄 Starting MongoDB backup...");

    // Create backup directory if not exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `backup-${timestamp}`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // Parse MongoDB URI
    const mongoUri = process.env.MONGODB_URI || process.env.DB_URL;
    if (!mongoUri) {
      throw new Error("MONGODB_URI not found in environment");
    }

    // Extract database name from URI
    const dbMatch = mongoUri.match(/\/([^/?]+)(\?|$)/);
    const dbName = dbMatch ? dbMatch[1] : "ramazonbot";

    console.log(`📦 Creating backup for database: ${dbName}`);

    // Run mongodump
    const dumpCommand = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;

    await new Promise((resolve, reject) => {
      exec(dumpCommand, (error, stdout, stderr) => {
        if (error) {
          console.error("❌ Backup error:", stderr);
          reject(error);
        } else {
          console.log("✅ Backup created successfully");
          resolve(stdout);
        }
      });
    });

    // Get backup size
    const backupSize = await getDirectorySize(backupPath);
    const sizeMB = (backupSize / 1024 / 1024).toFixed(2);

    // Compress backup
    const archiveName = `${backupName}.tar.gz`;
    const archivePath = path.join(BACKUP_DIR, archiveName);

    await new Promise((resolve, reject) => {
      const tarCommand = `tar -czf "${archivePath}" -C "${BACKUP_DIR}" "${backupName}"`;
      exec(tarCommand, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    // Remove uncompressed backup
    fs.rmSync(backupPath, { recursive: true, force: true });

    const archiveSize = fs.statSync(archivePath).size;
    const archiveSizeMB = (archiveSize / 1024 / 1024).toFixed(2);

    console.log(
      `📊 Backup size: ${sizeMB} MB (compressed: ${archiveSizeMB} MB)`
    );

    // Clean old backups
    await cleanOldBackups();

    // Send notification to log channel
    await sendBackupNotification(dbName, sizeMB, archiveSizeMB, backupName);

    console.log("✅ Backup completed successfully!");
    return { success: true, size: archiveSizeMB, name: archiveName };
  } catch (error) {
    console.error("❌ Backup failed:", error);
    await logger.logError(error, "MongoDB Backup Failed");
    throw error;
  }
}

async function getDirectorySize(dirPath) {
  let totalSize = 0;
  const files = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      totalSize += await getDirectorySize(filePath);
    } else {
      totalSize += fs.statSync(filePath).size;
    }
  }

  return totalSize;
}

async function cleanOldBackups() {
  try {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("backup-") && f.endsWith(".tar.gz"))
      .map((f) => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    // Keep only MAX_BACKUPS most recent
    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      console.log(`🗑️ Removing ${toDelete.length} old backup(s)`);

      toDelete.forEach((file) => {
        fs.unlinkSync(file.path);
        console.log(`   Deleted: ${file.name}`);
      });
    }
  } catch (error) {
    console.error("Error cleaning old backups:", error);
  }
}

async function sendBackupNotification(
  dbName,
  originalSize,
  compressedSize,
  backupName
) {
  try {
    const Settings = require("./models/Settings");
    const logChannel = await Settings.getSetting("log_channel", null);

    if (!logChannel) {
      console.log("⚠️ Log channel not configured, skipping notification");
      return;
    }

    const now = new Date();
    const message = `
🔐 <b>MongoDB Backup</b>

📊 Database: <code>${dbName}</code>
📅 Sana: ${now.toLocaleString("uz-UZ")}
📦 Original size: ${originalSize} MB
🗜️ Compressed: ${compressedSize} MB
📁 Fayl: <code>${backupName}.tar.gz</code>

✅ Backup muvaffaqiyatli yaratildi!
    `.trim();

    await bot.telegram.sendMessage(logChannel, message, {
      parse_mode: "HTML",
    });

    console.log("📨 Backup notification sent to log channel");
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

// Run backup
if (require.main === module) {
  createBackup()
    .then(() => {
      console.log("🎉 Backup process completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Backup process failed:", error);
      process.exit(1);
    });
}

module.exports = { createBackup };
