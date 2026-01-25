const mongoose = require("mongoose");

const SuggestionSchema = new mongoose.Schema(
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
      enum: ["pending", "reviewed", "implemented", "rejected"],
      default: "pending",
    },
    adminNote: String,
    reviewedBy: Number,
    reviewedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Suggestion", SuggestionSchema);
