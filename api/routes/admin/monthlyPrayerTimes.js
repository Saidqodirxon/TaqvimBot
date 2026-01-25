const express = require("express");
const router = express.Router();
const MonthlyPrayerTime = require("../../models/MonthlyPrayerTime");
const Location = require("../../models/Location");
const logger = require("../../utils/logger");

// Get all monthly prayer times for a location
router.get("/:locationId", async (req, res) => {
  try {
    const { locationId } = req.params;
    const { month, year } = req.query;

    const query = { locationId };

    // Filter by month/year if provided
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const prayerTimes = await MonthlyPrayerTime.find(query)
      .sort({ date: 1 })
      .lean();

    logger.log(
      "API",
      `Monthly prayer times fetched for location ${locationId}: ${prayerTimes.length} records`
    );

    res.json(prayerTimes);
  } catch (error) {
    logger.error(
      "API",
      `Error fetching monthly prayer times: ${error.message}`
    );
    res.status(500).json({ error: error.message });
  }
});

// Get specific date prayer time
router.get("/:locationId/:date", async (req, res) => {
  try {
    const { locationId, date } = req.params;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const prayerTime = await MonthlyPrayerTime.findOne({
      locationId,
      date: targetDate,
    }).lean();

    if (!prayerTime) {
      return res
        .status(404)
        .json({ error: "Prayer time not found for this date" });
    }

    logger.log("API", `Prayer time fetched for ${locationId} on ${date}`);

    res.json(prayerTime);
  } catch (error) {
    logger.error("API", `Error fetching prayer time: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Add or update monthly prayer time
router.post("/:locationId", async (req, res) => {
  try {
    const { locationId } = req.params;
    const { date, hijriDate, timings } = req.body;

    // Validate location exists
    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    // Validate required fields
    if (!date || !timings) {
      return res.status(400).json({ error: "Date and timings are required" });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Check if already exists
    const existing = await MonthlyPrayerTime.findOne({
      locationId,
      date: targetDate,
    });

    if (existing) {
      // Update existing
      existing.hijriDate = hijriDate || existing.hijriDate;
      existing.timings = timings;
      await existing.save();

      logger.log(
        "API",
        `Updated monthly prayer time for ${locationId} on ${date}`
      );

      return res.json({ message: "Prayer time updated", data: existing });
    }

    // Create new
    const newPrayerTime = new MonthlyPrayerTime({
      locationId,
      date: targetDate,
      hijriDate: hijriDate || {
        day: 1,
        month: "Muharram",
        year: 1446,
      },
      timings,
    });

    await newPrayerTime.save();

    logger.log(
      "API",
      `Created monthly prayer time for ${locationId} on ${date}`
    );

    res
      .status(201)
      .json({ message: "Prayer time created", data: newPrayerTime });
  } catch (error) {
    logger.error("API", `Error saving prayer time: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Bulk create/update monthly prayer times
router.post("/:locationId/bulk", async (req, res) => {
  try {
    const { locationId } = req.params;
    const { prayerTimes } = req.body; // Array of {date, hijriDate, timings}

    // Validate location exists
    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    if (!Array.isArray(prayerTimes) || prayerTimes.length === 0) {
      return res.status(400).json({ error: "prayerTimes array is required" });
    }

    const results = {
      created: 0,
      updated: 0,
      errors: [],
    };

    for (const item of prayerTimes) {
      try {
        const { date, hijriDate, timings } = item;

        if (!date || !timings) {
          results.errors.push({ date, error: "Missing required fields" });
          continue;
        }

        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const existing = await MonthlyPrayerTime.findOne({
          locationId,
          date: targetDate,
        });

        if (existing) {
          existing.hijriDate = hijriDate || existing.hijriDate;
          existing.timings = timings;
          await existing.save();
          results.updated++;
        } else {
          await MonthlyPrayerTime.create({
            locationId,
            date: targetDate,
            hijriDate: hijriDate || { day: 1, month: "Muharram", year: 1446 },
            timings,
          });
          results.created++;
        }
      } catch (error) {
        results.errors.push({ date: item.date, error: error.message });
      }
    }

    logger.log(
      "API",
      `Bulk prayer times: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`
    );

    res.json({
      message: "Bulk operation completed",
      results,
    });
  } catch (error) {
    logger.error("API", `Error in bulk save: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Delete monthly prayer time
router.delete("/:locationId/:date", async (req, res) => {
  try {
    const { locationId, date } = req.params;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const result = await MonthlyPrayerTime.deleteOne({
      locationId,
      date: targetDate,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Prayer time not found" });
    }

    logger.log(
      "API",
      `Deleted monthly prayer time for ${locationId} on ${date}`
    );

    res.json({ message: "Prayer time deleted" });
  } catch (error) {
    logger.error("API", `Error deleting prayer time: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Delete all monthly prayer times for a location
router.delete("/:locationId", async (req, res) => {
  try {
    const { locationId } = req.params;

    const result = await MonthlyPrayerTime.deleteMany({ locationId });

    logger.log(
      "API",
      `Deleted ${result.deletedCount} monthly prayer times for location ${locationId}`
    );

    res.json({
      message: `Deleted ${result.deletedCount} prayer times`,
      count: result.deletedCount,
    });
  } catch (error) {
    logger.error("API", `Error deleting prayer times: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
