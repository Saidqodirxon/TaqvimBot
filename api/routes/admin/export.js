const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const adminAuth = require("../../middleware/adminAuth");
const logger = require("../../utils/logger");
const ExcelJS = require("exceljs");

// Export users to Excel
router.post("/users", adminAuth, async (req, res) => {
  try {
    const {
      format = "excel", // excel or csv
      filters = {},
      fields = "all",
    } = req.body;

    logger.info("User export started", {
      admin: req.user.username,
      format,
      filters,
    });

    // Build query
    const query = {};

    // Apply filters
    if (filters.isActive !== undefined) {
      query.is_active = filters.isActive;
    }

    if (filters.isAdmin !== undefined) {
      query.is_admin = filters.isAdmin;
    }

    if (filters.isBlocked !== undefined) {
      query.is_blocked = filters.isBlocked;
    }

    if (filters.language) {
      query.language = filters.language;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.created_at = {};
      if (filters.dateFrom) {
        query.created_at.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.created_at.$lte = new Date(filters.dateTo);
      }
    }

    // Get users
    const users = await User.find(query).sort({ created_at: -1 }).lean();

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Ma'lumot topilmadi",
      });
    }

    logger.info("Users fetched for export", {
      admin: req.user.username,
      count: users.length,
    });

    if (format === "csv") {
      // CSV Export
      const csv = generateCSV(users, fields);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=users-${Date.now()}.csv`
      );

      // Add BOM for proper UTF-8 encoding in Excel
      res.write("\uFEFF");
      res.send(csv);
    } else {
      // Excel Export
      const workbook = await generateExcel(users, fields);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=users-${Date.now()}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    }

    logger.info("User export completed", {
      admin: req.user.username,
      format,
      count: users.length,
    });
  } catch (error) {
    logger.error("Error exporting users:", error);
    res.status(500).json({
      success: false,
      error: "Foydalanuvchilarni export qilishda xatolik yuz berdi",
    });
  }
});

// Export statistics
router.post("/stats", adminAuth, async (req, res) => {
  try {
    logger.info("Stats export started", { admin: req.user.username });

    const stats = await generateStats();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ramazon Bot";
    workbook.created = new Date();

    // Overview sheet
    const overviewSheet = workbook.addWorksheet("Umumiy Ko'rsatkichlar");
    overviewSheet.columns = [
      { header: "Ko'rsatkich", key: "metric", width: 30 },
      { header: "Qiymat", key: "value", width: 20 },
    ];

    Object.entries(stats.overview).forEach(([key, value]) => {
      overviewSheet.addRow({
        metric: translateMetric(key),
        value: value,
      });
    });

    // Daily stats sheet
    const dailySheet = workbook.addWorksheet("Kunlik Statistika");
    dailySheet.columns = [
      { header: "Sana", key: "date", width: 15 },
      { header: "Yangi Foydalanuvchilar", key: "newUsers", width: 20 },
      { header: "Faol Foydalanuvchilar", key: "activeUsers", width: 20 },
    ];

    stats.daily.forEach((day) => {
      dailySheet.addRow(day);
    });

    // Language distribution sheet
    const langSheet = workbook.addWorksheet("Til Bo'yicha");
    langSheet.columns = [
      { header: "Til", key: "language", width: 15 },
      { header: "Foydalanuvchilar", key: "count", width: 20 },
      { header: "Foiz", key: "percentage", width: 15 },
    ];

    stats.languages.forEach((lang) => {
      langSheet.addRow(lang);
    });

    // Style headers
    [overviewSheet, dailySheet, langSheet].forEach((sheet) => {
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4A90E2" },
      };
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=statistics-${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

    logger.info("Stats export completed", { admin: req.user.username });
  } catch (error) {
    logger.error("Error exporting stats:", error);
    res.status(500).json({
      success: false,
      error: "Statistikani export qilishda xatolik yuz berdi",
    });
  }
});

// Helper: Generate CSV
function generateCSV(users, fields) {
  const fieldList =
    fields === "all"
      ? [
          "telegram_id",
          "first_name",
          "last_name",
          "username",
          "language",
          "is_active",
          "is_admin",
          "is_blocked",
          "created_at",
          "last_active",
        ]
      : fields;

  // Headers
  const headers = fieldList.map((field) => translateField(field)).join(",");

  // Rows
  const rows = users.map((user) => {
    return fieldList
      .map((field) => {
        let value = user[field];

        // Format dates
        if (field.includes("_at") || field === "last_active") {
          value = value ? new Date(value).toLocaleString("uz-UZ") : "";
        }

        // Format booleans
        if (typeof value === "boolean") {
          value = value ? "Ha" : "Yo'q";
        }

        // Escape commas and quotes
        if (typeof value === "string") {
          value = value.replace(/"/g, '""');
          if (
            value.includes(",") ||
            value.includes('"') ||
            value.includes("\n")
          ) {
            value = `"${value}"`;
          }
        }

        return value || "";
      })
      .join(",");
  });

  return [headers, ...rows].join("\n");
}

// Helper: Generate Excel
async function generateExcel(users, fields) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ramazon Bot";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Foydalanuvchilar");

  const fieldList =
    fields === "all"
      ? [
          "telegram_id",
          "first_name",
          "last_name",
          "username",
          "language",
          "is_active",
          "is_admin",
          "is_blocked",
          "created_at",
          "last_active",
        ]
      : fields;

  // Define columns
  worksheet.columns = fieldList.map((field) => ({
    header: translateField(field),
    key: field,
    width: 15,
  }));

  // Add rows
  users.forEach((user) => {
    const row = {};
    fieldList.forEach((field) => {
      let value = user[field];

      // Format dates
      if (field.includes("_at") || field === "last_active") {
        value = value ? new Date(value).toLocaleString("uz-UZ") : "";
      }

      // Format booleans
      if (typeof value === "boolean") {
        value = value ? "Ha" : "Yo'q";
      }

      row[field] = value || "";
    });
    worksheet.addRow(row);
  });

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4A90E2" },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  return workbook;
}

// Helper: Generate statistics
async function generateStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Overview stats
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ is_active: true });
  const blockedUsers = await User.countDocuments({ is_blocked: true });
  const adminUsers = await User.countDocuments({ is_admin: true });

  const activeToday = await User.countDocuments({
    last_active: { $gte: new Date(now.setHours(0, 0, 0, 0)) },
  });

  const activeLast7Days = await User.countDocuments({
    last_active: {
      $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Daily stats for last 30 days
  const dailyStats = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const newUsers = await User.countDocuments({
      created_at: { $gte: startOfDay, $lte: endOfDay },
    });

    const activeUsersDay = await User.countDocuments({
      last_active: { $gte: startOfDay, $lte: endOfDay },
    });

    dailyStats.push({
      date: startOfDay.toLocaleDateString("uz-UZ"),
      newUsers,
      activeUsers: activeUsersDay,
    });
  }

  // Language distribution
  const languages = await User.aggregate([
    { $group: { _id: "$language", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const languageStats = languages.map((lang) => ({
    language: lang._id || "Unknown",
    count: lang.count,
    percentage: ((lang.count / totalUsers) * 100).toFixed(2) + "%",
  }));

  return {
    overview: {
      totalUsers,
      activeUsers,
      blockedUsers,
      adminUsers,
      activeToday,
      activeLast7Days,
    },
    daily: dailyStats,
    languages: languageStats,
  };
}

// Helper: Translate field names
function translateField(field) {
  const translations = {
    telegram_id: "Telegram ID",
    first_name: "Ism",
    last_name: "Familiya",
    username: "Username",
    language: "Til",
    is_active: "Faol",
    is_admin: "Admin",
    is_blocked: "Bloklangan",
    created_at: "Ro'yxatdan o'tgan",
    last_active: "Oxirgi faollik",
  };
  return translations[field] || field;
}

// Helper: Translate metrics
function translateMetric(metric) {
  const translations = {
    totalUsers: "Jami Foydalanuvchilar",
    activeUsers: "Faol Foydalanuvchilar",
    blockedUsers: "Bloklangan Foydalanuvchilar",
    adminUsers: "Admin Foydalanuvchilar",
    activeToday: "Bugun Faol",
    activeLast7Days: "Oxirgi 7 Kunda Faol",
  };
  return translations[metric] || metric;
}

module.exports = router;
