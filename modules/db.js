const mongoose = require("mongoose");
require("dotenv/config");

module.exports = async function () {
  try {
    // MongoDB ulanish sozlamalari
    const options = {
      serverSelectionTimeoutMS: 30000, // 30 soniya
      socketTimeoutMS: 45000, // 45 soniya
      family: 4, // IPv4 ni majburiy ishlatish
      maxPoolSize: 10,
      minPoolSize: 2,
    };

    await mongoose.connect(
      process.env.MONGODB_URI || process.env.DB_URL,
      options
    );
    console.log("✅ Database connected");
    return mongoose.connection;
  } catch (err) {
    console.error("❌ DB connection error:", err.message);
    throw err;
  }
};
