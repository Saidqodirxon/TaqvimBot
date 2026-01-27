/* eslint-disable no-undef */
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 9998;

const distPath = path.join(__dirname, "..", "dist");

// Static files
app.use(express.static(distPath));

// SPA routing - barcha route'lar uchun index.html qaytaradi
app.get("*", (req, res) => {
  const distHtmlPath = path.join(distPath, "index.html");
  res.sendFile(distHtmlPath, (err) => {
    if (err) {
      console.error("Error sending file:", err);
      res.status(500).send("Internal Server Error");
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ Admin Panel ishlayapti: http://localhost:${PORT}`);
});
