const mongoose = require("mongoose");

const GreetingLogSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
      index: true,
    },
    firstName: String,
    username: String,
    text: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: Number,
    reviewedAt: Date,
    sentToChannel: Boolean,
    channelMessageId: Number,
    rejectionReason: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("GreetingLog", GreetingLogSchema);
