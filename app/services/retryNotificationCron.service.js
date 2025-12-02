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
  "6395232243",
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
  "6001271396",
  "9239452435",
  "7739370718",
  "9929699903",
  "9006735721",
  "9641574469",
  "9820942462",
  "8106257162",
  "6268330497",
  "9109416454",
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
    // "30 18 * * *",
    "*/10 * * * * *",
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
      mobile: { $nin: blockedMobiles },
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
