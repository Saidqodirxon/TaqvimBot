const express = require("express");
const router = express.Router();
const Admin = require("../../models/Admin");
const logger = require("../../utils/logger");

/**
 * Get all admins
 */
router.get("/", async (req, res) => {
  try {
    const admins = await Admin.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    console.error("Error fetching admins:", error);
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
    console.error("Error fetching admin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Create new admin
 */
router.post("/", async (req, res) => {
  try {
    const { userId, username, firstName, role, permissions } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ userId });
    if (existingAdmin) {
      return res.status(400).json({ error: "Admin already exists" });
    }

    // Get default permissions for role or use custom
    const adminPermissions =
      permissions || Admin.getDefaultPermissions(role || "moderator");

    const admin = new Admin({
      userId,
      username,
      firstName,
      role: role || "moderator",
      permissions: adminPermissions,
      addedBy: req.user?.id, // from auth middleware
    });

    await admin.save();

    await logger.logAdminAction(
      { userId: req.user?.id || "system", firstName: "Superadmin" },
      "Yangi admin qo'shildi",
      `${firstName} (@${username}) - ${role}`
    );

    res.status(201).json(admin);
  } catch (error) {
    console.error("Error creating admin:", error);
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
    const { role, permissions, isActive } = req.body;

    const admin = await Admin.findOne({ userId: parseInt(userId) });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Update fields
    if (role !== undefined) admin.role = role;
    if (permissions !== undefined) admin.permissions = permissions;
    if (isActive !== undefined) admin.isActive = isActive;

    await admin.save();

    await logger.logAdminAction(
      { userId: req.user?.id || "system", firstName: "Superadmin" },
      "Admin tahrirlandi",
      `${admin.firstName} - yangi rol: ${role}`
    );

    res.json(admin);
  } catch (error) {
    console.error("Error updating admin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Delete admin (soft delete)
 */
router.delete("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const admin = await Admin.findOne({ userId: parseInt(userId) });
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
      { userId: req.user?.id || "system", firstName: "Superadmin" },
      "Admin o'chirildi",
      `${admin.firstName} (@${admin.username})`
    );

    res.json({ success: true, message: "Admin deleted" });
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Check admin permissions
 */
router.get("/:userId/permissions", async (req, res) => {
  try {
    const admin = await Admin.findOne({
      userId: parseInt(req.params.userId),
      isActive: true,
    });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json({
      role: admin.role,
      permissions: admin.permissions,
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
