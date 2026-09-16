import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_CONN).then(async () => {
  console.log('=== LAST 2 ALERTS FROM DB ===\n');
  
  // Get last 2 alerts (most recent first)
  const lastAlerts = await mongoose.connection.db.collection('alerts')
    .find({}).sort({createdAt: -1}).limit(2).toArray();
  
  lastAlerts.forEach((alert, i) => {
    const created = new Date(alert.createdAt).toLocaleString();
    const scheduled = alert.scheduledDateTime ? new Date(alert.scheduledDateTime).toLocaleString() : 'No schedule';
    const lastTriggered = alert.lastTriggered ? new Date(alert.lastTriggered).toLocaleString() : 'Never triggered';
    
    console.log(`Alert ${i + 1}:`);
    console.log(`  ID: ${alert._id}`);
    console.log(`  Title: "${alert.title}"`);
    console.log(`  Reason: "${alert.reason}"`);
    console.log(`  Time: ${alert.time}`);
    console.log(`  Repeat: ${alert.repeatFrequency}`);
    console.log(`  Repeat Metadata: ${JSON.stringify(alert.repeatMetadata)}`);
    console.log(`  Is Active: ${alert.isActive}`);
    console.log(`  FCM Token: ${alert.fcmToken ? 'exists' : 'null'}`);
    console.log(`  Created: ${created}`);
    console.log(`  Scheduled: ${scheduled}`);
    console.log(`  Last Triggered: ${lastTriggered}`);
    console.log(`  User ID: ${alert.userId}`);
    console.log('');
  });
  
  // Also check if there are any alerts due right now
  console.log('=== ALERTS DUE RIGHT NOW ===');
  const now = new Date();
  const dueAlerts = await mongoose.connection.db.collection('alerts').find({
    isActive: true,
    scheduledDateTime: { $lte: now },
    fcmToken: { $ne: null }
  }).toArray();
  
  console.log(`Found ${dueAlerts.length} alerts due for triggering right now`);
  dueAlerts.forEach((alert, i) => {
    const lastTriggered = alert.lastTriggered ? new Date(alert.lastTriggered).toLocaleString() : 'Never';
    console.log(`  ${i+1}. "${alert.title}" | Last triggered: ${lastTriggered} | Repeat: ${alert.repeatFrequency}`);
  });
  
  mongoose.disconnect();
}).catch(console.error);
