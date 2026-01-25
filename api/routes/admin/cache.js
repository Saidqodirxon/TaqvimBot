const express = require("express");
const router = express.Router();
const PrayerTimeCache = require("../../models/PrayerTimeCache");
const { authMiddleware } = require("../../middleware/adminAuth");
const {
  getPrayerTimes,
  savePrayerTimeToCache,
} = require("../../utils/aladhan");

/**
 * Get all cached prayer times with pagination
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await PrayerTimeCache.countDocuments();
    const caches = await PrayerTimeCache.find()
      .sort({ fetchedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      caches,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get caches error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get cache statistics
 */
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const now = new Date();

    const stats = {
      total: await PrayerTimeCache.countDocuments(),
      active: await PrayerTimeCache.countDocuments({ expiresAt: { $gt: now } }),
      expired: await PrayerTimeCache.countDocuments({
        expiresAt: { $lte: now },
      }),
      bySource: await PrayerTimeCache.aggregate([
        { $group: { _id: "$source", count: { $sum: 1 } } },
      ]),
      uniqueLocations: await PrayerTimeCache.distinct("locationKey").then(
        (arr) => arr.length
      ),
      oldestCache: await PrayerTimeCache.findOne().sort({ fetchedAt: 1 }),
      newestCache: await PrayerTimeCache.findOne().sort({ fetchedAt: -1 }),
    };

    res.json(stats);
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Refresh cache for specific location
 */
router.post("/refresh", authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, method = 3, school = 1, date } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    // Fetch fresh data from API
    const prayerData = await getPrayerTimes(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(method),
      parseInt(school),
      0,
      1,
      date ? new Date(date) : null
    );

    if (prayerData.success) {
      res.json({
        message: "Cache refreshed successfully",
        data: prayerData,
      });
    } else {
      res.status(500).json({
        error: "Failed to fetch prayer times",
        details: prayerData.error,
      });
    }
  } catch (error) {
    console.error("Refresh cache error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update cache expiration time
 */
router.patch("/:id/expiration", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { expiresAt } = req.body;

    if (!expiresAt) {
      return res.status(400).json({ error: "expiresAt required" });
    }

    const cache = await PrayerTimeCache.findByIdAndUpdate(
      id,
      { expiresAt: new Date(expiresAt) },
      { new: true }
    );

    if (!cache) {
      return res.status(404).json({ error: "Cache not found" });
    }

    res.json({
      message: "Expiration updated successfully",
      cache,
    });
  } catch (error) {
    console.error("Update expiration error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete specific cache
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const cache = await PrayerTimeCache.findByIdAndDelete(id);

    if (!cache) {
      return res.status(404).json({ error: "Cache not found" });
    }

    res.json({
      message: "Cache deleted successfully",
      cache,
    });
  } catch (error) {
    console.error("Delete cache error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Clear all expired caches
 */
router.post("/clear-expired", authMiddleware, async (req, res) => {
  try {
    const result = await PrayerTimeCache.deleteMany({
      expiresAt: { $lte: new Date() },
    });

    res.json({
      message: "Expired caches cleared successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Clear expired error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Clear all caches
 */
router.post("/clear-all", authMiddleware, async (req, res) => {
  try {
    const result = await PrayerTimeCache.deleteMany({});

    res.json({
      message: "All caches cleared successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Clear all error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Bulk refresh - refresh caches for all active locations
 */
router.post("/bulk-refresh", authMiddleware, async (req, res) => {
  try {
    const Location = require("../../models/Location");
    const locations = await Location.find({ isActive: true });

    let successCount = 0;
    let failCount = 0;

    for (const location of locations) {
      try {
        await getPrayerTimes(
          location.latitude,
          location.longitude,
          3, // MWL
          1, // Hanafi
          0,
          1
        );
        successCount++;
      } catch (error) {
        console.error(`Failed to refresh ${location.name}:`, error.message);
        failCount++;
      }
    }

    res.json({
      message: "Bulk refresh completed",
      total: locations.length,
      success: successCount,
      failed: failCount,
    });
  } catch (error) {
    console.error("Bulk refresh error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
