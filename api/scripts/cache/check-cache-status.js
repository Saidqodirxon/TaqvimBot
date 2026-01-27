const mongoose = require("mongoose");
require("dotenv").config();
const PrayerTimeCache = require("./models/PrayerTimeCache");
const Location = require("./models/Location");

async function checkCacheStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");

    // Get total cache count
    const totalCaches = await PrayerTimeCache.countDocuments();
    console.log(`\n📊 Total cache entries: ${totalCaches}`);

    // Get unique cities with cache
    const citiesWithCache = await PrayerTimeCache.aggregate([
      {
        $group: {
          _id: "$locationKey",
          count: { $sum: 1 },
          dates: { $addToSet: "$date" },
        },
      },
      {
        $project: {
          locationKey: "$_id",
          cacheCount: "$count",
          dateCount: { $size: "$dates" },
        },
      },
      { $sort: { cacheCount: -1 } },
    ]);

    console.log(`\n🌍 Cities with cache data: ${citiesWithCache.length}`);

    // Show top 10 cities with most cache
    console.log("\n📍 Top 10 cities by cache count:");
    citiesWithCache.slice(0, 10).forEach((city, i) => {
      console.log(
        `${i + 1}. ${city.locationKey}: ${city.cacheCount} entries (${city.dateCount} unique dates)`
      );
    });

    // Get all active locations from database
    const allLocations = await Location.find({ isActive: true }).select(
      "name_uz name_ru coordinates"
    );
    console.log(
      `\n🏙️ Total active locations in database: ${allLocations.length}`
    );

    // Find locations without cache
    const locationKeys = allLocations
      .filter((loc) => loc.coordinates && loc.coordinates.latitude)
      .map(
        (loc) =>
          `${loc.coordinates.latitude.toFixed(4)}_${loc.coordinates.longitude.toFixed(4)}`
      );

    const cachedKeys = citiesWithCache.map((c) => c.locationKey);
    const missingLocations = allLocations.filter((loc) => {
      if (!loc.coordinates || !loc.coordinates.latitude) return true;
      const key = `${loc.coordinates.latitude.toFixed(4)}_${loc.coordinates.longitude.toFixed(4)}`;
      return !cachedKeys.includes(key);
    });

    console.log(`\n❌ Locations without cache: ${missingLocations.length}`);
    if (missingLocations.length > 0) {
      console.log("\nMissing locations:");
      missingLocations.slice(0, 20).forEach((loc, i) => {
        console.log(`${i + 1}. ${loc.name_uz} (${loc.name_ru})`);
      });
      if (missingLocations.length > 20) {
        console.log(`... and ${missingLocations.length - 20} more`);
      }
    }

    // Check date range for cached data
    const dateStats = await PrayerTimeCache.aggregate([
      {
        $group: {
          _id: null,
          minDate: { $min: "$date" },
          maxDate: { $max: "$date" },
        },
      },
    ]);

    if (dateStats.length > 0) {
      const { minDate, maxDate } = dateStats[0];
      console.log(`\n📅 Date range: ${minDate} to ${maxDate}`);

      // Calculate days
      const start = new Date(minDate);
      const end = new Date(maxDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      console.log(`📆 Days covered: ${days} days`);
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY:");
    console.log("=".repeat(60));
    console.log(`Total locations in DB: ${allLocations.length}`);
    console.log(`Locations with cache: ${citiesWithCache.length}`);
    console.log(`Locations without cache: ${missingLocations.length}`);
    console.log(`Total cache entries: ${totalCaches}`);
    console.log(
      `Average entries per cached location: ${citiesWithCache.length > 0 ? Math.round(totalCaches / citiesWithCache.length) : 0}`
    );

    mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkCacheStatus();
