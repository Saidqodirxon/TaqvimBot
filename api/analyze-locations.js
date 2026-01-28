#!/usr/bin/env node

/**
 * Location Data Analysis and Cleanup Script
 * Analyzes prayer data completeness and identifies duplicates
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Location = require('./models/Location');
const PrayerTimeData = require('./models/PrayerTimeData');
const User = require('./models/User');

async function analyzeLocations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all active locations
    const locations = await Location.find({ isActive: true }).sort({ name: 1 });
    console.log(`📍 Total active locations: ${locations.length}\n`);

    // Analyze each location
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 60);
    
    const todayStr = today.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const issues = {
      noPrayerData: [],
      lowData: [],
      duplicateNames: {},
      duplicateCoordinates: {}
    };

    console.log('🔍 Analyzing locations...\n');

    for (const location of locations) {
      const locationKey = `${location.latitude.toFixed(4)}_${location.longitude.toFixed(4)}`;
      
      // Check prayer data
      const prayerDataCount = await PrayerTimeData.countDocuments({
        locationKey,
        date: { $gte: todayStr, $lte: endDateStr }
      });

      const completeness = Math.round((prayerDataCount / 60) * 100);

      // Check user count
      const userCount = await User.countDocuments({
        'location.latitude': location.latitude,
        'location.longitude': location.longitude,
        isActive: true
      });

      // Identify issues
      if (prayerDataCount === 0) {
        issues.noPrayerData.push({
          id: location._id,
          name: location.name,
          nameUz: location.nameUz,
          nameRu: location.nameRu,
          lat: location.latitude,
          lng: location.longitude,
          locationKey,
          users: userCount
        });
      } else if (completeness < 50) {
        issues.lowData.push({
          id: location._id,
          name: location.name,
          lat: location.latitude,
          lng: location.longitude,
          locationKey,
          count: prayerDataCount,
          completeness: `${completeness}%`,
          users: userCount
        });
      }

      // Check for duplicate names
      const nameKey = location.name.toLowerCase().trim();
      if (!issues.duplicateNames[nameKey]) {
        issues.duplicateNames[nameKey] = [];
      }
      issues.duplicateNames[nameKey].push({
        id: location._id,
        name: location.name,
        nameUz: location.nameUz,
        nameRu: location.nameRu,
        lat: location.latitude,
        lng: location.longitude,
        users: userCount,
        prayerData: prayerDataCount
      });

      // Check for duplicate coordinates
      const coordKey = locationKey;
      if (!issues.duplicateCoordinates[coordKey]) {
        issues.duplicateCoordinates[coordKey] = [];
      }
      issues.duplicateCoordinates[coordKey].push({
        id: location._id,
        name: location.name,
        users: userCount,
        prayerData: prayerDataCount
      });
    }

    // Filter actual duplicates
    issues.duplicateNames = Object.entries(issues.duplicateNames)
      .filter(([key, locs]) => locs.length > 1)
      .reduce((acc, [key, locs]) => {
        acc[key] = locs;
        return acc;
      }, {});

    issues.duplicateCoordinates = Object.entries(issues.duplicateCoordinates)
      .filter(([key, locs]) => locs.length > 1)
      .reduce((acc, [key, locs]) => {
        acc[key] = locs;
        return acc;
      }, {});

    // Print results
    console.log('=' .repeat(80));
    console.log('📊 ANALYSIS RESULTS');
    console.log('=' .repeat(80));
    console.log('');

    // 1. Locations with NO prayer data
    if (issues.noPrayerData.length > 0) {
      console.log(`❌ ${issues.noPrayerData.length} locations with NO prayer data (0%):\n`);
      issues.noPrayerData.sort((a, b) => b.users - a.users);
      issues.noPrayerData.forEach(loc => {
        console.log(`   📍 ${loc.name} (${loc.nameUz} | ${loc.nameRu})`);
        console.log(`      Coordinates: ${loc.lat}, ${loc.lng}`);
        console.log(`      Location Key: ${loc.locationKey}`);
        console.log(`      Users: ${loc.users}`);
        console.log(`      ID: ${loc.id}`);
        console.log('');
      });
    }

    // 2. Locations with low data
    if (issues.lowData.length > 0) {
      console.log(`⚠️  ${issues.lowData.length} locations with LOW prayer data (<50%):\n`);
      issues.lowData.sort((a, b) => b.users - a.users);
      issues.lowData.forEach(loc => {
        console.log(`   📍 ${loc.name}: ${loc.completeness} (${loc.count}/60 days)`);
        console.log(`      Coordinates: ${loc.lat}, ${loc.lng}`);
        console.log(`      Users: ${loc.users}`);
        console.log('');
      });
    }

    // 3. Duplicate names
    if (Object.keys(issues.duplicateNames).length > 0) {
      console.log(`🔄 ${Object.keys(issues.duplicateNames).length} duplicate location names:\n`);
      Object.entries(issues.duplicateNames).forEach(([name, locs]) => {
        console.log(`   📍 "${name}" - ${locs.length} locations:`);
        locs.forEach(loc => {
          console.log(`      - ${loc.name} (${loc.nameUz} | ${loc.nameRu})`);
          console.log(`        ${loc.lat}, ${loc.lng} - ${loc.users} users, ${loc.prayerData} prayer times`);
          console.log(`        ID: ${loc.id}`);
        });
        console.log('');
      });
    }

    // 4. Duplicate coordinates
    if (Object.keys(issues.duplicateCoordinates).length > 0) {
      console.log(`🔄 ${Object.keys(issues.duplicateCoordinates).length} duplicate coordinates:\n`);
      Object.entries(issues.duplicateCoordinates).forEach(([coords, locs]) => {
        console.log(`   📍 ${coords} - ${locs.length} locations:`);
        locs.forEach(loc => {
          console.log(`      - ${loc.name} - ${loc.users} users, ${loc.prayerData} prayer times`);
          console.log(`        ID: ${loc.id}`);
        });
        console.log('');
      });
    }

    // Summary and recommendations
    console.log('=' .repeat(80));
    console.log('💡 RECOMMENDATIONS');
    console.log('=' .repeat(80));
    console.log('');

    if (issues.noPrayerData.length > 0) {
      console.log('1. ❌ Locations with NO data:');
      console.log('   Run: node scripts/add-missing-prayer-data.js');
      console.log('   This will fetch and cache prayer times for locations without data\n');
    }

    if (issues.lowData.length > 0) {
      console.log('2. ⚠️  Locations with LOW data:');
      console.log('   Run: node scripts/refresh-prayer-cache.js --incomplete');
      console.log('   This will refresh incomplete prayer data\n');
    }

    if (Object.keys(issues.duplicateNames).length > 0) {
      console.log('3. 🔄 Duplicate names:');
      console.log('   Run: node scripts/merge-duplicate-locations.js --by-name');
      console.log('   This will merge locations with same name\n');
    }

    if (Object.keys(issues.duplicateCoordinates).length > 0) {
      console.log('4. 🔄 Duplicate coordinates:');
      console.log('   Run: node scripts/merge-duplicate-locations.js --by-coords');
      console.log('   This will merge locations with same coordinates\n');
    }

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      totalLocations: locations.length,
      noPrayerData: issues.noPrayerData,
      lowData: issues.lowData,
      duplicateNames: issues.duplicateNames,
      duplicateCoordinates: issues.duplicateCoordinates
    };

    const fs = require('fs');
    const reportPath = './location-analysis-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Full report saved to: ${reportPath}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

analyzeLocations();
