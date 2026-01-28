# Location Data Management Scripts

## 🔍 Step 1: Analyze Locations

Identifies all issues with location data:

```bash
cd api
node analyze-locations.js
```

This will show:
- ❌ Locations with NO prayer data (0%)
- ⚠️ Locations with LOW prayer data (<50%)
- 🔄 Duplicate location names
- 🔄 Duplicate coordinates

Report saved to: `location-analysis-report.json`

## 📝 Step 2: Fix Missing Data

Automatically fetches and caches prayer times for locations without data:

```bash
node add-missing-prayer-data.js
```

Features:
- Fetches 60 days of prayer times from Aladhan API
- Rate limited (1 request/second)
- Skips already existing data
- Shows progress for each location

⏱️ **Time estimate:** ~1 minute per location (60 days × 1 sec)

## 🔄 Step 3: Merge Duplicates

### Merge by name (e.g., "Sirdaryo" appears twice)

```bash
node merge-duplicate-locations.js --by-name
```

Interactive mode:
- Shows all duplicate groups
- Asks which to keep
- Automatically migrates users
- Deactivates merged locations

### Merge by coordinates (e.g., same lat/lng, different names)

```bash
node merge-duplicate-locations.js --by-coords
```

## 📊 Full Workflow Example

```bash
cd api

# 1. Analyze
node analyze-locations.js

# Output:
# ❌ 5 locations with NO prayer data (0%)
# 🔄 2 duplicate location names
# Report saved to: location-analysis-report.json

# 2. Add missing data
node add-missing-prayer-data.js

# Output:
# [1/5] Processing: Yaypan
#    Coordinates: 40.4000, 71.8167
#    Users: 0
#    ✅ Completed (1/5)
# ...

# 3. Merge duplicates
node merge-duplicate-locations.js --by-name

# Output:
# 📍 Duplicate: "sirdaryo" (2 locations)
# [1] Sirdaryo | Сирдарё
#     40.8167, 68.7500 - 100 users, 60 days
# [2] Sirdaryo | Sirdaryo  
#     40.8167, 68.7500 - 0 users, 58 days
# 
# Merge these locations? (y/n): y
# ✅ Keeping: Sirdaryo | Сирдарё
# 🔄 Merging → Updated 0 users
# ✅ Merge complete!

# 4. Verify
node analyze-locations.js
```

## ⚡ Quick Fix All

```bash
# One-liner to analyze, fix data, and report
node analyze-locations.js && \
node add-missing-prayer-data.js && \
node analyze-locations.js
```

## 🎯 What Each Script Does

### analyze-locations.js
- ✅ Counts prayer data for each location
- ✅ Calculates completeness percentage
- ✅ Identifies duplicates (by name and coordinates)
- ✅ Shows user count per location
- ✅ Generates JSON report

### add-missing-prayer-data.js
- ✅ Reads locations from report
- ✅ Fetches from Aladhan API
- ✅ Caches in PrayerTimeData collection
- ✅ 60 days per location
- ✅ Rate limited to avoid API ban

### merge-duplicate-locations.js
- ✅ Interactive merge process
- ✅ Keeps location with most users + data
- ✅ Migrates users to kept location
- ✅ Deactivates merged locations
- ✅ Safe - asks before each merge

## 🚨 Important Notes

1. **Backup first!** Always backup before merging:
   ```bash
   mongodump --uri="YOUR_MONGODB_URI"
   ```

2. **API limits:** Aladhan API allows 1 request/second. Script respects this.

3. **Time estimate:** 
   - Analyze: < 1 minute
   - Add data: ~1 minute per location
   - Merge: depends on user input

4. **Safe to re-run:** All scripts check existing data before adding.

## 🔧 Manual Fixes

If you prefer manual approach:

```javascript
// Delete a duplicate location
await Location.updateOne(
  { _id: 'LOCATION_ID' },
  { $set: { isActive: false } }
);

// Migrate users to different location
await User.updateMany(
  {
    'location.latitude': OLD_LAT,
    'location.longitude': OLD_LNG
  },
  {
    $set: {
      'location.latitude': NEW_LAT,
      'location.longitude': NEW_LNG,
      'location.name': NEW_NAME
    }
  }
);
```

## 📈 Expected Results

Before:
```
❌ Yaypan: 0% (0 users)
❌ Sirdaryo: 0% (0 users)
🔄 Sirdaryo: 98% (100 users) [DUPLICATE]
```

After:
```
✅ Yaypan: 100% (0 users)
✅ Sirdaryo: 100% (100 users)
```

## ❓ Troubleshooting

**Error: Report not found**
```bash
# Run analyze first
node analyze-locations.js
```

**API timeout errors**
```bash
# Increase timeout or reduce rate limit
# Edit add-missing-prayer-data.js:
# timeout: 20000  (increase from 10000)
```

**Merge mistakes**
```bash
# Restore from backup
mongorestore --uri="YOUR_MONGODB_URI" dump/
```
