const express = require("express");
const router = express.Router();
const PromoCode = require("../../models/PromoCode");
const User = require("../../models/User");
const logger = require("../../utils/logger");

/**
 * GET /api/promo-codes
 * List all promo codes with pagination and stats
 */
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const status = req.query.status; // active, inactive, expired

    const query = {};

    if (search) {
      query.code = { $regex: search, $options: "i" };
    }

    if (status === "active") {
      query.isActive = true;
      query.$or = [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }];
    } else if (status === "inactive") {
      query.isActive = false;
    } else if (status === "expired") {
      query.expiresAt = { $lte: new Date() };
    }

    const total = await PromoCode.countDocuments(query);
    const promoCodes = await PromoCode.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      promoCodes,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching promo codes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/promo-codes
 * Create a single promo code
 */
router.post("/", async (req, res) => {
  try {
    const { code, rewardPoints, maxUses, expiresAt } = req.body;

    // Validate
    if (!code || !rewardPoints) {
      return res
        .status(400)
        .json({ error: "Code and reward points are required" });
    }

    if (rewardPoints < 1) {
      return res
        .status(400)
        .json({ error: "Reward points must be at least 1" });
    }

    const exists = await PromoCode.findOne({ code: code.toUpperCase() });
    if (exists) {
      return res.status(400).json({ error: "Promo code already exists" });
    }

    const newPromo = new PromoCode({
      code: code.toUpperCase(),
      rewardPoints,
      maxUses: maxUses || 1,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: true,
      createdBy: req.user?.id || null, // If using authentication
    });

    await newPromo.save();

    res.status(201).json(newPromo);
  } catch (error) {
    logger.error("Error creating promo code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/promo-codes/bulk
 * Bulk update/generate promo codes
 */
router.put("/bulk", async (req, res) => {
  try {
    const { action, count, prefix, length, rewardPoints, maxUses, expiresAt } =
      req.body;

    if (action === "generate") {
      if (!count || !rewardPoints) {
        return res
          .status(400)
          .json({ error: "Count and reward points required" });
      }

      const codes = [];
      const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const codeLength = length || 8;
      const codePrefix = prefix ? prefix.toUpperCase() : "";

      for (let i = 0; i < count; i++) {
        let randomPart = "";
        for (let j = 0; j < codeLength; j++) {
          randomPart += charset.charAt(
            Math.floor(Math.random() * charset.length)
          );
        }

        codes.push({
          code: codePrefix + randomPart,
          rewardPoints: Number(rewardPoints), // Ensure number
          maxUses: maxUses || 1,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          isActive: true,
          createdBy: req.user?.id || null,
        });
      }

      // Insert efficiently, skipping duplicates
      try {
        await PromoCode.insertMany(codes, { ordered: false });
      } catch (e) {
        // Ignore duplicate key errors
      }

      return res.json({
        message: `Successfully generated ${count} promo codes`,
      });
    }

    // Other bulk actions (delete, deactivate) can go here
    else if (action === "delete_all") {
      await PromoCode.deleteMany({});
      return res.json({ message: "All promo codes deleted" });
    }

    res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    logger.error("Error bulk updating promo codes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/promo-codes/:id
 * Delete a promo code
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await PromoCode.findByIdAndDelete(id);
    res.json({ message: "Promo code deleted" });
  } catch (error) {
    logger.error("Error deleting promo code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/promo-codes/:code
 * Update a promo code or Redeem (if userId present and no update fields)
 */
router.put("/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const { userId, rewardPoints, maxUses, expiresAt, isActive } = req.body;

    // Check if this is a redemption request (userId present, no admin update fields)
    if (
      userId &&
      !rewardPoints &&
      !maxUses &&
      !expiresAt &&
      isActive === undefined
    ) {
      return redeemPromoCode(req, res, code, userId);
    }

    // Otherwise, it's an update request
    const promo = await PromoCode.findOne({ code: code.toUpperCase() });
    if (!promo) {
      return res.status(404).json({ error: "Promo code not found" });
    }

    if (rewardPoints) promo.rewardPoints = Number(rewardPoints);
    if (maxUses) promo.maxUses = Number(maxUses);
    if (expiresAt) promo.expiresAt = new Date(expiresAt);
    if (isActive !== undefined) promo.isActive = isActive;

    await promo.save();
    res.json(promo);
  } catch (error) {
    logger.error("Error updating promo code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/promo-codes/:code/redeem
 * Explicit redeem endpoint
 */
router.put("/:code/redeem", async (req, res) => {
  const { code } = req.params;
  const { userId } = req.body;
  return redeemPromoCode(req, res, code, userId);
});

// Helper function for redemption logic
async function redeemPromoCode(req, res, code, userId) {
  try {
    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const promo = await PromoCode.findOne({ code: code.toUpperCase() });

    if (!promo) {
      return res.status(404).json({ error: "Promo code not found" });
    }

    if (!promo.isActive) {
      return res.status(400).json({ error: "Promo code is inactive" });
    }

    if (promo.usedCount >= promo.maxUses) {
      return res.status(400).json({ error: "Promo code usage limit reached" });
    }

    if (promo.expiresAt && new Date() > promo.expiresAt) {
      return res.status(400).json({ error: "Promo code expired" });
    }

    // Check if user already used this code
    const alreadyUsed = promo.usedBy.find((u) => u.userId === Number(userId));
    if (alreadyUsed) {
      return res
        .status(400)
        .json({ error: "You have already used this promo code" });
    }

    // Add points to user
    const user = await User.findOne({ userId: Number(userId) });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update User points
    const pointsToAdd = Number(promo.rewardPoints);
    if (isNaN(pointsToAdd) || pointsToAdd < 0) {
      logger.error(
        `Invalid reward points for promo ${code}: ${promo.rewardPoints}`
      );
      return res
        .status(500)
        .json({ error: "Configuration error: Invalid reward points" });
    }

    await User.updateOne(
      { userId: Number(userId) },
      { $inc: { points: pointsToAdd } }
    );

    // Update Promo Code stats
    promo.usedCount += 1;
    promo.usedBy.push({ userId: Number(userId) });

    if (promo.usedCount >= promo.maxUses) {
      promo.isActive = false;
    }

    await promo.save();

    res.json({
      success: true,
      message: `Promo code redeemed! You earned ${pointsToAdd} points.`,
      pointsAdded: pointsToAdd,
    });
  } catch (error) {
    logger.error("Error redeeming promo code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = router;
