const mongoose = require("mongoose");

// Greeting Schema
const GreetingSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    username: {
      type: String,
    },
    message: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ["text", "photo", "video"],
      default: "text",
    },
    fileId: {
      type: String,
    },
    caption: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminComment: {
      type: String,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("Greeting", GreetingSchema);
