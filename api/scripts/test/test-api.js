// Simple API test
const axios = require("axios");

const BASE_URL = "http://localhost:9999/api/miniapp";

async function testAPIs() {
  console.log("🧪 Testing Miniapp API endpoints...\n");

  // Test 1: Test endpoint
  try {
    console.log("1️⃣ Testing GET /test...");
    const res1 = await axios.get(`${BASE_URL}/test`);
    console.log("✅ Success:", res1.data);
  } catch (error) {
    console.log("❌ Failed:", error.response?.data || error.message);
  }
  console.log("");

  // Test 2: Prayer times
  try {
    console.log("2️⃣ Testing POST /prayer-times...");
    const res2 = await axios.post(`${BASE_URL}/prayer-times`, {
      userId: 1551855614,
      latitude: 41.2995,
      longitude: 69.2401,
    });
    console.log("✅ Success:", JSON.stringify(res2.data, null, 2));
  } catch (error) {
    console.log("❌ Failed:", error.response?.data || error.message);
  }
  console.log("");

  // Test 3: Weekly prayer times
  try {
    console.log("3️⃣ Testing POST /weekly-prayer-times...");
    const res3 = await axios.post(`${BASE_URL}/weekly-prayer-times`, {
      userId: 1551855614,
      latitude: 41.2995,
      longitude: 69.2401,
    });
    console.log(
      "✅ Success: Calendar has",
      res3.data.calendar?.length || 0,
      "days"
    );
  } catch (error) {
    console.log("❌ Failed:", error.response?.data || error.message);
  }

  console.log("\n✨ Tests completed!");
  process.exit(0);
}

// Wait 3 seconds for server to start
setTimeout(testAPIs, 3000);
