const schedule = require("node-schedule");
const moment = require("moment-timezone");
const { getPrayerTimes } = require("./aladhan");
const { t, getUserLanguage } = require("./translator");
const User = require("../models/User");

// Store active reminder jobs
const activeJobs = new Map();

/**
 * Schedule prayer reminders for a user
 * @param {Object} bot - Telegraf bot instance
 * @param {Object} user - User document from database
 */
async function schedulePrayerReminders(bot, user) {
  try {
    // Cancel existing jobs for this user
    cancelUserReminders(user.userId);

    // Check if reminders are enabled
    if (!user.reminderSettings?.enabled) {
      return;
    }

    // ❗ Location MAJBURIY - default yo'q
    if (!user.location || !user.location.latitude || !user.location.longitude) {
      console.warn(
        `⚠️ User ${user.userId} has no location set, skipping reminders`
      );
      return;
    }

    const latitude = user.location.latitude;
    const longitude = user.location.longitude;
    const timezone = user.location.timezone || "Asia/Tashkent";
    const lang = getUserLanguage(user);
    const minutesBefore = user.reminderSettings?.minutesBefore || 15;

    // Get today's prayer times
    let prayerData;
    try {
      prayerData = await getPrayerTimes(latitude, longitude);
      if (!prayerData.success) {
        console.error(`Failed to get prayer times for user ${user.userId}`);
        return;
      }
    } catch (prayerError) {
      console.error(
        `Prayer time fetch error for user ${user.userId}:`,
        prayerError.message
      );
      // DO NOT throw - just skip this user's reminders
      return;
    }

    const prayers = [
      { name: "Bomdod", nameKey: "prayer_fajr", time: prayerData.timings.fajr },
      {
        name: "Peshin",
        nameKey: "prayer_dhuhr",
        time: prayerData.timings.dhuhr,
      },
      { name: "Asr", nameKey: "prayer_asr", time: prayerData.timings.asr },
      {
        name: "Shom",
        nameKey: "prayer_maghrib",
        time: prayerData.timings.maghrib,
      },
      { name: "Xufton", nameKey: "prayer_isha", time: prayerData.timings.isha },
    ];

    const userJobs = [];

    for (const prayer of prayers) {
      try {
        const [hours, minutes] = prayer.time.split(":").map(Number);
        const prayerTime = moment
          .tz(timezone)
          .hours(hours)
          .minutes(minutes)
          .seconds(0);

        // Skip if prayer time has already passed today
        if (prayerTime.isBefore(moment.tz(timezone))) {
          continue;
        }

        // Schedule reminder BEFORE prayer time
        const reminderTime = prayerTime
          .clone()
          .subtract(minutesBefore, "minutes");
        if (reminderTime.isAfter(moment.tz(timezone))) {
          const beforeJob = schedule.scheduleJob(
            reminderTime.toDate(),
            async () => {
              try {
                const message = await t(lang, "reminder_before_prayer", {
                  prayer: prayer.name,
                  minutes: minutesBefore,
                  time: prayer.time,
                });
                await bot.telegram.sendMessage(user.userId, message);
              } catch (error) {
                console.error(
                  `Error sending before-prayer reminder to ${user.userId}:`,
                  error.message
                );
              }
            }
          );
          userJobs.push(beforeJob);
        }

        // Schedule reminder AT prayer time
        if (user.reminderSettings?.notifyAtPrayerTime !== false) {
          const atJob = schedule.scheduleJob(prayerTime.toDate(), async () => {
            try {
              const message = await t(lang, "reminder_prayer_time", {
                prayer: prayer.name,
                time: prayer.time,
              });
              await bot.telegram.sendMessage(user.userId, message);
            } catch (error) {
              console.error(
                `Error sending at-prayer reminder to ${user.userId}:`,
                error.message
              );
            }
          });
          userJobs.push(atJob);
        }
      } catch (error) {
        console.error(
          `Error scheduling reminder for ${prayer.name}:`,
          error.message
        );
      }
    }

    // Store jobs for this user
    if (userJobs.length > 0) {
      activeJobs.set(user.userId, userJobs);
      console.log(
        `✅ Scheduled ${userJobs.length} reminders for user ${user.userId}`
      );
    }

    // Schedule a job at midnight to reschedule for the next day
    const midnight = moment.tz(timezone).add(1, "day").startOf("day").toDate();
    const midnightJob = schedule.scheduleJob(midnight, async () => {
      const updatedUser = await User.findOne({ userId: user.userId });
      if (updatedUser) {
        await schedulePrayerReminders(bot, updatedUser);
      }
    });
    userJobs.push(midnightJob);
  } catch (error) {
    console.error(
      `Error in schedulePrayerReminders for user ${user.userId}:`,
      error
    );
  }
}

/**
 * Cancel all reminders for a specific user
 * @param {Number} userId - Telegram user ID
 */
function cancelUserReminders(userId) {
  const jobs = activeJobs.get(userId);
  if (jobs) {
    jobs.forEach((job) => {
      try {
        job.cancel();
      } catch (error) {
        console.error(`Error cancelling job:`, error.message);
      }
    });
    activeJobs.delete(userId);
  }
}

/**
 * Initialize reminders for all users with reminders enabled
 * @param {Object} bot - Telegraf bot instance
 */
async function initializeAllReminders(bot) {
  try {
    const users = await User.find({
      "reminderSettings.enabled": true,
      is_block: false,
    });

    console.log(`🔔 Initializing reminders for ${users.length} users...`);

    for (const user of users) {
      try {
        await schedulePrayerReminders(bot, user);
      } catch (userError) {
        console.error(
          `Failed to initialize reminders for user ${user.userId}:`,
          userError.message
        );
        // Continue with next user - DO NOT throw
      }
      // Small delay to avoid overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`✅ Reminders initialized for all users`);
  } catch (error) {
    console.error("Error initializing reminders:", error);
    // DO NOT throw - bot must continue
  }
}

/**
 * Update reminder settings for a user and reschedule
 * @param {Object} bot - Telegraf bot instance
 * @param {Number} userId - Telegram user ID
 * @param {Object} newSettings - New reminder settings
 */
async function updateUserReminders(bot, userId, newSettings) {
  try {
    const user = await User.findOneAndUpdate(
      { userId },
      { $set: { reminderSettings: newSettings } },
      { new: true }
    );

    if (!user) {
      throw new Error("User not found");
    }

    // Reschedule reminders with new settings
    await schedulePrayerReminders(bot, user);

    return user;
  } catch (error) {
    console.error(`Error updating reminders for user ${userId}:`, error);
    throw error;
  }
}

module.exports = {
  schedulePrayerReminders,
  cancelUserReminders,
  initializeAllReminders,
  updateUserReminders,
};
