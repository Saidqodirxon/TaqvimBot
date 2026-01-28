#!/usr/bin/env node

/**
 * Quick bot test script
 * Tests if bot starts without errors
 */

const { spawn } = require("child_process");

console.log("🧪 Testing bot startup...\n");

const bot = spawn("node", ["bot.js"], {
  cwd: __dirname,
  stdio: "pipe",
});

let output = "";
let hasError = false;
let startTime = Date.now();

bot.stdout.on("data", (data) => {
  const text = data.toString();
  output += text;
  process.stdout.write(text);

  // Check for success indicators
  if (
    text.includes("Bot tayyor") ||
    text.includes("Backend API va Bot tayyor")
  ) {
    setTimeout(() => {
      const elapsed = Date.now() - startTime;
      console.log(`\n✅ Bot started successfully in ${elapsed}ms\n`);
      bot.kill();
      process.exit(0);
    }, 2000);
  }
});

bot.stderr.on("data", (data) => {
  const text = data.toString();
  output += text;

  // Check for critical errors
  if (text.includes("Error:") || text.includes("Cannot")) {
    hasError = true;
    console.error("\n❌ Error detected:\n");
    console.error(text);
  }
});

bot.on("close", (code) => {
  if (code !== 0 && !hasError) {
    console.error(`\n❌ Bot exited with code ${code}\n`);
    process.exit(1);
  }
});

// Timeout after 30 seconds
setTimeout(() => {
  console.error("\n⏱️  Test timeout - bot took too long to start\n");
  bot.kill();
  process.exit(1);
}, 30000);
