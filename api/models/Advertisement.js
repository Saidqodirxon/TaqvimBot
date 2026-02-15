const mongoose = require("mongoose");

const advertisementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["notification", "menu"],
      required: true,
    },
    content: {
      type: String, // Caption or text
      required: true,
    },
    image: {
      type: String, // URL or File ID
    },
    targetRegion: {
      type: String, // Region name or ID. If null, global.
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Advertisement", advertisementSchema);
