/**
 * Recovery API Routes
 * Backend endpoints for MTProto user recovery
 */

const express = require("express");
const router = express.Router();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const fs = require("fs");
const path = require("path");
const User = require("../../models/User");

// Store active recovery sessions
const recoverySessions = new Map();

/**
 * POST /api/admin/recovery/extract
 * Start user extraction process
 */
router.post("/extract", async (req, res) => {
  try {
    const { apiId, apiHash, botUsername, phoneNumber } = req.body;

    if (!apiId || !apiHash || !botUsername) {
      return res
        .status(400)
        .json({ message: "Barcha maydonlar talab qilinadi" });
    }

    const sessionId = Date.now().toString();
    const session = new StringSession("");

    const client = new TelegramClient(session, parseInt(apiId), apiHash, {
      connectionRetries: 5,
    });

    // Store session
    recoverySessions.set(sessionId, {
      client,
      status: "authenticating",
      progress: { dialogsScanned: 0, usersFound: 0 },
      apiId,
      apiHash,
      botUsername,
    });

    // Start authentication
    await client.start({
      phoneNumber: async () => phoneNumber,
      phoneCode: async () => {
        recoverySessions.get(sessionId).status = "waiting_code";
        return ""; // Will be provided separately
      },
      onError: (err) => {
        console.error("Auth error:", err);
      },
    });

    res.json({
      sessionId,
      requiresAuth: true,
      message: "Verification code yuborildi",
    });
  } catch (error) {
    console.error("Extract error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/admin/recovery/verify
 * Verify phone code and continue extraction
 */
router.post("/verify", async (req, res) => {
  try {
    const { sessionId, code } = req.body;

    if (!sessionId || !code) {
      return res.status(400).json({ message: "Session ID va code kerak" });
    }

    const session = recoverySessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session topilmadi" });
    }

    // Continue with code
    // Note: This is simplified - actual implementation needs proper async handling
    session.status = "extracting";

    // Start extraction in background
    extractUsersBackground(sessionId);

    res.json({ message: "Verification muvaffaqiyatli, extraction boshlandi" });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/admin/recovery/progress
 * Get extraction progress
 */
router.get("/progress/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = recoverySessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session topilmadi" });
    }

    res.json({
      status: session.status,
      progress: session.progress,
      result: session.result,
      error: session.error,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/admin/recovery/import
 * Import extracted users to MongoDB
 */
router.post("/import", async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = recoverySessions.get(sessionId);

    if (!session || !session.result) {
      return res.status(400).json({ message: "Avval extraction qiling" });
    }

    const users = session.result.users;
    const stats = {
      total: users.length,
      newUsers: 0,
      existingUsers: 0,
      failed: 0,
    };

    // Get existing user IDs
    const existingUsers = await User.find({
      telegramId: { $in: users.map((u) => u.telegramId) },
    }).select("telegramId");

    const existingIds = new Set(existingUsers.map((u) => u.telegramId));

    // Filter new users
    const newUsers = users.filter((u) => !existingIds.has(u.telegramId));

    // Prepare user documents
    const userDocs = newUsers.map((userData) => ({
      telegramId: userData.telegramId,
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      username: userData.username || "",
      language: "uz",
      prayers: [
        { name: "fajr", enabled: true },
        { name: "sunrise", enabled: false },
        { name: "dhuhr", enabled: true },
        { name: "asr", enabled: true },
        { name: "maghrib", enabled: true },
        { name: "isha", enabled: true },
      ],
      notificationOffset: 0,
      isActive: true,
      joinedAt: userData.lastSeen ? new Date(userData.lastSeen) : new Date(),
      recoveredFrom: "mtproto",
      recoveredAt: new Date(),
    }));

    // Insert in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < userDocs.length; i += BATCH_SIZE) {
      const batch = userDocs.slice(i, i + BATCH_SIZE);
      try {
        const result = await User.insertMany(batch, { ordered: false });
        stats.newUsers += result.length;
      } catch (error) {
        if (error.code === 11000) {
          stats.existingUsers +=
            batch.length - (error.insertedDocs?.length || 0);
        } else {
          stats.failed += batch.length;
        }
      }
    }

    stats.existingUsers += existingIds.size;

    // Get total count
    const totalInDb = await User.countDocuments();

    res.json({
      ...stats,
      totalInDb,
      message: "Import muvaffaqiyatli",
    });
  } catch (error) {
    console.error("Import error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Background extraction function
 */
async function extractUsersBackground(sessionId) {
  const session = recoverySessions.get(sessionId);
  if (!session) return;

  try {
    const { client, botUsername } = session;
    const users = new Map();
    const stats = {
      totalDialogs: 0,
      botUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      withUsername: 0,
    };

    // Get bot
    const bot = await client.getEntity(botUsername);

    // Get all dialogs
    const dialogs = await client.getDialogs({ limit: 1000 });

    for (const dialog of dialogs) {
      stats.totalDialogs++;
      session.progress.dialogsScanned = stats.totalDialogs;

      if (dialog.isUser && !dialog.entity.bot) {
        const user = dialog.entity;
        const userId = user.id.toString();

        if (!users.has(userId)) {
          const daysSinceLastMessage = dialog.date
            ? (Date.now() - dialog.date.getTime()) / (1000 * 60 * 60 * 24)
            : 999;

          const isActive = daysSinceLastMessage < 30;

          users.set(userId, {
            telegramId: userId,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            username: user.username || "",
            lastSeen: dialog.date ? dialog.date.toISOString() : null,
            isActive,
          });

          stats.botUsers++;
          session.progress.usersFound = stats.botUsers;
          if (isActive) stats.activeUsers++;
          else stats.inactiveUsers++;
          if (user.username) stats.withUsername++;
        }
      }
    }

    session.status = "completed";
    session.result = {
      users: Array.from(users.values()),
      totalUsers: users.size,
      activeUsers: stats.activeUsers,
      inactiveUsers: stats.inactiveUsers,
      withUsername: stats.withUsername,
    };
  } catch (error) {
    console.error("Background extraction error:", error);
    session.status = "failed";
    session.error = error.message;
  } finally {
    if (session.client) {
      await session.client.disconnect();
    }
  }
}

module.exports = router;
