#!/usr/bin/env node
/**
 * MongoDB Backup Script
 * Har kuni avtomatik backup yaratadi va log kanaliga yuboradi
 * Mongoose-based JSON backup (cross-platform, no mongodump required)
 */

require("dotenv").config();

// Set timezone to Uzbekistan
process.env.TZ = "Asia/Tashkent";

const fs = require("fs");
const path = require("path");
const { Telegraf } = require("telegraf");
const logger = require("../../utils/logger");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const archiver = require("archiver");

const bot = new Telegraf(process.env.BOT_TOKEN);
const BACKUP_DIR = path.join(__dirname, "../../backups");
const MAX_BACKUPS = 7; // Keep last 7 days

async function createBackup() {
  let isConnected = false;
  try {
    console.log("🔄 Starting MongoDB backup...");

    // Create backup directory if not exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = moment()
      .tz("Asia/Tashkent")
      .format("YYYY-MM-DD-HH-mm-ss");
    const backupName = `backup-${timestamp}`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // Create backup directory
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.DB_URL;
    if (!mongoUri) {
      throw new Error("MONGODB_URI not found in environment");
    }

    console.log("📦 Connecting to database...");
    await mongoose.connect(mongoUri);
    isConnected = true;

    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    console.log(`📊 Database: ${dbName}`);

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`📁 Found ${collections.length} collections`);

    let totalDocs = 0;
    let totalSize = 0;

    // Export each collection to JSON
    for (const collInfo of collections) {
      const collName = collInfo.name;
      const collection = db.collection(collName);

      console.log(`   Exporting ${collName}...`);
      const docs = await collection.find({}).toArray();

      const jsonPath = path.join(backupPath, `${collName}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(docs, null, 2), "utf8");

      const fileSize = fs.statSync(jsonPath).size;
      totalSize += fileSize;
      totalDocs += docs.length;

      console.log(
        `      ✓ ${docs.length} documents (${formatBytes(fileSize)})`
      );
    }

    console.log(`✅ Exported ${totalDocs} total documents`);

    // Create metadata file
    const metadata = {
      database: dbName,
      timestamp: timestamp,
      date: moment().tz("Asia/Tashkent").format("YYYY-MM-DD HH:mm:ss"),
      collections: collections.length,
      totalDocuments: totalDocs,
      size: totalSize,
      sizeFormatted: formatBytes(totalSize),
    };

    fs.writeFileSync(
      path.join(backupPath, "metadata.json"),
      JSON.stringify(metadata, null, 2),
      "utf8"
    );

    const sizeMB = (totalSize / 1024 / 1024).toFixed(2);

    // Compress backup to .tar.gz
    const archiveName = `${backupName}.tar.gz`;
    const archivePath = path.join(BACKUP_DIR, archiveName);

    console.log("🗜️ Compressing backup...");
    await compressDirectory(backupPath, archivePath);

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
    await sendBackupNotification(
      dbName,
      sizeMB,
      archiveSizeMB,
      backupName,
      archivePath
    );

    console.log("✅ Backup completed successfully!");
    return { success: true, size: archiveSizeMB, name: archiveName };
  } catch (error) {
    console.error("❌ Backup failed:", error);
    await logger.logError(error, "MongoDB Backup Failed");
    throw error;
  } finally {
    // Disconnect from MongoDB
    if (isConnected) {
      await mongoose.disconnect();
      console.log("🔌 Disconnected from database");
    }
  }
}

async function compressDirectory(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("tar", {
      gzip: true,
      gzipOptions: { level: 9 },
    });

    output.on("close", () => {
      resolve();
    });

    archive.on("error", (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, path.basename(sourceDir));
    archive.finalize();
  });
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
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
  backupName,
  archivePath
) {
  try {
    const Settings = require("../../models/Settings");
    const logChannel = await Settings.getSetting("log_channel", null);

    if (!logChannel) {
      console.log("⚠️ Log channel not configured, skipping notification");
      return;
    }

    const now = moment().tz("Asia/Tashkent");
    const message = `
🔐 <b>MongoDB Backup</b>

📊 Database: <code>${dbName}</code>
📅 Sana: ${now.format("DD.MM.YYYY HH:mm:ss")}
📦 Original size: ${originalSize} MB
🗜️ Compressed: ${compressedSize} MB
📁 Fayl: <code>${backupName}.tar.gz</code>

✅ Backup muvaffaqiyatli yaratildi!
    `.trim();

    // Send backup file to Telegram
    const fileSize = fs.statSync(archivePath).size;
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

    // Telegram file size limit is 50MB for bots
    if (fileSize < 50 * 1024 * 1024) {
      await bot.telegram.sendDocument(
        logChannel,
        {
          source: archivePath,
          filename: `${backupName}.tar.gz`,
        },
        {
          caption: message,
          parse_mode: "HTML",
        }
      );
      console.log(`📨 Backup file sent to log channel (${fileSizeMB} MB)`);
    } else {
      // If file is too large, just send notification without file
      await bot.telegram.sendMessage(logChannel, message, {
        parse_mode: "HTML",
      });
      console.log(
        `📨 Backup notification sent (file too large: ${fileSizeMB} MB)`
      );
    }
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
