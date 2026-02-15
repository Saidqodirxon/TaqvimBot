const logger = require("../../utils/logger");
const express = require("express");
const router = express.Router();
const Settings = require("../../models/Settings");
const { CALCULATION_METHODS, SCHOOLS } = require("../../utils/aladhan");

/**
 * Get default prayer settings
 */
router.get("/", async (req, res) => {
  try {
    const defaults = await Settings.getSetting("defaultPrayerSettings", {
      calculationMethod: 3, // MWL - Musulmonlar dunyosi ligasi (Default as requested)
      school: 1, // Hanafi (Default as requested)
      midnightMode: 0,
    });
    res.json({
      defaults,
      availableMethods: CALCULATION_METHODS,
      availableSchools: SCHOOLS,
    });
  } catch (error) {
    logger.error("Error fetching prayer defaults:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Update default prayer settings
 */
router.post("/", async (req, res) => {
  try {
    const { calculationMethod, school, midnightMode } = req.body;
    const defaults = {
      calculationMethod: parseInt(calculationMethod) || 3,
      school: parseInt(school) || 1,
      midnightMode: parseInt(midnightMode) || 0,
    };

    // FIX: Passing 'defaults' as the value argument
    const result = await Settings.setSetting(
      "defaultPrayerSettings",
      defaults, // This was missing!
      "Default namoz sozlamalari (yangi foydalanuvchilar uchun)"
    );

    await logger.logAdminAction(
      { userId: req.user?.userId || "system", firstName: "Admin" },
      "Default namoz sozlamalari yangilandi",
      JSON.stringify(defaults)
    );

    res.json({
      success: true,
      defaults,
    });
  } catch (error) {
    logger.error("Error updating prayer defaults:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
