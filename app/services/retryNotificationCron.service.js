const cron = require("node-cron");
const axios = require("axios");
const db = require("../models");
const Challenger = db.challengers;
const NotificationLog = db.notificationLog;
const logger = require("../config/logger.config");

// image urls to send in the plan
const imageUrls = {
  "7 days":
    "https://daawat-rice-challenge.s3.ap-south-1.amazonaws.com/badge/bronze1.jpeg",
  "14 days":
    "https://daawat-rice-challenge.s3.ap-south-1.amazonaws.com/badge/silver1.jpeg",
  "21 days":
    "https://daawat-rice-challenge.s3.ap-south-1.amazonaws.com/badge/gold1.jpeg",
  "30 days":
    "https://daawat-rice-challenge.s3.ap-south-1.amazonaws.com/badge/diamond1.jpeg",
};

const template = {
  // allow single string or array of template names per duration
  "7 days": ["chlng_comp_7_zepto_10", "chlng_comp_7_zepto_15"],
  "14 days": ["chlng_comp_14_zepto_10", "challenge_complete_14days_zepto_15"],
  "21 days": ["chlng_comp_21_zepto_10", "chlng_comp_21_zepto_15"],
  "30 days": ["30days_chlng_comp_15", "30days_chlng_comp_10"],
};

const sendPlan = (challenger, url) => {
  return new Promise(async (resolve, reject) => {
    const { mobile, name, duration, countryCode } = challenger;
    try {
      // Support single template name or an array of template names per duration.
      const templateForDuration = template[duration] || template["7 days"];
      const templateName = Array.isArray(templateForDuration)
        ? templateForDuration[
            Math.floor(Math.random() * templateForDuration.length)
          ]
        : templateForDuration;

      const payload = {
        countryCode: countryCode,
        phoneNumber: mobile,
        type: "Template",
        template: {
          name: templateName,
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

// Main cron function
const retryNotificationCron = () => {
  // New cron: run every day at 18:30 IST to retry failed notifications from the previous 24h window
  cron.schedule(
    "00 18 * * *",
    // "*/10 * * * * *",
    async () => {
      try {
        await processFailedNotifications();
      } catch (error) {
        logger.error("Error in failed-notifications cron", {
          error: error.message,
          stack: error.stack,
        });
      }
    },
    { scheduled: true, timezone: "Asia/Kolkata" }
  );
};

// Process failed notifications in a 24-hour window and retry sending
const processFailedNotifications = async () => {
  try {
    logger.info("Starting failed notifications retry cron");

    // Define window: yesterday start (00:00:00.000) to yesterday end (23:59:59.999)
    const now = new Date();
    const yesterday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1
    );
    // start = yesterday 00:00:00.000
    const start = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      0,
      0,
      0,
      0
    );
    // end = yesterday 23:59:59.999
    const end = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
      23,
      59,
      59,
      999
    );

    const chunkSize = 100;
    let skip = 0;
    let hasMore = true;

    const baseMatch = {
      status: "Failed",
      retry_count: { $lt: 3 },
      updatedAt: { $gte: start, $lte: end },
    };
    while (hasMore) {
      const pipeline = [
        { $match: baseMatch },
        {
          $lookup: {
            from: "challangers",
            localField: "challenger_id",
            foreignField: "_id",
            as: "result",
          },
        },
        { $unwind: { path: "$result", preserveNullAndEmptyArrays: true } },
        { $skip: skip },
        { $limit: chunkSize },
      ];

      const docs = await NotificationLog.aggregate(pipeline);
      if (!docs.length) {
        hasMore = false;
        break;
      }

      for (const doc of docs) {
        try {
          const challenger = doc.result;

          const url = imageUrls[challenger.duration] || imageUrls["7 days"];
          await sendPlan(
            {
              ...challenger,
              countryCode: challenger.countryCode || "+91",
            },
            url
          );

          // mark the notification log as retried and increment retry_count
          await NotificationLog.updateOne(
            { _id: doc._id },
            {
              $set: {
                status: "RetrySent",
                updatedAt: new Date(),
              },
              $inc: { retry_count: 1 },
            }
          );
        } catch (err) {
          logger.error("Error retrying failed notification", {
            id: doc._id,
            error: err.message,
          });
        }
      }

      skip += chunkSize;
      // small pause
      await new Promise((r) => setTimeout(r, 500));
    }

    logger.info("Completed failed notifications retry cron");
  } catch (error) {
    logger.error("Error in processFailedNotifications", {
      error: error.message,
      stack: error.stack,
    });
  }
};

module.exports = {
  retryNotificationCron,
};
