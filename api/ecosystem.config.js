module.exports = {
  apps: [
    {
      name: "ramazonbot-api",
      script: "./bot.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        TZ: "Asia/Tashkent",
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      max_memory_restart: "500M",
      restart_delay: 3000,
    },
    {
      name: "ramazonbot-cache-refresh",
      script: "./cache-refresh-scheduler.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        TZ: "Asia/Tashkent",
      },
      error_file: "./logs/cache-refresh-error.log",
      out_file: "./logs/cache-refresh-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      max_memory_restart: "200M",
      restart_delay: 5000,
    },
  ],
};
