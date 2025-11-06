const cron = require("node-cron");
const Challenger = require("../models/challengers");

// Function to create dummy challenger
const createDummyChallenger = async () => {
  try {
    const dummyData = {
      name: "Dummy User " + Date.now(),
      mobile: "2222222222",
      countryCode: "+91",
      isDummy: true,
      otpVerified: true,
    };

    const challenger = new Challenger(dummyData);
    await challenger.save();
    console.log("Dummy challenger created:", challenger.name);
  } catch (error) {
    console.error("Error creating dummy challenger:", error);
  }
};

const startDummyCron = () => {
  // Schedule cron job to run every 45 seconds
  cron.schedule("*/45 * * * * *", async () => {
    console.log("Running cron job to create dummy challenger...");
    await createDummyChallenger();
  });
};

module.exports = {
  startDummyCron,
};
