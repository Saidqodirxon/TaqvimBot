const logger = require("../../utils/logger");
const express = require("express");
const router = express.Router();
const Admin = require("../../models/Admin");
const bcrypt = require("bcrypt");
const { authMiddleware } = require("../../middleware/adminAuth");

// Protected all routes
router.use(authMiddleware);

/**
 * Get all admins
 */
router.get("/", async (req, res) => {
  try {
    const admins = await Admin.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    logger.error("Error fetching admins:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Get single admin
 */
router.get("/:userId", async (req, res) => {
  try {
    const admin = await Admin.findOne({
      userId: parseInt(req.params.userId),
      isActive: true,
    });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    res.json(admin);
  } catch (error) {
    logger.error("Error fetching admin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Create new admin
 */
router.post("/", async (req, res) => {
  try {
    const { userId, username, password, firstName, role, permissions } =
      req.body;
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ userId: parseInt(userId) }, { username }],
    });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ error: "Admin (ID yoki Username) allaqachon mavjud" });
    }

    // Require password
    if (!password) {
      return res.status(400).json({ error: "Parol majburiy" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Get default permissions for role or use custom
    const adminPermissions =
      permissions || Admin.getDefaultPermissions(role || "moderator");

    const admin = new Admin({
      userId: parseInt(userId),
      username,
      password: hashedPassword,
      firstName,
      role: role || "moderator",
      permissions: adminPermissions,
      addedBy: req.user?.userId || req.admin?.userId, // from auth middleware
      isActive: true,
    });
    await admin.save();

    await logger.logAdminAction(
      { userId: req.user?.userId || "system", firstName: "Superadmin" },
      "Yangi admin qo'shildi",
      `${firstName} (@${username}) - ${role}`
    );
    res.status(201).json(admin);
  } catch (error) {
    logger.error("Error creating admin:", error);
    await logger.logError(error, "Admin creation failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Update admin
 */
router.put("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, permissions, isActive, username, firstName, password } =
      req.body;

    const admin = await Admin.findOne({ userId: parseInt(userId) });
    if (!admin) {
      return res.status(404).json({ error: "Admin topilmadi" });
    }

    // Update fields
    if (role !== undefined) admin.role = role;
    if (permissions !== undefined) admin.permissions = permissions;
    if (isActive !== undefined) admin.isActive = isActive;
    if (username !== undefined) admin.username = username;
    if (firstName !== undefined) admin.firstName = firstName;

    // Update password if provided
    if (password) {
      admin.password = await bcrypt.hash(password, 10);
    }

    await admin.save();

    await logger.logAdminAction(
      {
        userId: req.user?.userId || req.admin?.userId,
        firstName: req.user?.firstName || "Admin",
      },
      "Admin ma'lumotlari tahrirlandi",
      `${admin.firstName} (@${admin.username})`
    );

    res.json(admin);
  } catch (error) {
    logger.error("Error updating admin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Delete admin (soft delete)
 */
router.delete("/:userId", async (req, res) => {
  try {
    const admin = await Admin.findOne({ userId: parseInt(req.params.userId) });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    // Prevent deleting superadmin
    if (admin.role === "superadmin") {
      return res.status(403).json({ error: "Cannot delete superadmin" });
    }
    admin.isActive = false;
    await admin.save();
    await logger.logAdminAction(
      req.user,
      "Admin o'chirildi",
      `${admin.firstName} (@${admin.username})`
    );
    res.json({ success: true, message: "Admin deleted" });
  } catch (error) {
    logger.error("Error deleting admin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Check admin permissions
 */
router.get("/:userId/permissions", async (req, res) => {
  try {
    const admin = await Admin.findOne({ userId: parseInt(req.params.userId) });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    res.json({
      role: admin.role,
      permissions: admin.permissions,
    });
  } catch (error) {
    logger.error("Error fetching permissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
