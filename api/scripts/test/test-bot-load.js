// Test bot.js loading step by step
console.log("Step 1: Loading required modules...");

try {
  console.log("Loading dotenv...");
  require("dotenv").config();

  console.log("Loading Telegraf...");
  const { Telegraf, Markup, session } = require("telegraf");

  console.log("Loading mongoose...");
  const mongoose = require("mongoose");

  console.log("Loading express...");
  const express = require("express");

  console.log("Loading cors...");
  const cors = require("cors");

  console.log("Loading cron...");
  const cron = require("node-cron");

  console.log("Loading path...");
  const path = require("path");

  console.log("Step 2: Loading local modules...");
  console.log("Loading logger...");
  const logger = require("./utils/logger");
  console.log("Logger type:", typeof logger.error);

  console.log("Loading db...");
  const connectDB = require("./modules/db");

  console.log("Loading functions...");
  const functions = require("./modules/functions");

  console.log("Loading messageQueue...");
  const messageQueue = require("./modules/messageQueue");

  console.log("Loading models...");
  const User = require("./models/User");
  const Prayer = require("./models/Prayer");
  const Location = require("./models/Location");
  const MonthlyPrayerTime = require("./models/MonthlyPrayerTime");
  const Admin = require("./models/Admin");
  const Settings = require("./models/Settings");

  console.log("Loading utils...");
  const { getAddress } = require("./utils/location");
  const { formatPrayerTime, getCurrentDate } = require("./utils/helpers");
  const keyboards = require("./utils/keyboards");
  const { sendToChannel } = require("./utils/channel");
  const prayerReminders = require("./utils/prayerReminders");
  const { getQiblaDirection } = require("./utils/qibla");

  console.log("Loading translator...");
  const { t } = require("./utils/translator");

  console.log("Loading scenes...");
  const locationScene = require("./scenes/location");
  const settingsScene = require("./scenes/settings");
  const suggestionScene = require("./scenes/suggestion");
  const greetingScene = require("./scenes/greeting");

  console.log("Loading admin routes...");
  console.log("Loading auth...");
  const authRoutes = require("./routes/admin/auth");
  console.log("✅ auth loaded");

  console.log("Loading stats...");
  const statsRoutes = require("./routes/admin/stats");
  console.log("✅ stats loaded");

  console.log("Loading settings...");
  const settingsRoutes = require("./routes/admin/settings");
  console.log("✅ settings loaded");

  console.log("Loading admins...");
  const adminsRoutes = require("./routes/admin/admins");
  console.log("✅ admins loaded");

  console.log("Loading users...");
  const usersRoutes = require("./routes/admin/users");
  console.log("✅ users loaded");

  console.log("Loading prayers...");
  const prayersRoutes = require("./routes/admin/prayers");
  console.log("✅ prayers loaded");

  console.log("Loading channels...");
  const channelsRoutes = require("./routes/admin/channels");
  console.log("✅ channels loaded");

  console.log("Loading broadcast...");
  const broadcastRoutes = require("./routes/admin/broadcast");
  console.log("✅ broadcast loaded");

  console.log("Loading miniapp...");
  const miniAppRoutes = require("./routes/admin/miniapp");
  console.log("✅ miniapp loaded");

  console.log("Loading locations...");
  const locationsRoutes = require("./routes/admin/locations");
  console.log("✅ locations loaded");

  console.log("Loading monthlyPrayerTimes...");
  const monthlyPrayerTimesRoutes = require("./routes/admin/monthlyPrayerTimes");
  console.log("✅ monthlyPrayerTimes loaded");

  console.log("Loading prayerDefaults...");
  const prayerDefaultsRoutes = require("./routes/admin/prayerDefaults");
  console.log("✅ prayerDefaults loaded");

  console.log("Loading greetings...");
  const greetingsRoutes = require("./routes/admin/greetings");
  console.log("✅ greetings loaded");

  console.log("Loading middleware...");
  const adminAuth = require("./middleware/adminAuth");

  console.log("✅ All modules loaded successfully!");
  console.log("Step 3: Testing bot initialization...");

  const bot = new Telegraf(process.env.BOT_TOKEN);
  console.log("✅ Bot instance created successfully!");
} catch (error) {
  console.error("❌ Error loading modules:", error.message);
  console.error("Stack:", error.stack);
}
