const schedule = require("node-schedule");
const moment = require("moment-timezone");
const { getPrayerTimes } = require("./aladhan");
const { t, getUserLanguage } = require("./translator");
const User = require("../models/User");

// Store active reminder jobs
const activeJobs = new Map();

// Track sent reminders to prevent duplicates
// Key: `${userId}_${date}_${prayer}_${type}` -> timestamp
const sentReminders = new Map();
const SENT_REMINDER_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Clean old sent reminders periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [key, timestamp] of sentReminders.entries()) {
      if (now - timestamp > SENT_REMINDER_TTL) {
        sentReminders.delete(key);
      }
    }
  },
  60 * 60 * 1000
); // Clean every hour

/**
 * Check if reminder was already sent
 */
function wasReminderSent(userId, prayer, type) {
  const today = moment().format("YYYY-MM-DD");
  const key = `${userId}_${today}_${prayer}_${type}`;
  return sentReminders.has(key);
}

/**
 * Mark reminder as sent
 */
function markReminderSent(userId, prayer, type) {
  const today = moment().format("YYYY-MM-DD");
  const key = `${userId}_${today}_${prayer}_${type}`;
  sentReminders.set(key, Date.now());
}

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
      // Silently skip - don't spam logs
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
      {
        name: "Bomdod",
        nameKey: "prayer_fajr",
        time: prayerData.timings?.fajr,
      },
      {
        name: "Peshin",
        nameKey: "prayer_dhuhr",
        time: prayerData.timings?.dhuhr,
      },
      { name: "Asr", nameKey: "prayer_asr", time: prayerData.timings?.asr },
      {
        name: "Shom",
        nameKey: "prayer_maghrib",
        time: prayerData.timings?.maghrib,
      },
      {
        name: "Xufton",
        nameKey: "prayer_isha",
        time: prayerData.timings?.isha,
      },
    ];

    const userJobs = [];

    for (const prayer of prayers) {
      try {
        // Skip if time is undefined
        if (!prayer.time || typeof prayer.time !== "string") {
          console.warn(`Skipping ${prayer.name}: time is undefined`);
          continue;
        }

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

        // Schedule reminder BEFORE prayer time (only this one, not AT prayer time)
        const reminderTime = prayerTime
          .clone()
          .subtract(minutesBefore, "minutes");
        if (reminderTime.isAfter(moment.tz(timezone))) {
          const beforeJob = schedule.scheduleJob(
            reminderTime.toDate(),
            async () => {
              try {
                // Check if already sent (prevent duplicates)
                if (wasReminderSent(user.userId, prayer.name, "before")) {
                  console.log(
                    `⏭️ Skipping duplicate reminder for ${user.userId} - ${prayer.name}`
                  );
                  return;
                }

                // Mark as sent BEFORE sending
                markReminderSent(user.userId, prayer.name, "before");

                const message = await t(lang, "reminder_before_prayer", {
                  prayer: prayer.name,
                  minutes: minutesBefore,
                  time: prayer.time,
                });

                // Send with retry and rate limit handling
                try {
                  await bot.telegram.sendMessage(user.userId, message, {
                    reply_markup: {
                      inline_keyboard: [
                        [
                          {
                            text: "🔕 Eslatmalarni o'chirish",
                            callback_data: "disable_all_reminders",
                          },
                        ],
                      ],
                    },
                  });
                } catch (sendError) {
                  // Handle Telegram rate limits
                  if (sendError.response?.error_code === 429) {
                    const retryAfter =
                      sendError.response.parameters?.retry_after || 1;
                    console.warn(
                      `⚠️ Rate limited for user ${user.userId}. Retry after ${retryAfter}s`
                    );
                    // Wait and retry once
                    await new Promise((resolve) =>
                      setTimeout(resolve, retryAfter * 1000)
                    );
                    await bot.telegram.sendMessage(user.userId, message, {
                      reply_markup: {
                        inline_keyboard: [
                          [
                            {
                              text: "🔕 Eslatmalarni o'chirish",
                              callback_data: "disable_all_reminders",
                            },
                          ],
                        ],
                      },
                    });
                  } else if (sendError.response?.error_code === 403) {
                    // User blocked the bot
                    console.warn(
                      `⚠️ User ${user.userId} blocked the bot. Disabling reminders.`
                    );
                    const User = require("../models/User");
                    await User.updateOne(
                      { userId: user.userId },
                      {
                        $set: {
                          "reminderSettings.enabled": false,
                          is_block: true,
                        },
                      }
                    );
                    cancelUserReminders(user.userId);
                  } else {
                    throw sendError;
                  }
                }
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

        // NOTE: Removed duplicate "AT prayer time" notification
        // Users only get ONE notification per prayer (minutesBefore)
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
      // Silent - no log spam
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
 * Check if user already has scheduled reminders
 * @param {Number} userId - Telegram user ID
 * @returns {Boolean}
 */
function isUserScheduled(userId) {
  return activeJobs.has(userId);
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
    console.log(`✅ Cancelled reminders for user ${userId}`);
  }
}

/**
 * Initialize reminders for all users with reminders enabled
 * OPTIMIZED: Lazy loading - reminders scheduled on-demand
 * @param {Object} bot - Telegraf bot instance
 */
async function initializeAllReminders(bot) {
  try {
    // Just count users, don't load all at once
    const count = await User.countDocuments({
      "reminderSettings.enabled": true,
      is_block: false,
      location: { $exists: true, $ne: null },
      "location.latitude": { $exists: true },
      "location.longitude": { $exists: true },
    });

    console.log(`🔔 Reminder system ready for ${count} users (lazy loading)`);
    console.log(`   Reminders will be scheduled when users interact with bot`);

    // Store bot reference globally for lazy scheduling
    global.reminderBot = bot;

    // Optional: Schedule a background job to initialize top active users
    // This runs in background after bot starts (non-blocking)
    setImmediate(async () => {
      try {
        // Load only recently active users (last 7 days)
        const recentUsers = await User.find({
          "reminderSettings.enabled": true,
          is_block: false,
          location: { $exists: true },
          "location.latitude": { $exists: true },
          last_active: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }).limit(100);

        let scheduled = 0;
        for (const user of recentUsers) {
          try {
            await schedulePrayerReminders(bot, user);
            scheduled++;
          } catch (err) {
            // Silently skip failed users
          }
          // Small delay
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        console.log(`✅ Pre-scheduled reminders for ${scheduled} active users`);
      } catch (err) {
        console.error("Background reminder init error:", err.message);
      }
    });
  } catch (error) {
    console.error("Error initializing reminder system:", error);
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
  isUserScheduled,
};
