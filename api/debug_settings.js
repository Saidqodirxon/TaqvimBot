const mongoose = require("mongoose");
const Settings = require("./models/Settings");
require("dotenv").config();

async function checkSettings() {
  await mongoose.connect(process.env.MONGODB_URI);
  const allSettings = await Settings.find();
  console.log("Current Settings in DB:");
  allSettings.forEach((s) => {
    console.log(`${s.key}: ${JSON.stringify(s.value)}`);
  });
  await mongoose.disconnect();
}

checkSettings();
