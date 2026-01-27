#!/usr/bin/env node
/**
 * Create MongoDB Indexes for Performance Optimization
 * Run once: node create-indexes.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const DB_URL = process.env.MONGODB_URI || process.env.DB_URL;

async function createIndexes() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(DB_URL);
    console.log("✅ Connected!\n");

    const db = mongoose.connection.db;

    // ==================== USERS COLLECTION ====================
    console.log("📊 Creating indexes for 'users' collection...");

    await db
      .collection("users")
      .createIndex({ userId: 1 }, { unique: true, name: "userId_unique" });
    console.log("  ✅ userId unique index");

    await db
      .collection("users")
      .createIndex({ language: 1, is_block: 1 }, { name: "language_block" });
    console.log("  ✅ language + is_block compound index");

    await db
      .collection("users")
      .createIndex(
        { "reminderSettings.enabled": 1, is_block: 1 },
        { name: "reminders_enabled_block" }
      );
    console.log("  ✅ reminderSettings.enabled + is_block");

    await db
      .collection("users")
      .createIndex({ last_active: -1 }, { name: "last_active_desc" });
    console.log("  ✅ last_active descending");

    await db
      .collection("users")
      .createIndex(
        { "location.latitude": 1, "location.longitude": 1 },
        { name: "location_coords", sparse: true }
      );
    console.log("  ✅ location coordinates (sparse)");

    await db
      .collection("users")
      .createIndex({ hasJoinedChannel: 1 }, { name: "has_joined_channel" });
    console.log("  ✅ hasJoinedChannel");

    // ==================== PRAYER TIME CACHE ====================
    console.log("\n📊 Creating indexes for 'prayertimecaches' collection...");

    await db
      .collection("prayertimecaches")
      .createIndex(
        { locationKey: 1, date: 1 },
        { unique: true, name: "location_date_unique" }
      );
    console.log("  ✅ locationKey + date unique");

    await db
      .collection("prayertimecaches")
      .createIndex(
        { expiresAt: 1 },
        { name: "expires_at", expireAfterSeconds: 0 }
      );
    console.log("  ✅ expiresAt with TTL");

    await db
      .collection("prayertimecaches")
      .createIndex({ latitude: 1, longitude: 1 }, { name: "cache_coords" });
    console.log("  ✅ latitude + longitude");

    await db
      .collection("prayertimecaches")
      .createIndex({ fetchedAt: -1 }, { name: "fetched_at_desc" });
    console.log("  ✅ fetchedAt descending");

    // ==================== GREETING LOGS ====================
    console.log("\n📊 Creating indexes for 'greetinglogs' collection...");

    await db
      .collection("greetinglogs")
      .createIndex({ status: 1, createdAt: -1 }, { name: "status_created" });
    console.log("  ✅ status + createdAt");

    await db
      .collection("greetinglogs")
      .createIndex({ userId: 1 }, { name: "user_greetings" });
    console.log("  ✅ userId");

    await db
      .collection("greetinglogs")
      .createIndex({ reviewedBy: 1 }, { name: "reviewed_by", sparse: true });
    console.log("  ✅ reviewedBy (sparse)");

    // ==================== SETTINGS ====================
    console.log("\n📊 Creating indexes for 'settings' collection...");

    await db
      .collection("settings")
      .createIndex({ key: 1 }, { unique: true, name: "key_unique" });
    console.log("  ✅ key unique");

    // ==================== SUGGESTIONS ====================
    console.log("\n📊 Creating indexes for 'suggestions' collection...");

    await db
      .collection("suggestions")
      .createIndex({ userId: 1, createdAt: -1 }, { name: "user_suggestions" });
    console.log("  ✅ userId + createdAt");

    await db
      .collection("suggestions")
      .createIndex({ status: 1 }, { name: "suggestion_status" });
    console.log("  ✅ status");

    // ==================== LOCATIONS ====================
    console.log("\n📊 Creating indexes for 'locations' collection...");

    await db
      .collection("locations")
      .createIndex({ isActive: 1 }, { name: "is_active" });
    console.log("  ✅ isActive");

    await db
      .collection("locations")
      .createIndex({ latitude: 1, longitude: 1 }, { name: "location_coords" });
    console.log("  ✅ latitude + longitude");

    // ==================== MONTHLY PRAYER TIMES ====================
    console.log("\n📊 Creating indexes for 'monthlyprayertimes' collection...");

    await db
      .collection("monthlyprayertimes")
      .createIndex(
        { locationId: 1, date: 1 },
        { unique: true, name: "location_date_unique" }
      );
    console.log("  ✅ locationId + date unique");

    await db
      .collection("monthlyprayertimes")
      .createIndex({ date: 1 }, { name: "prayer_date" });
    console.log("  ✅ date");

    console.log("\n✅ All indexes created successfully!\n");
    console.log("📋 Performance tips:");
    console.log("  1. Use .lean() for read-only queries");
    console.log("  2. Use .select() to limit fields");
    console.log("  3. Add .limit() to large queries");
    console.log(
      "  4. Monitor slow queries with: db.setProfilingLevel(1, { slowms: 100 })"
    );

    await mongoose.connection.close();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error creating indexes:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run
createIndexes();
