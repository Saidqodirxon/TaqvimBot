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
      unique: true,
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
      type: mongoose.Schema.Types.Mixed,
      default: {
        viewUsers: true,
        editUsers: true,
        viewBroadcast: true,
        sendBroadcast: true,
        viewSettings: false,
        viewAdmins: false,
        viewPrayers: true,
        viewGreetings: true,
      },
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
  const fullAccess = {
    viewUsers: true,
    editUsers: true,
    deleteUsers: true,
    viewBroadcast: true,
    sendBroadcast: true,
    viewPrayers: true,
    editPrayers: true,
    deletePrayers: true,
    viewChannels: true,
    editChannels: true,
    viewSettings: true,
    editSettings: true,
    viewAdmins: true,
    editAdmins: true,
    deleteAdmins: true,
    viewLogs: true,
    viewSuggestions: true,
    viewLocations: true,
    viewGreetings: true,
    viewTranslations: true,
  };

  switch (role) {
    case "superadmin":
      return fullAccess;
    case "admin":
      return {
        ...fullAccess,
        viewSettings: false,
        editSettings: false,
        viewAdmins: false,
        editAdmins: false,
        deleteAdmins: false,
      };
    case "moderator":
    default:
      return {
        viewUsers: true,
        editUsers: false,
        deleteUsers: false,
        viewBroadcast: false,
        sendBroadcast: false,
        viewPrayers: true,
        editPrayers: false,
        deletePrayers: false,
        viewChannels: false,
        viewSettings: false,
        viewAdmins: false,
        viewSuggestions: true,
        viewLocations: false,
        viewGreetings: true,
        viewTranslations: false,
      };
  }
};

module.exports = mongoose.model("Admin", AdminSchema);
