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

const scheduleNextChallenger = () => {
  // Random interval between 30-90 seconds (avg ~51 seconds = ~70 per hour)
  const minDelay = 30 * 1000; // 30 seconds
  const maxDelay = 90 * 1000; // 90 seconds
  const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

  setTimeout(async () => {
    console.log("Creating dummy challenger with realistic timing...");
    await createDummyChallenger();
    scheduleNextChallenger(); // Schedule the next one
  }, randomDelay);
};

const startDummyCron = () => {
  console.log("Starting realistic dummy challenger creation (target: ~70/hour)");
  scheduleNextChallenger();
};

module.exports = {
  startDummyCron,
};
