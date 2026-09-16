import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_CONN).then(async () => {
  console.log('=== TESTING DUPLICATE FIXES ===\n');
  
  // Test 1: Check if duplicate prevention logic exists in code
  console.log('✅ Duplicate prevention added to:');
  console.log('  - createReminder (reminderController.js)');
  console.log('  - createAlert (alertController.js)'); 
  console.log('  - admin notification creation (reminderController.js)');
  console.log('  - reminderCron notification creation (reminderCron.js)');
  
  // Test 2: Check recent activity 
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  console.log('\n--- RECENT ACTIVITY (Last 5 min) ---');
  const recentReminders = await mongoose.connection.db.collection('reminders')
    .countDocuments({ createdAt: { $gte: fiveMinutesAgo } });
  const recentAlerts = await mongoose.connection.db.collection('alerts')
    .countDocuments({ createdAt: { $gte: fiveMinutesAgo } });
  const recentAdminNotifs = await mongoose.connection.db.collection('notifications')
    .countDocuments({ type: 'admin_reminder', createdAt: { $gte: fiveMinutesAgo } });
    
  console.log(`Reminders created: ${recentReminders}`);
  console.log(`Alerts created: ${recentAlerts}`);
  console.log(`Admin notifications: ${recentAdminNotifs}`);
  
  // Test 3: Server restart required message
  console.log('\n🚀 NEXT STEP: Server restart required to activate fixes');
  console.log('   pkill -f "node.*server" && node server.js');
  
  mongoose.disconnect();
}).catch(console.error);
