const jwt = require("jsonwebtoken");

// Verify JWT token
function authMiddleware(req, res, next) {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Token yo'q" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

// Export with both names for compatibility
module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.superAdminOnly = superAdminOnly;
module.exports.adminAuth = authMiddleware;
