const mongoose = require("mongoose");

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

// Static methods
SettingsSchema.statics.getSetting = async function (key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

SettingsSchema.statics.setSetting = async function (
  key,
  value,
  description = ""
) {
  return await this.findOneAndUpdate(
    { key },
    { value, description },
    { upsert: true, new: true }
  );
};

const Settings = mongoose.model("Settings", SettingsSchema);

module.exports = Settings;
