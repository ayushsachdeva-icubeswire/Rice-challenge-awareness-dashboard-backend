const cron = require("node-cron");
const axios = require("axios");
const db = require("../models");
const Challenger = db.challengers;
const NotificationLog = db.notificationLog;
const logger = require("../config/logger.config");

// not allowed mobiles
const blockedMobiles = [
  "9029616245",
  "7406176253",
  "9761987858",
  "9761987858",
  "9130200792",
  "8341218165",
  "9761987858",
  "8961269488",
  "9131128364",
  "9341466506",
  "9100410621",
  "9040959819",
  "8005766418",
  "6392290640",
  "9654446339",
  "9461650054",
  "7827834256",
  "8447328702",
  "9717912630",
  "7503618974",
  "9871707389",
  "9212707554",
  "7023381384",
  "9711571107",
  "8587088474",
  "9873933451",
  "7503434376",
  "9012936786",
  "9716159364",
  "9711079914",
  "9130080930",
  "9818834005",
  "8744803488",
  "9958054417",
  "9799283388",
  "8527559507",
  "9983329720",
  "9911187184",
  "9990913417",
  "9252583604",
  "9427131514",
  "8860661080",
  "9891793888",
  "9716651959",
  "9968806707",
  "9212741270",
  "9810515366",
  "9868259317",
  "9868932038",
  "9810742123",
  "9268274917",
  "8882550011",
  "9269237747",
  "9716798350",
  "9079146128",
  "9818611327",
  "9872655286",
  "9212630427",
  "8210712639",
  "9029514521",
  "8920355400",
  "9555499504",
  "9820225974",
  "8003113115",
  "9718097735",
  "7678018874",
  "8130455990",
  "9908925206",
  "8009354293",
  "9527049277",
  "8055711011",
  "7977616671",
  "7021510033",
  "8788985050",
  "9511867049",
  "9849546660",
  "9672731082",
  "9004324647",
  "9314995583",
  "9887676828",
  "9989231038",
  "9460393309",
  "9558706101",
  "9314933132",
  "9957688650",
  "7755955514",
  "7700024636",
  "9602773200",
  "8875553999",
  "9724680151",
  "9414515899",
  "7898543715",
  "7768880941",
  "9782809333",
  "7040272830",
  "8107176159",
  "9166144299",
  "8830683045",
  "9414293541",
  "7019272365",
  "9450943745",
  "9314001002",
  "9885424125",
  "9950120691",
  "9461705661",
  "9413906188",
  "9866456906",
  "9462990892",
  "9413007659",
  "9829007748",
  "9885388288",
  "9951214511",
  "8972578948",
  "9460710796",
  "9588728641",
  "7703022225",
  "8302362370",
  "9866957831",
  "9885719636",
  "8441090598",
  "9414337194",
  "9848499100",
  "9866655552",
  "7733867600",
  "9849417837",
  "9989923421",
  "9461948721",
  "9949430356",
  "9770177551",
  "9989461111",
  "9413390070",
  "9829609933",
  "9866545057",
  "9949746284",
  "9949139115",
  "9347575733",
  "8882221831",
  "9885489506",
  "8209806110",
  "8700829972",
  "9440781011",
  "9346901199",
  "9461381013",
  "9414608553",
  "9948872453",
  "9885829291",
  "9314513003",
  "9352603088",
  "9712270299",
  "8689859762",
  "8200869073",
  "9501089664",
  "8149247130",
  "9848689801",
  "8209827012",
  "6395232243",
  "7304245416",
  "9749148389",
  "8149247130",
  "8200869073",
  "9643592636",
  "7654340486",
  "8004081260",
  "8200417341",
  "9908153457",
  "9813877802",
  "8689859762",
  "9021185177",
  "9025064983",
  "9236750224",
  "9236750224",
  "7678210978",
  "9579974139",
  "9319145775",
  "9149014230",
  "8682897166",
  "9599283484",
  "1523508958",
  "9760361460",
  "8815856147",
];
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
  "7 days": "challenge_complete_7days_bk",
  "14 days": "14_days_complete",
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
  if ([20, 22].includes(dayOfMonth)) {
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
  const lastUpdate = new Date(challenger.createdAt);
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
            country_code: countryCode,
            duration: duration,
            duration_actual: extractDays(duration),
            payload: payload,
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

      // Update all records with the same mobile number
      await Challenger.updateMany(
        { mobile: challenger.mobile },
        {
          updatedAt: new Date(),
          reminderSent: true,
        }
      );

      logger.info("Reminder sent successfully", {
        challengerId: challenger._id,
        name: challenger.name,
        mobile: challenger.mobile,
        duration: challenger.duration,
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
      createdAt: { $gte: new Date("2025-11-01") },
      reminderSent: { $ne: true },
      mobile: {
        $nin: blockedMobiles,
      },
    };

    let hasMore = true;
    while (hasMore) {
      // Paginated aggregation to fetch limited unique challengers
      const challengers = await Challenger.aggregate([
        { $match: baseQuery },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$mobile",
            doc: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$doc" } },

        // Filter challengers who need reminders
        {
          $addFields: {
            // Extract number from duration string (e.g., "30 days" → 30)
            durationDays: {
              $toInt: {
                $arrayElemAt: [
                  {
                    $regexFind: { input: "$duration", regex: /\d+/ },
                  }.captures,
                  0,
                ],
              },
            },
            daysSinceUpdate: {
              $floor: {
                $divide: [
                  { $subtract: [new Date(), "$createdAt"] },
                  1000 * 60 * 60 * 24, // milliseconds → days
                ],
              },
            },
          },
        },
        {
          $match: {
            $expr: { $gte: ["$daysSinceUpdate", "$durationDays"] },
          },
        },

        { $sort: { createdAt: 1 } },
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

    const chunkSize = 250; // you can adjust based on memory/performance
    let skip = 0;
    let hasMore = true;

    const baseQuery = {
      otpVerified: true,
      // pdf: { $exists: true, $ne: null, $ne: "" },
      reminderSent: { $ne: true },
      duration: "14 days", // Only 7-day challengers
      mobile: {
        $nin: blockedMobiles,
      },
      isDummy: {
        $ne: true,
      },
      type: {
        $ne: "test",
      },
      // TODO:: to discuss with team
      createdAt: {
        $gte: new Date("2025-11-05T18:30:00.000Z"),
        $lte: new Date("2025-11-06T18:29:59.999Z"),
      },
    };
    const countDocuments = await Challenger.countDocuments(baseQuery);
    while (hasMore) {
      // Paginated aggregation directly at DB level
      const challengers = await Challenger.aggregate([
        { $match: baseQuery },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $group: {
            _id: "$mobile",
            doc: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$doc" } },
        {
          $sort: {
            createdAt: 1,
          },
        },
        { $skip: skip },
        { $limit: chunkSize },
      ]);
      if (!challengers.length) {
        hasMore = false;
        break;
      }
      await processChallengers(challengers);
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
    "32 17 * * *",
    async () => {
      try {
        // Process post-November challengers daily
        // await processPostNovemberChallengers();

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
