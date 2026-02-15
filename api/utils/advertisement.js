const Advertisement = require("../models/Advertisement");

/**
 * Get a random active advertisement
 * @param {String} type - 'notification' or 'menu'
 * @param {String} region - Optional region for targeting
 */
async function getRandomAd(type, region = null) {
  try {
    const query = { isActive: true, type };
    if (region) {
      query.$or = [{ targetRegion: null }, { targetRegion: region }];
    } else {
      query.targetRegion = null;
    }

    const count = await Advertisement.countDocuments(query);
    if (count === 0) return null;

    const random = Math.floor(Math.random() * count);
    const ad = await Advertisement.findOne(query).skip(random);

    // Increment views (optional, fire/forget)
    if (ad) {
      Advertisement.updateOne({ _id: ad._id }, { $inc: { views: 1 } }).exec();
    }

    return ad;
  } catch (error) {
    console.error("Error fetching ad:", error);
    return null;
  }
}

/**
 * Get advertisement footer text
 * @param {Object} ad - Advertisement object (can be null)
 * @param {String} adminUser - Admin username
 */
function getAdFooter(ad, adminUser) {
  if (ad) {
    return `\n\n📢 <b>${ad.title}</b>\n${ad.content}`;
  } else {
    return `\n\n📢 Bu yerda sizning reklamangiz bo'lishi mumkin edi.\n📞 Bog'lanish uchun: @${adminUser}`;
  }
}

module.exports = { getRandomAd, getAdFooter };
