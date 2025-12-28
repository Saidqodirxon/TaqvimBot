const mongoose = require("mongoose");

// User Schema
const UserSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.SchemaTypes.Number,
      required: true,
      unique: true,
      index: true,
    },
    firstName: {
      type: mongoose.SchemaTypes.String,
      required: true,
    },
    username: {
      type: mongoose.SchemaTypes.String,
      required: false,
    },
    phoneNumber: {
      type: mongoose.SchemaTypes.String,
      required: false,
    },
    is_block: {
      type: mongoose.SchemaTypes.Boolean,
      default: false,
      index: true,
    },
    language: {
      type: mongoose.SchemaTypes.String,
      enum: ["uz", "cr", "ru"],
      default: null, // null - til hali tanlanmagan
      required: false,
      index: true,
    },
    location: {
      name: {
        type: mongoose.SchemaTypes.String,
        default: "Tashkent",
      },
      latitude: {
        type: mongoose.SchemaTypes.Number,
        default: 41.2995, // Tashkent default
      },
      longitude: {
        type: mongoose.SchemaTypes.Number,
        default: 69.2401,
      },
      timezone: {
        type: mongoose.SchemaTypes.String,
        default: "Asia/Tashkent",
      },
    },
    hasJoinedChannel: {
      type: mongoose.SchemaTypes.Boolean,
      default: false,
    },
    isAdmin: {
      type: mongoose.SchemaTypes.Boolean,
      default: false,
      index: true,
    },
    role: {
      type: mongoose.SchemaTypes.String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    lastActive: {
      type: mongoose.SchemaTypes.Date,
      default: Date.now,
    },
    reminderSettings: {
      enabled: {
        type: mongoose.SchemaTypes.Boolean,
        default: true,
      },
      minutesBefore: {
        type: mongoose.SchemaTypes.Number,
        default: 15,
        enum: [5, 10, 15, 30],
      },
      notifyAtPrayerTime: {
        type: mongoose.SchemaTypes.Boolean,
        default: true,
      },
      prayers: {
        fajr: { type: mongoose.SchemaTypes.Boolean, default: true },
        dhuhr: { type: mongoose.SchemaTypes.Boolean, default: true },
        asr: { type: mongoose.SchemaTypes.Boolean, default: true },
        maghrib: { type: mongoose.SchemaTypes.Boolean, default: true },
        isha: { type: mongoose.SchemaTypes.Boolean, default: true },
      },
    },
    prayerSettings: {
      calculationMethod: {
        type: mongoose.SchemaTypes.Number,
        required: false,
        // No default - will be set from admin panel settings
        // 0 = Jafari, 1 = Karachi, 2 = ISNA, 3 = MWL, 4 = Makkah, 5 = Egypt, 7 = Tehran, 8 = Gulf, 9 = Kuwait, 10 = Qatar, 11 = Singapore, 12 = France, 13 = Turkey, 14 = Russia
      },
      school: {
        type: mongoose.SchemaTypes.Number,
        required: false,
        // No default - will be set from admin panel settings
        // 0 = Shafi, 1 = Hanafi
      },
      midnightMode: {
        type: mongoose.SchemaTypes.Number,
        required: false,
        // No default - will be set from admin panel settings
        // 0 = Standard (Mid Sunset to Sunrise), 1 = Jafari (Mid Sunset to Fajr)
      },
    },
  },
  {
    versionKey: false,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

const User = mongoose.model("User", UserSchema);

module.exports = User;
