const logger = require("../../utils/logger");
const express = require("express");
const router = express.Router();
const Settings = require("../../models/Settings");
const logger = require("../../utils/logger");
const { CALCULATION_METHODS, SCHOOLS } = require("../../utils/aladhan");

/**
 * Get default prayer settings
 */
router.get("/", async (req, res) => {
  try {
    const defaults = await Settings.getSetting("defaultPrayerSettings", {
      calculationMethod: 3, // MWL - Musulmonlar dunyosi ligasi
      school: 1, // Hanafi
      midnightMode: 0,
    });

    console.log("� Retrieved prayer defaults from DB:", defaults);

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
      calculationMethod: parseInt(calculationMethod) || 1,
      school: parseInt(school) || 1,
      midnightMode: parseInt(midnightMode) || 0,
    };

    console.log("💾 Saving prayer defaults:", defaults);

    const result = await Settings.setSetting(
      "defaultPrayerSettings",
      defaults,
      "Default namoz sozlamalari (yangi foydalanuvchilar uchun)"
    );

    console.log("✅ Saved to database:", result);

    console.log("✅ Prayer defaults saved successfully");

    await logger.logAdminAction(
      { userId: req.user?.id || "system", firstName: "Admin" },
      "Default namoz sozlamalari yangilandi",
      JSON.stringify(defaults)
    );

    res.json({
      success: true,
      defaults,
    });
  } catch (error) {
    logger.error("Error updating prayer defaults:", error);
    await logger.logError(error, "Prayer defaults update failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
