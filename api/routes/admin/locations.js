const logger = require("../../utils/logger");
const express = require("express");
const router = express.Router();
const Location = require("../../models/Location");
const User = require("../../models/User");

/**
 * Get all locations with user count statistics
 */
router.get("/", async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true }).sort({ name: 1 });
    
    // Get user count for each location
    const locationsWithStats = await Promise.all(
      locations.map(async (location) => {
        const userCount = await User.countDocuments({
          "location.latitude": location.latitude,
          "location.longitude": location.longitude,
        });
        
        return {
          ...location.toObject(),
          userCount,
        };
      })
    );
    
    res.json(locationsWithStats);
  } catch (error) {
    logger.error("Error fetching locations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get single location
 */
router.get("/:id", async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }
    res.json(location);
  } catch (error) {
    logger.error("Error fetching location:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Create new location
 */
router.post("/", async (req, res) => {
  try {
    const {
      name,
      nameUz,
      nameCr,
      nameRu,
      latitude,
      longitude,
      timezone,
      country,
      isDefault,
      manualPrayerTimes,
    } = req.body;
    // Validate required fields
    if (!name || !nameUz || !nameCr || !nameRu || !latitude || !longitude) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await Location.updateMany({}, { isDefault: false });
    }

    const location = new Location({
      name,
      nameUz,
      nameCr,
      nameRu,
      latitude,
      longitude,
      timezone: timezone || "Asia/Tashkent",
      country: country || "Uzbekistan",
      isDefault: isDefault || false,
      manualPrayerTimes: manualPrayerTimes || {
        enabled: false,
      },
    });
    await location.save();
    await logger.logAdminAction(
      { userId: req.user?.id || "system", firstName: "Admin" },
      "Yangi joylashuv qo'shildi",
      `${name} (${latitude}, ${longitude})`
    );

    res.status(201).json(location);
  } catch (error) {
    logger.error("Error creating location:", error);
    await logger.logError(error, "Location creation failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Update location
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const location = await Location.findById(id);
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    if (updateData.isDefault) {
      await Location.updateMany({ _id: { $ne: id } }, { isDefault: false });
    }

    // Update fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        location[key] = updateData[key];
      }
    });

    await location.save();

    await logger.logAdminAction(
      req.user,
      "Joylashuv tahrirlandi",
      `${location.name}`
    );

    res.json(location);
  } catch (error) {
    logger.error("Error updating location:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Delete location (soft delete)
 */
router.delete("/:id", async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    location.isActive = false;
    await location.save();

    await logger.logAdminAction(
      req.user,
      "Joylashuv o'chirildi",
      `${location.name}`
    );

    res.json({ success: true, message: "Location deleted" });
  } catch (error) {
    logger.error("Error deleting location:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get locations for bot (user-facing)
 */
router.get("/public/list", async (req, res) => {
  try {
    const locations = await Location.find({ isActive: true })
      .select("name nameUz nameCr nameRu latitude longitude timezone")
      .sort({ isDefault: -1, name: 1 });

    res.json(locations);
  } catch (error) {
    logger.error("Error fetching public locations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
