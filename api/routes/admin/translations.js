const logger = require("../../utils/logger");
const express = require("express");
const router = express.Router();
const { authMiddleware, superAdminOnly } = require("../../middleware/adminAuth");
const Translation = require("../../models/Translation");

// Get all translations
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const translations = await Translation.find(filter).sort({ key: 1 });
    res.json({ translations });
  } catch (error) {
    logger.error("Get translations error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Get translation by key
router.get("/:key", authMiddleware, async (req, res) => {
  try {
    const translation = await Translation.findOne({ key: req.params.key });
    if (!translation) {
      return res.status(404).json({ error: "Tarjima topilmadi" });
    }
    res.json({ translation });
  } catch (error) {
    logger.error("Get translation error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Create or update translation
router.post("/", authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const { key, uz, cr, ru, description, category } = req.body;
    
    if (!key || !uz || !cr || !ru) {
      return res.status(400).json({ error: "key, uz, cr, ru kerak" });
    }

    const translation = await Translation.setTranslation(
      key,
      { uz, cr, ru },
      description,
      category
    );

    await logger.logAdminAction(
      { userId: req.user?.id || "system", firstName: "Admin" },
      "Tarjima qo'shildi/yangilandi",
      `Key: ${key}`
    );

    res.json({ message: "Tarjima saqlandi", translation });
  } catch (error) {
    logger.error("Create/update translation error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Update translation
router.put("/:key", authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const { uz, cr, ru, description, category } = req.body;
    
    const translation = await Translation.findOneAndUpdate(
      { key: req.params.key },
      { uz, cr, ru, description, category },
      { new: true }
    );

    if (!translation) {
      return res.status(404).json({ error: "Tarjima topilmadi" });
    }

    await logger.logAdminAction(
      { userId: req.user?.id || "system", firstName: "Admin" },
      "Tarjima tahrirlandi",
      `Key: ${req.params.key}`
    );

    res.json({ message: "Tarjima yangilandi", translation });
  } catch (error) {
    logger.error("Update translation error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Delete translation
router.delete("/:key", authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const translation = await Translation.findOneAndDelete({ key: req.params.key });
    
    if (!translation) {
      return res.status(404).json({ error: "Tarjima topilmadi" });
    }

    await logger.logAdminAction(
      { userId: req.user?.id || "system", firstName: "Admin" },
      "Tarjima o'chirildi",
      `Key: ${req.params.key}`
    );

    res.json({ message: "Tarjima o'chirildi" });
  } catch (error) {
    logger.error("Delete translation error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
