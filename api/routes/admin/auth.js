const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../../models/Admin");

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username va parol kerak" });
    }

    // Find admin
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: "Noto'g'ri username yoki parol" });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Noto'g'ri username yoki parol" });
    }

    // Check if active
    if (!admin.isActive) {
      return res.status(403).json({ error: "Admin account faol emas" });
    }

    // Generate token
    const token = jwt.sign(
      { userId: admin.userId, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      admin: {
        userId: admin.userId,
        username: admin.username,
        firstName: admin.firstName,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// Create first admin (superadmin only)
router.post("/register", async (req, res) => {
  try {
    const { userId, username, password, firstName } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ userId }, { username }],
    });
    if (existingAdmin) {
      return res.status(400).json({ error: "Admin allaqachon mavjud" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = new Admin({
      userId,
      username,
      password: hashedPassword,
      firstName,
      role: "superadmin",
    });

    await admin.save();

    res.json({
      message: "Admin yaratildi",
      admin: {
        userId: admin.userId,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

module.exports = router;
