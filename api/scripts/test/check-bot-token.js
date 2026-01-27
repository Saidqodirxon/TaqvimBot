require("dotenv").config();
const axios = require("axios");

async function checkBotToken() {
  const token = process.env.BOT_TOKEN;

  console.log("\n" + "=".repeat(70));
  console.log("🤖 BOT TOKEN CHECKER");
  console.log("=".repeat(70) + "\n");

  if (!token) {
    console.log("❌ BOT_TOKEN not found in .env file!\n");
    process.exit(1);
  }

  // Extract bot ID from token (first part before :)
  const botId = token.split(":")[0];

  console.log("📋 Token Info:");
  console.log("  Bot ID:", botId);
  console.log(
    "  Token:",
    token.substring(0, 20) + "..." + token.substring(token.length - 10)
  );
  console.log("");

  try {
    // Get bot info from Telegram API
    const response = await axios.get(
      `https://api.telegram.org/bot${token}/getMe`
    );

    if (response.data.ok) {
      const bot = response.data.result;
      console.log("✅ Bot Successfully Connected!\n");
      console.log("🤖 Bot Information:");
      console.log("  ID:", bot.id);
      console.log("  Name:", bot.first_name);
      console.log("  Username:", "@" + bot.username);
      console.log("  Can Join Groups:", bot.can_join_groups);
      console.log("  Can Read Messages:", bot.can_read_all_group_messages);
      console.log("  Supports Inline:", bot.supports_inline_queries);
      console.log("");
    } else {
      console.log("❌ Invalid token or bot not accessible\n");
    }
  } catch (error) {
    console.log("❌ Error connecting to Telegram API:");
    console.log("  ", error.response?.data?.description || error.message);
    console.log("");
  }

  console.log("=".repeat(70));
  console.log("🔍 TOKEN COMPARISON");
  console.log("=".repeat(70) + "\n");

  const token1 = "5255026450:AAEQFvab-nCdFPfEZ1l6phoDwgYF24G5qJE";
  const token2 = "6209529595:AAHWWUbbKOKFoKUDpA6Q0HDz-qo6M3aW-CQ";

  console.log(
    "Token 1 (5255026450):",
    token === token1 ? "✅ ACTIVE" : "❌ Inactive"
  );
  console.log(
    "Token 2 (6209529595):",
    token === token2 ? "✅ ACTIVE" : "❌ Inactive"
  );
  console.log("");

  // Check both tokens
  console.log("=".repeat(70));
  console.log("📊 CHECKING BOTH TOKENS");
  console.log("=".repeat(70) + "\n");

  for (const [name, testToken] of [
    ["Token 1", token1],
    ["Token 2", token2],
  ]) {
    try {
      const response = await axios.get(
        `https://api.telegram.org/bot${testToken}/getMe`
      );
      if (response.data.ok) {
        const bot = response.data.result;
        console.log(`${name} (${testToken.split(":")[0]}):`);
        console.log(`  ✅ Valid - @${bot.username} (${bot.first_name})`);
      }
    } catch (error) {
      console.log(`${name}: ❌ Invalid or inaccessible`);
    }
  }

  console.log("\n" + "=".repeat(70) + "\n");
}

checkBotToken();
