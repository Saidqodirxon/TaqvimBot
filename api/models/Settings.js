const mongoose = require("mongoose");

// In-memory cache for settings (reduces DB calls dramatically)
const settingsCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

function getCached(key) {
  const cached = settingsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { found: true, value: cached.value };
  }
  return { found: false };
}

function setCache(key, value) {
  settingsCache.set(key, { value, timestamp: Date.now() });
}

// Settings Schema for admin panel
const SettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    description: {
      type: String,
    },
    backupSchedule: {
      enabled: {
        type: Boolean,
        default: true,
      },
      cronTime: {
        type: String,
        default: "0 3 * * *", // Daily at 3:00 AM
      },
      keepDays: {
        type: Number,
        default: 7,
      },
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

// Static methods - OPTIMIZED with in-memory cache
SettingsSchema.statics.getSetting = async function (key, defaultValue = null) {
  // Check cache first
  const cached = getCached(key);
  if (cached.found) {
    return cached.value !== undefined ? cached.value : defaultValue;
  }
  
  // DB hit - only if not cached
  const setting = await this.findOne({ key }).lean();
  const value = setting ? setting.value : defaultValue;
  
  // Cache the result
  setCache(key, value);
  
  return value;
};

SettingsSchema.statics.setSetting = async function (
  key,
  value,
  description = ""
) {
  // Invalidate cache on update
  settingsCache.delete(key);
  
  return await this.findOneAndUpdate(
    { key },
    { value, description },
    { upsert: true, new: true }
  );
};

// Clear all cache (useful when bulk updating settings)
SettingsSchema.statics.clearCache = function () {
  settingsCache.clear();
};

const Settings = mongoose.model("Settings", SettingsSchema);

module.exports = Settings;
