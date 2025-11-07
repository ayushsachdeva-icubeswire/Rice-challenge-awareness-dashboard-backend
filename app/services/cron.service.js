const cron = require("node-cron");
const axios = require("axios");
const db = require("../models");
const Challenger = db.challengers;
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
// Helper function to extract number of days from duration string
const extractDays = (duration) => {
  const match = duration.match(/(\d+)/);
  return match ? parseInt(match[0]) : 0;
};

// Helper function to check if today is a reminder day (7th, 14th, 21st, or 30th)
const isBulkReminderDay = () => {
  const today = new Date();
  const dayOfMonth = today.getDate();
  return [8, 15, 22, 30].includes(dayOfMonth);
};

// Helper function to check if reminder is needed for post-Nov challengers
const needsReminder = (challenger, durationDays) => {
  if (challenger.reminderSent) {
    return false;
  }

  const lastUpdate = new Date(challenger.updatedAt);
  const daysSinceUpdate = Math.floor(
    (new Date() - lastUpdate) / (1000 * 60 * 60 * 24)
  );
  return daysSinceUpdate >= durationDays;
};

const sendPlan = (mobile, name, url, duration, countryCode) => {
  return new Promise(async (resolve, reject) => {
    try {
      const payload = {
        countryCode: countryCode,
        phoneNumber: mobile,
        type: "Template",
        template: {
          name: "challenge_complete_7days",
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
        challenger.mobile,
        challenger.name,
        url,
        challenger.duration,
        challenger.countryCode || "+91"
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

    const chunkSize = 10;
    let skip = 0;

    // Base query for post-November challengers
    const baseQuery = {
      otpVerified: true,
      pdf: { $exists: true, $ne: null },
      updatedAt: { $gte: new Date("2025-11-01") },
      reminderSent: { $ne: true },
    };

    // Get unique mobile numbers with their latest records
    const uniqueChallengers = await Challenger.aggregate([
      { $match: baseQuery },
      {
        $sort: {
          mobile: 1, // Sort by mobile first
          updatedAt: -1, // Then by updatedAt in descending order
        },
      },
      {
        $group: {
          _id: "$mobile",
          doc: { $first: "$$ROOT" }, // Get the first (latest) document for each mobile
        },
      },
      { $replaceRoot: { newRoot: "$doc" } }, // Replace root to get back the original document structure
    ]);

    const totalCount = uniqueChallengers.length;
    const allChallengers = uniqueChallengers; // Store all challengers

    while (skip < totalCount) {
      const challengers = allChallengers.slice(skip, skip + chunkSize);

      const eligibleChallengers = challengers.filter((c) =>
        needsReminder(c, extractDays(c.duration))
      );
      await processChallengers(eligibleChallengers);

      skip += chunkSize;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger.info("Completed daily reminder cron for post-November challengers", {
      totalProcessed: totalCount,
    });
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

    const chunkSize = 10;
    let skip = 0;

    // Base query for pre-November challengers
    const baseQuery = {
      otpVerified: true,
      pdf: { $exists: true, $ne: null },
      reminderSent: { $ne: true },
      updatedAt: { $lt: new Date("2025-11-01") },
    };

    // Get unique mobile numbers with their latest records
    const uniqueChallengers = await Challenger.aggregate([
      { $match: baseQuery },
      {
        $sort: {
          mobile: 1, // Sort by mobile first
          updatedAt: -1, // Then by updatedAt in descending order
        },
      },
      {
        $group: {
          _id: "$mobile",
          doc: { $first: "$$ROOT" }, // Get the first (latest) document for each mobile
        },
      },
      { $replaceRoot: { newRoot: "$doc" } }, // Replace root to get back the original document structure
    ]);

    const totalCount = uniqueChallengers.length;
    const allChallengers = uniqueChallengers; // Store all challengers

    while (skip < totalCount) {
      const challengers = allChallengers.slice(skip, skip + chunkSize);

      const eligibleChallengers = challengers.filter((c) =>
        needsReminder(c, extractDays(c.duration))
      );
      await processChallengers(eligibleChallengers);

      skip += chunkSize;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger.info("Completed bulk reminder cron for pre-November challengers", {
      totalProcessed: totalCount,
    });
  } catch (error) {
    logger.error("Error in pre-November reminder cron job", {
      error: error.message,
      stack: error.stack,
    });
  }
};

// Main cron function
const startReminderCron = () => {
  // Run every day at 12:00 AM for both types of reminders
  cron.schedule(
    "0 0 * * *",
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
