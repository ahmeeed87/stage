const DatabaseManager = require('./server/database');

console.log('🧹 Starting complete data clearing process...');

// Create database instance
const db = new DatabaseManager();

try {
  // Clear all data completely
  const success = db.clearAllDataCompletely();
  
  if (success) {
    console.log('✅ All data cleared successfully!');
    console.log('📊 Database now contains:');
    console.log('   - Candidates: 0');
    console.log('   - Formations: 0');
    console.log('   - Payments: 0');
    console.log('   - Certificates: 0');
    console.log('   - Notifications: 0');
    console.log('   - Settings: Default only');
    console.log('');
    console.log('🚀 Your app is now completely clean and ready for fresh data!');
  } else {
    console.log('❌ Error clearing data');
  }
} catch (error) {
  console.error('❌ Error during data clearing:', error.message);
}

console.log('');
console.log('💡 You can also use the API endpoint: POST /api/clear-all-data');
console.log('💡 Or reset to initial state: POST /api/reset-data');
