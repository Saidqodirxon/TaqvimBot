require('dotenv').config();
const { getPrayerTimes } = require('./utils/aladhan');
const connectDB = require('./modules/db');

async function testAladhanAPI() {
  console.log('🧪 Testing Aladhan API...\n');
  
  // Connect to database first
  console.log('🔌 Connecting to database...');
  try {
    await connectDB();
    console.log('✅ Database connected\n');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    process.exit(1);
  }
  
  // Test coordinates (Tashkent)
  const latitude = 41.2995;
  const longitude = 69.2401;
  
  console.log('📍 Coordinates:', { latitude, longitude });
  console.log('⏳ Fetching prayer times...\n');
  
  try {
    const result = await getPrayerTimes(
      latitude,
      longitude,
      3, // MWL method
      1, // Hanafi school
      0, // Standard midnight
      1  // Latitude adjustment
    );
    
    if (result.success) {
      console.log('✅ SUCCESS!\n');
      console.log('📅 Date:', result.date);
      console.log('📿 Hijri:', result.hijri);
      console.log('\n⏰ Prayer Times:');
      console.log('  Fajr:    ', result.timings.fajr);
      console.log('  Sunrise: ', result.timings.sunrise);
      console.log('  Dhuhr:   ', result.timings.dhuhr);
      console.log('  Asr:     ', result.timings.asr);
      console.log('  Maghrib: ', result.timings.maghrib);
      console.log('  Isha:    ', result.timings.isha);
      console.log('\n📊 Method:', result.meta?.method?.name || 'Unknown');
      console.log('🕌 School:', result.meta?.school || 'Unknown');
      console.log('📌 Manual:', result.manual ? 'Yes' : 'No');
    } else {
      console.log('❌ FAILED!\n');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.log('❌ EXCEPTION!\n');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testAladhanAPI();
