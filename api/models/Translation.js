const mongoose = require("mongoose");

/**
 * Translation Schema - Barcha bot textlarini saqlash
 */
const TranslationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    uz: {
      type: String,
      required: true,
    },
    cr: {
      type: String,
      required: true,
    },
    ru: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      enum: [
        "buttons",
        "messages",
        "errors",
        "admin",
        "prayers",
        "settings",
        "location",
        "greeting",
        "calendar",
        "other",
      ],
      default: "other",
      index: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

// Static method to get translation
TranslationSchema.statics.getTranslation = async function (key, lang = "uz") {
  const translation = await this.findOne({ key });
  if (!translation) return null;
  return translation[lang] || translation.uz;
};

// Static method to set translation
TranslationSchema.statics.setTranslation = async function (
  key,
  values,
  description = "",
  category = "other"
) {
  return await this.findOneAndUpdate(
    { key },
    { uz: values.uz, cr: values.cr, ru: values.ru, description, category },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model("Translation", TranslationSchema);
