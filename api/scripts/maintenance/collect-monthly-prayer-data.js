const mongoose = require("mongoose");
const axios = require("axios");
const moment = require("moment-timezone");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const Location = require("../../models/Location");
const MonthlyPrayerTime = require("../../models/MonthlyPrayerTime");

/**
 * Collect monthly prayer times data for all locations
 * Uses Aladhan API to fetch prayer times
 */
async function collectMonthlyPrayerData() {
  try {
    console.log("\n" + "=".repeat(70));
    console.log("📊 MONTHLY PRAYER DATA COLLECTION");
    console.log("=".repeat(70) + "\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ MongoDB connected\n");

    // Get all locations
    const locations = await Location.find({}).lean();
    console.log(`📍 Found ${locations.length} locations\n`);

    if (locations.length === 0) {
      console.log("⚠️  No locations found! Please add locations first.");
      process.exit(0);
    }

    // Ask user for date range
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    console.log(`📅 Collecting data for: ${currentMonth}/${currentYear}`);
    console.log(`   (Current month and year)\n`);

    const stats = {
      locations: locations.length,
      totalDays: 0,
      created: 0,
      updated: 0,
      errors: 0,
    };

    // Process each location
    for (const location of locations) {
      console.log(`\n📍 Processing: ${location.nameUz || location.name}`);
      console.log(
        `   Coordinates: ${location.latitude}, ${location.longitude}`
      );

      try {
        // Get number of days in month
        const daysInMonth = moment()
          .year(currentYear)
          .month(currentMonth - 1)
          .daysInMonth();
        stats.totalDays += daysInMonth;

        let daySuccess = 0;
        let dayError = 0;

        // Fetch each day
        for (let day = 1; day <= daysInMonth; day++) {
          try {
            const dateStr = `${day.toString().padStart(2, "0")}-${currentMonth.toString().padStart(2, "0")}-${currentYear}`;

            // Fetch from Aladhan API
            const response = await axios.get(
              `https://api.aladhan.com/v1/timings/${dateStr}`,
              {
                params: {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  method: 3, // MWL
                  school: 0, // Shafi
                },
                timeout: 10000,
              }
            );

            if (response.data.code !== 200 || !response.data.data) {
              console.error(`   ❌ Day ${day}: API error`);
              dayError++;
              continue;
            }

            const data = response.data.data;
            const timings = data.timings;
            const hijri = data.date.hijri;

            // Prepare date
            const targetDate = new Date(currentYear, currentMonth - 1, day);
            targetDate.setHours(0, 0, 0, 0);

            // Check if exists
            const existing = await MonthlyPrayerTime.findOne({
              locationId: location._id,
              date: targetDate,
            });

            const prayerData = {
              locationId: location._id,
              date: targetDate,
              hijriDate: {
                day: parseInt(hijri.day),
                month: hijri.month.en,
                year: parseInt(hijri.year),
              },
              timings: {
                fajr: timings.Fajr,
                sunrise: timings.Sunrise,
                dhuhr: timings.Dhuhr,
                asr: timings.Asr,
                maghrib: timings.Maghrib,
                isha: timings.Isha,
              },
            };

            if (existing) {
              await MonthlyPrayerTime.updateOne(
                { _id: existing._id },
                { $set: prayerData }
              );
              stats.updated++;
            } else {
              await MonthlyPrayerTime.create(prayerData);
              stats.created++;
            }

            daySuccess++;

            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`   ❌ Day ${day}: ${error.message}`);
            dayError++;
            stats.errors++;
          }
        }

        console.log(`   ✅ Success: ${daySuccess}/${daysInMonth} days`);
        if (dayError > 0) {
          console.log(`   ⚠️  Errors: ${dayError} days`);
        }
      } catch (error) {
        console.error(`   ❌ Location error: ${error.message}`);
        stats.errors++;
      }
    }

    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("📊 COLLECTION SUMMARY");
    console.log("=".repeat(70));
    console.log(`   Locations processed: ${stats.locations}`);
    console.log(`   Total days: ${stats.totalDays}`);
    console.log(`   Created: ${stats.created}`);
    console.log(`   Updated: ${stats.updated}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log("=".repeat(70) + "\n");

    // Verify data
    const totalRecords = await MonthlyPrayerTime.countDocuments({});
    console.log(`✅ Total records in database: ${totalRecords}\n`);

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

collectMonthlyPrayerData();
