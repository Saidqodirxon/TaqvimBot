const mongoose = require("mongoose");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const Location = require("../../models/Location");
const PrayerTimeData = require("../../models/PrayerTimeData");
const MonthlyPrayerTime = require("../../models/MonthlyPrayerTime");

/**
 * Migrate data from PrayerTimeData to MonthlyPrayerTime
 * Matches locations by coordinates
 */
async function migrateToMonthlyPrayerTimes() {
  try {
    console.log("\n" + "=".repeat(70));
    console.log("🔄 MIGRATE PRAYER DATA TO MONTHLY COLLECTION");
    console.log("=".repeat(70) + "\n");

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB connected\n");

    // Get all locations
    const locations = await Location.find({}).lean();
    console.log(`📍 Found ${locations.length} locations\n`);

    // Get all prayer time data
    const prayerData = await PrayerTimeData.find({}).lean();
    console.log(`📊 Found ${prayerData.length} prayer time records\n`);

    if (prayerData.length === 0) {
      console.log("⚠️  No prayer data found in PrayerTimeData collection!");
      process.exit(0);
    }

    const stats = {
      processed: 0,
      matched: 0,
      created: 0,
      updated: 0,
      skipped: 0,
    };

    // Group prayer data by location
    const dataByLocation = {};
    for (const data of prayerData) {
      const key = `${data.latitude.toFixed(4)}_${data.longitude.toFixed(4)}`;
      if (!dataByLocation[key]) {
        dataByLocation[key] = [];
      }
      dataByLocation[key].push(data);
    }

    console.log(
      `📦 Grouped into ${Object.keys(dataByLocation).length} unique locations\n`
    );

    // Match with Location collection
    for (const location of locations) {
      const locationKey = `${location.latitude.toFixed(4)}_${location.longitude.toFixed(4)}`;
      const data = dataByLocation[locationKey];

      if (!data || data.length === 0) {
        console.log(`⚠️  ${location.nameUz}: No prayer data found`);
        stats.skipped++;
        continue;
      }

      console.log(`\n📍 ${location.nameUz}:`);
      console.log(`   Found ${data.length} prayer records`);

      let created = 0;
      let updated = 0;

      for (const item of data) {
        try {
          const targetDate = new Date(item.date);
          targetDate.setHours(0, 0, 0, 0);

          // Extract hijri date from createdAt or use default
          const hijriDate = item.hijriDate || {
            day: 1,
            month: "Muharram",
            year: 1446,
          };

          const existing = await MonthlyPrayerTime.findOne({
            locationId: location._id,
            date: targetDate,
          });

          const prayerTimeDoc = {
            locationId: location._id,
            date: targetDate,
            hijriDate: hijriDate,
            timings: {
              fajr: item.timings.Fajr || item.timings.fajr,
              sunrise: item.timings.Sunrise || item.timings.sunrise,
              dhuhr: item.timings.Dhuhr || item.timings.dhuhr,
              asr: item.timings.Asr || item.timings.asr,
              maghrib: item.timings.Maghrib || item.timings.maghrib,
              isha: item.timings.Isha || item.timings.isha,
            },
          };

          if (existing) {
            await MonthlyPrayerTime.updateOne(
              { _id: existing._id },
              { $set: prayerTimeDoc }
            );
            updated++;
          } else {
            await MonthlyPrayerTime.create(prayerTimeDoc);
            created++;
          }

          stats.processed++;
        } catch (error) {
          console.error(
            `   ❌ Error processing ${item.date}: ${error.message}`
          );
        }
      }

      console.log(`   ✅ Created: ${created}, Updated: ${updated}`);
      stats.created += created;
      stats.updated += updated;
      stats.matched++;
    }

    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(70));
    console.log(`   Locations matched: ${stats.matched}/${locations.length}`);
    console.log(`   Locations skipped: ${stats.skipped}`);
    console.log(`   Records processed: ${stats.processed}`);
    console.log(`   Records created: ${stats.created}`);
    console.log(`   Records updated: ${stats.updated}`);
    console.log("=".repeat(70) + "\n");

    // Verify
    const totalInNew = await MonthlyPrayerTime.countDocuments({});
    console.log(`✅ Total in MonthlyPrayerTime: ${totalInNew}\n`);

    // Show data range per location
    console.log("📅 DATA RANGE BY LOCATION:\n");
    for (const location of locations.slice(0, 10)) {
      const count = await MonthlyPrayerTime.countDocuments({
        locationId: location._id,
      });

      if (count > 0) {
        const first = await MonthlyPrayerTime.findOne({
          locationId: location._id,
        })
          .sort({ date: 1 })
          .lean();
        const last = await MonthlyPrayerTime.findOne({
          locationId: location._id,
        })
          .sort({ date: -1 })
          .lean();

        const firstDate = first.date.toISOString().split("T")[0];
        const lastDate = last.date.toISOString().split("T")[0];

        console.log(
          `   ${location.nameUz}: ${count} days (${firstDate} to ${lastDate})`
        );
      }
    }
    console.log();

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n⚠️  Operation interrupted");
  await mongoose.disconnect();
  process.exit(0);
});

migrateToMonthlyPrayerTimes();
