const jwt = require("jsonwebtoken");

// Verify JWT token
function authMiddleware(req, res, next) {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Token yo'q" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add compatibility for both 'id' and 'userId'
    if (decoded.userId && !decoded.id) {
      decoded.id = decoded.userId;
    }

    // Ensure firstName exists for logging
    if (!decoded.firstName) {
      decoded.firstName = "Admin";
    }

    req.admin = decoded;
    req.user = decoded; // For compatibility
    next();
  } catch (error) {
    res.status(401).json({ error: "Noto'g'ri token" });
  }
}

// Check if superadmin
function superAdminOnly(req, res, next) {
  if (req.admin.role !== "superadmin") {
    return res.status(403).json({ error: "Faqat superadmin" });
  }
  next();
}

// Check for specific permission
function checkPermission(permission) {
  return function (req, res, next) {
    if (req.admin.role === "superadmin") {
      return next();
    }
    if (req.admin.permissions && req.admin.permissions[permission] === true) {
      return next();
    }
    return res
      .status(403)
      .json({
        error: `Sizda bu amal uchun yetarli huquq yo'q (${permission})`,
      });
  };
}

// Export with both names for compatibility
module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.superAdminOnly = superAdminOnly;
module.exports.checkPermission = checkPermission;
module.exports.adminAuth = authMiddleware;
