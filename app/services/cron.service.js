const cron = require("node-cron");
const axios = require("axios");
const db = require("../models");
const Challenger = db.challengers;
const NotificationLog = db.notificationLog;
const logger = require("../config/logger.config");

// image urls to send in the plan
const imageUrls = {
  "7 days":
    "https://daawat-rice-challenge.s3.ap-south-1.amazonaws.com/badge/bronze.jpeg",
  "14 days":
    "https://daawat-rice-challenge.s3.ap-south-1.amazonaws.com/badge/silver.jpeg",
  "21 days":
    "https://daawat-rice-challenge.s3.ap-south-1.amazonaws.com/badge/gold.jpeg",
  "30 days":
    "https://daawat-rice-challenge.s3.ap-south-1.amazonaws.com/badge/platinum.jpeg",
};

const template = {
  "7 days": "challenge_complete_7days",
  "14 days": "challenge_complete_14days",
  "21 days": "challenge_complete_21days",
  "30 days": "challenge_complete_30days",
};
// Helper function to extract number of days from duration string
const extractDays = (duration) => {
  const match = duration.match(/(\d+)/);
  return match ? parseInt(match[0]) : 0;
};

// Helper function to check if today is a reminder day (8th, 15th, 22nd, 31st or 1st)
const isBulkReminderDay = () => {
  const today = new Date();
  const dayOfMonth = today.getDate();

  // Always process on 8th, 15th, and 22nd
  if ([8, 15, 22].includes(dayOfMonth)) {
    return true;
  }

  // For 31st or 1st (if previous month didn't have 31 days)
  if (dayOfMonth === 31) {
    return true;
  }

  // Check if it's 1st and previous month didn't have 31 days
  if (dayOfMonth === 1) {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfPrevMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      0
    ).getDate();
    return lastDayOfPrevMonth < 31;
  }

  return false;
};

// Helper function to check if reminder is needed for post-Nov challengers
const needsReminder = (challenger, durationDays) => {
  const lastUpdate = new Date(challenger.updatedAt);
  const daysSinceUpdate = Math.floor(
    (new Date() - lastUpdate) / (1000 * 60 * 60 * 24)
  );
  return daysSinceUpdate >= durationDays;
};

const sendPlan = (challenger, url) => {
  return new Promise(async (resolve, reject) => {
    const { mobile, name, duration, countryCode } = challenger;
    try {
      const payload = {
        countryCode: countryCode,
        phoneNumber: mobile,
        type: "Template",
        template: {
          name: template[duration] || template["7 days"],
          languageCode: "en",
          headerValues: [url],
          bodyValues: [name],
        },
      };
      // Example using axios
      const response = await axios.post(
        "https://api.interakt.ai/v1/public/message/",
        payload,
        {
          headers: {
            Authorization: `Basic ${process.env.Interakt_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data.result) {
        logger.info("WhatsApp message sent successfully", {
          mobile,
          name,
          duration,
          responseData: response.data,
        });

        // Create notification log
        try {
          const notificationLog = new NotificationLog({
            challenger_id: challenger._id, // We'll need to pass challenger object to sendPlan
            mobile: mobile,
            duration: duration,
            response_data: response.data,
            response_id: response.data.id ?? "",
          });
          await notificationLog.save();
        } catch (logError) {
          logger.error("Error saving notification log", {
            error: logError.message,
            mobile,
            duration,
            challengerId: challenger._id,
          });
        }

        resolve(response.data); // return API response
      } else {
        logger.error("Failed to send WhatsApp message", {
          mobile,
          name,
          duration,
          responseData: response.data,
        });
        // Send email notification on API failure
        reject(new Error("Failed to send WhatsApp message"));
      }
    } catch (error) {
      logger.error("Failed to send WhatsApp message", {
        mobile,
        name,
        duration,
      });
      reject(error); // reject promise on failure
    }
  });
};

// Process challengers in chunks
const processChallengers = async (challengers) => {
  for (const challenger of challengers) {
    try {
      const url = imageUrls[challenger.duration] || imageUrls["7 days"];
      await sendPlan(
        {
          ...challenger,
          countryCode: challenger.countryCode || "+91",
        },
        url
      );

      // Update the challenger with reminder tracking
      await Challenger.findByIdAndUpdate(challenger._id, {
        updatedAt: new Date(),
        reminderSent: true,
      });

      logger.info("Reminder sent successfully", {
        challengerId: challenger._id,
        name: challenger.name,
        mobile: challenger.mobile,
        duration: challenger.duration,
        reminderCount: (challenger.reminderHistory?.length || 0) + 1,
      });
    } catch (error) {
      logger.error("Error sending reminder", {
        challengerId: challenger._id,
        error: error.message,
        stack: error.stack,
      });
    }
  }
};

// Process post-November challengers (daily check)
const processPostNovemberChallengers = async () => {
  try {
    logger.info("Starting daily reminder cron for post-November challengers");

    const chunkSize = 100; // You can tune this depending on memory / performance
    let skip = 0;

    const baseQuery = {
      otpVerified: true,
      pdf: { $exists: true, $ne: null, $ne: "" },
      updatedAt: { $gte: new Date("2025-11-01") },
      reminderSent: { $ne: true },
    };

    let hasMore = true;
    while (hasMore) {
      // Paginated aggregation to fetch limited unique challengers
      const challengers = await Challenger.aggregate([
        { $match: baseQuery },
        {
          $sort: {
            mobile: 1,
            updatedAt: -1,
          },
        },
        {
          $group: {
            _id: "$mobile",
            doc: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$doc" } },
        { $skip: skip },
        { $limit: chunkSize },
      ]);

      if (!challengers.length) {
        hasMore = false;
        break;
      }

      // Filter eligible challengers and process
      const eligibleChallengers = challengers.filter((c) =>
        needsReminder(c, extractDays(c.duration))
      );

      await processChallengers(eligibleChallengers);

      skip += chunkSize;

      // Optional: small delay to reduce DB load
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger.info("Completed daily reminder cron for post-November challengers");
  } catch (error) {
    logger.error("Error in post-November reminder cron job", {
      error: error.message,
      stack: error.stack,
    });
  }
};

// Process pre-November challengers (on specific dates)
const processPreNovemberChallengers = async () => {
  try {
    if (!isBulkReminderDay()) {
      logger.info("Not a bulk reminder day, skipping pre-November challengers");
      return;
    }

    logger.info("Starting bulk reminder cron for pre-November challengers");

    const chunkSize = 100; // you can adjust based on memory/performance
    let skip = 0;
    let hasMore = true;

    const baseQuery = {
      otpVerified: true,
      pdf: { $exists: true, $ne: null, $ne: "" },
      reminderSent: { $ne: true },
      // TODO:: to discuss with team
      updatedAt: { $lt: new Date("2025-11-01") },
    };

    while (hasMore) {
      // Paginated aggregation directly at DB level
      const challengers = await Challenger.aggregate([
        { $match: baseQuery },
        {
          $sort: {
            mobile: 1,
            updatedAt: -1,
          },
        },
        {
          $group: {
            _id: "$mobile",
            doc: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$doc" } },
        { $skip: skip },
        { $limit: chunkSize },
      ]);

      if (!challengers.length) {
        hasMore = false;
        break;
      }

      const eligibleChallengers = challengers.filter((c) =>
        needsReminder(c, extractDays(c.duration))
      );

      await processChallengers(eligibleChallengers);

      skip += chunkSize;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger.info("Completed bulk reminder cron for pre-November challengers");
  } catch (error) {
    logger.error("Error in pre-November reminder cron job", {
      error: error.message,
      stack: error.stack,
    });
  }
};

// Main cron function
const startReminderCron = () => {
  // Run every day at 12:00 PM for both types of reminders
  cron.schedule(
    "0 12 * * *",
    async () => {
      try {
        // Process post-November challengers daily
        await processPostNovemberChallengers();

        // Process pre-November challengers only on specific dates
        await processPreNovemberChallengers();
      } catch (error) {
        logger.error("Error in main cron scheduler", {
          error: error.message,
          stack: error.stack,
        });
      }
    },
    {
      scheduled: true,
      timezone: "Asia/Kolkata",
    }
  );
};

module.exports = {
  startReminderCron,
};
