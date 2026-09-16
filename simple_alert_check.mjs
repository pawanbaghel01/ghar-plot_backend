import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

console.log('Connecting to DB...');
mongoose.connect(process.env.MONGO_CONN).then(async () => {
  try {
    const alerts = await mongoose.connection.db.collection('alerts')
      .find({}).sort({createdAt: -1}).limit(2).toArray();
    
    console.log(`\n=== LAST 2 ALERTS ===`);
    console.log(`Found ${alerts.length} alerts\n`);
    
    alerts.forEach((alert, i) => {
      console.log(`ALERT ${i + 1}:`);
      console.log(`  Title: ${alert.title}`);
      console.log(`  Time: ${alert.time}`);
      console.log(`  Repeat: ${alert.repeatFrequency}`);
      console.log(`  Active: ${alert.isActive}`);
      console.log(`  fcmToken: ${alert.fcmToken ? 'YES' : 'NO'}`);
      console.log(`  Created: ${new Date(alert.createdAt).toLocaleString()}`);
      if (alert.scheduledDateTime) {
        console.log(`  Scheduled: ${new Date(alert.scheduledDateTime).toLocaleString()}`);
      }
      if (alert.lastTriggered) {
        console.log(`  Last Triggered: ${new Date(alert.lastTriggered).toLocaleString()}`);
      }
      console.log('');
    });
  } catch (err) {
    console.error('Error:', err);
  }
  mongoose.disconnect();
}).catch(console.error);
