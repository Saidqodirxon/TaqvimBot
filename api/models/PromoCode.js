const mongoose = require("mongoose");

const PromoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    rewardPoints: {
      type: Number,
      required: true,
      min: 1,
    },
    maxUses: {
      type: Number,
      default: 1, // How many times this code can be used in total
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      default: null, // Null means no expiration
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    usedBy: [
      {
        userId: { type: Number, required: true }, // Telegram User ID
        usedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("PromoCode", PromoCodeSchema);
