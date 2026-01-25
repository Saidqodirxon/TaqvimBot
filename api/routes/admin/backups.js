const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const path = require("path");
const { createBackup } = require("../../backup-mongodb");
const adminAuth = require("../../middleware/adminAuth");
const logger = require("../../utils/logger");

// Get all backups
router.get("/", adminAuth, async (req, res) => {
  try {
    const backupDir = path.join(__dirname, "../../backups");

    // Create backup directory if it doesn't exist
    try {
      await fs.access(backupDir);
    } catch {
      await fs.mkdir(backupDir, { recursive: true });
    }

    // Read all files in backup directory
    const files = await fs.readdir(backupDir);
    const backups = [];

    for (const file of files) {
      if (file.endsWith(".tar.gz")) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);

        backups.push({
          filename: file,
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
        });
      }
    }

    // Sort by creation date (newest first)
    backups.sort((a, b) => b.createdAt - a.createdAt);

    res.json({
      success: true,
      backups,
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
      totalSizeFormatted: formatBytes(
        backups.reduce((sum, b) => sum + b.size, 0)
      ),
    });

    logger.info("Backups listed", {
      admin: req.user.username,
      count: backups.length,
    });
  } catch (error) {
    logger.error("Error listing backups:", error);
    res.status(500).json({
      success: false,
      error: "Backuplarni olishda xatolik yuz berdi",
    });
  }
});

// Create new backup
router.post("/create", adminAuth, async (req, res) => {
  try {
    // Only superadmin can create backups manually
    if (req.user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        error: "Faqat superadmin backup yarata oladi",
      });
    }

    logger.info("Manual backup started", { admin: req.user.username });

    // Create backup in background
    createBackup()
      .then(() => {
        logger.info("Manual backup completed", { admin: req.user.username });
      })
      .catch((error) => {
        logger.error("Manual backup failed:", error);
      });

    res.json({
      success: true,
      message:
        "Backup jarayoni boshlandi. Bu bir necha daqiqa davom etishi mumkin.",
      note: "Backup tayyor bo'lgandan so'ng log kanalga xabar yuboriladi",
    });
  } catch (error) {
    logger.error("Error creating backup:", error);
    res.status(500).json({
      success: false,
      error: "Backup yaratishda xatolik yuz berdi",
    });
  }
});

// Download backup
router.get("/download/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const token =
      req.query.token || req.header("Authorization")?.replace("Bearer ", "");

    // Verify token
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token yo'q",
      });
    }

    const jwt = require("jsonwebtoken");
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: "Noto'g'ri token",
      });
    }

    // Security: prevent directory traversal
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return res.status(400).json({
        success: false,
        error: "Noto'g'ri fayl nomi",
      });
    }

    // Only allow .tar.gz files
    if (!filename.endsWith(".tar.gz")) {
      return res.status(400).json({
        success: false,
        error: "Faqat .tar.gz fayllari yuklab olinishi mumkin",
      });
    }

    const backupDir = path.join(__dirname, "../../backups");
    const filePath = path.join(backupDir, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: "Backup fayli topilmadi",
      });
    }

    logger.info("Backup downloaded", { admin: req.user.username, filename });

    // Send file
    res.download(filePath, filename, (err) => {
      if (err) {
        logger.error("Error downloading backup:", err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: "Faylni yuklashda xatolik yuz berdi",
          });
        }
      }
    });
  } catch (error) {
    logger.error("Error downloading backup:", error);
    res.status(500).json({
      success: false,
      error: "Faylni yuklashda xatolik yuz berdi",
    });
  }
});

// Delete backup
router.delete("/:filename", adminAuth, async (req, res) => {
  try {
    // Only superadmin can delete backups
    if (req.user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        error: "Faqat superadmin backup o'chira oladi",
      });
    }

    const { filename } = req.params;

    // Security: prevent directory traversal
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return res.status(400).json({
        success: false,
        error: "Noto'g'ri fayl nomi",
      });
    }

    // Only allow .tar.gz files
    if (!filename.endsWith(".tar.gz")) {
      return res.status(400).json({
        success: false,
        error: "Faqat .tar.gz fayllari o'chirilishi mumkin",
      });
    }

    const backupDir = path.join(__dirname, "../../backups");
    const filePath = path.join(backupDir, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: "Backup fayli topilmadi",
      });
    }

    // Delete file
    await fs.unlink(filePath);

    logger.info("Backup deleted", { admin: req.user.username, filename });

    res.json({
      success: true,
      message: "Backup muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    logger.error("Error deleting backup:", error);
    res.status(500).json({
      success: false,
      error: "Backupni o'chirishda xatolik yuz berdi",
    });
  }
});

// Get backup schedule settings
router.get("/schedule", adminAuth, async (req, res) => {
  try {
    const Settings = require("../../models/Settings");

    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        backupSchedule: {
          enabled: true,
          cronTime: "0 3 * * *", // Daily at 3:00 AM
          keepDays: 7,
        },
      });
    }

    res.json({
      success: true,
      schedule: settings.backupSchedule || {
        enabled: true,
        cronTime: "0 3 * * *",
        keepDays: 7,
      },
    });
  } catch (error) {
    logger.error("Error getting backup schedule:", error);
    res.status(500).json({
      success: false,
      error: "Backup schedule sozlamalarini olishda xatolik",
    });
  }
});

// Update backup schedule settings
router.put("/schedule", adminAuth, async (req, res) => {
  try {
    // Only superadmin can update schedule
    if (req.user.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        error: "Faqat superadmin schedule o'zgartira oladi",
      });
    }

    const { enabled, cronTime, keepDays } = req.body;
    const Settings = require("../../models/Settings");

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    if (!settings.backupSchedule) {
      settings.backupSchedule = {};
    }

    if (enabled !== undefined) settings.backupSchedule.enabled = enabled;
    if (cronTime) settings.backupSchedule.cronTime = cronTime;
    if (keepDays !== undefined) settings.backupSchedule.keepDays = keepDays;

    await settings.save();

    logger.info("Backup schedule updated", {
      admin: req.user.username,
      settings: settings.backupSchedule,
    });

    res.json({
      success: true,
      message: "Backup schedule yangilandi",
      schedule: settings.backupSchedule,
      note: "O'zgarishlar keyingi backup paytida kuchga kiradi. Server qayta ishga tushirilganda yangi schedule faol bo'ladi.",
    });
  } catch (error) {
    logger.error("Error updating backup schedule:", error);
    res.status(500).json({
      success: false,
      error: "Backup schedule sozlamalarini yangilashda xatolik",
    });
  }
});

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

module.exports = router;
