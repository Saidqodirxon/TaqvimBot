const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstName: String,
    role: {
      type: String,
      enum: ["admin", "moderator", "superadmin"],
      default: "moderator",
    },
    permissions: {
      users: { type: Boolean, default: true },
      broadcast: { type: Boolean, default: false },
      settings: { type: Boolean, default: false },
      admins: { type: Boolean, default: false },
      prayers: { type: Boolean, default: true },
      greetings: { type: Boolean, default: true },
    },
    addedBy: {
      type: Number,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

AdminSchema.statics.getDefaultPermissions = function (role) {
  switch (role) {
    case "superadmin":
      return {
        users: true,
        broadcast: true,
        settings: true,
        admins: true,
        prayers: true,
        greetings: true,
      };
    case "admin":
      return {
        users: true,
        broadcast: true,
        settings: false,
        admins: false,
        prayers: true,
        greetings: true,
      };
    case "moderator":
    default:
      return {
        users: true,
        broadcast: false,
        settings: false,
        admins: false,
        prayers: true,
        greetings: true,
      };
  }
};

module.exports = mongoose.model("Admin", AdminSchema);
