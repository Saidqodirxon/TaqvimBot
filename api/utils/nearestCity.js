/**
 * Find nearest city utilities for prayer times
 * Haversine formula for accurate distance calculation
 */

const Location = require("../models/Location");

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Find nearest city to user's coordinates
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {number} maxDistance - Maximum distance in km (default: 100)
 * @returns {Promise<Object|null>} Nearest city with distance or null
 */
async function findNearestCity(userLat, userLon, maxDistance = 100) {
  try {
    // Get all active locations from DB
    const locations = await Location.find({ isActive: true })
      .select(
        "nameEn nameUz nameCyrillic nameRu latitude longitude region priority"
      )
      .lean();

    if (locations.length === 0) {
      return null;
    }

    // Calculate distance to each city
    const citiesWithDistance = locations.map((city) => {
      const distance = calculateDistance(
        userLat,
        userLon,
        city.latitude,
        city.longitude
      );
      return {
        ...city,
        distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      };
    });

    // Sort by distance (ascending)
    citiesWithDistance.sort((a, b) => a.distance - b.distance);

    // Get nearest city
    const nearest = citiesWithDistance[0];

    // Check if within max distance
    if (nearest.distance > maxDistance) {
      return null; // Too far
    }

    return {
      city: nearest,
      alternatives: citiesWithDistance.slice(1, 4), // Next 3 closest cities
    };
  } catch (error) {
    console.error("Error finding nearest city:", error);
    return null;
  }
}

/**
 * Get cities by region
 * @param {string} region - Region name
 * @returns {Promise<Array>} List of cities in region
 */
async function getCitiesByRegion(region) {
  try {
    return await Location.find({
      region,
      isActive: true,
    })
      .select("nameEn nameUz nameCyrillic nameRu latitude longitude population")
      .sort({ priority: 1, population: -1 })
      .lean();
  } catch (error) {
    console.error("Error getting cities by region:", error);
    return [];
  }
}

/**
 * Get all regions with city count
 * @returns {Promise<Array>} List of regions
 */
async function getAllRegions() {
  try {
    const regions = await Location.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$region",
          count: { $sum: 1 },
          cities: { $push: { name: "$nameUz", population: "$population" } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return regions.map((r) => ({
      region: r._id,
      cityCount: r.count,
      topCities: r.cities
        .sort((a, b) => b.population - a.population)
        .slice(0, 3)
        .map((c) => c.name),
    }));
  } catch (error) {
    console.error("Error getting regions:", error);
    return [];
  }
}

/**
 * Get top cities (by priority and population)
 * @param {number} limit - Number of cities to return
 * @returns {Promise<Array>} List of top cities
 */
async function getTopCities(limit = 20) {
  try {
    return await Location.find({ isActive: true })
      .select(
        "nameEn nameUz nameCyrillic nameRu latitude longitude region population priority"
      )
      .sort({ priority: 1, population: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error("Error getting top cities:", error);
    return [];
  }
}

/**
 * Search cities by name (fuzzy search)
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @returns {Promise<Array>} Matching cities
 */
async function searchCities(query, limit = 10) {
  try {
    const regex = new RegExp(query, "i");
    return await Location.find({
      isActive: true,
      $or: [
        { nameEn: regex },
        { nameUz: regex },
        { nameCyrillic: regex },
        { nameRu: regex },
      ],
    })
      .select("nameEn nameUz nameCyrillic nameRu latitude longitude region")
      .sort({ priority: 1, population: -1 })
      .limit(limit)
      .lean();
  } catch (error) {
    console.error("Error searching cities:", error);
    return [];
  }
}

module.exports = {
  calculateDistance,
  findNearestCity,
  getCitiesByRegion,
  getAllRegions,
  getTopCities,
  searchCities,
};
