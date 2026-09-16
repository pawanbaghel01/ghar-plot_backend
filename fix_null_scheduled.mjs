import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_CONN).then(async () => {
  console.log('=== FIXING ALERTS WITH NULL scheduledDateTime ===\n');
  
  // Find alerts with null scheduledDateTime but have date/time
  const alerts = await mongoose.connection.db.collection('alerts').find({
    scheduledDateTime: null,
    date: { $ne: null },
    time: { $ne: null }
  }).toArray();
  
  console.log(`Found ${alerts.length} alerts with null scheduledDateTime\n`);
  
  for (const alert of alerts) {
    try {
      // Calculate scheduledDateTime from date + time
      const dateStr = new Date(alert.date).toISOString().split('T')[0];
      const timeStr = alert.time;
      const scheduledDateTime = new Date(`${dateStr}T${timeStr}:00`);
      
      console.log(`Fixing Alert: ${alert._id}`);
      console.log(`  Title: ${alert.title}`);
      console.log(`  Date: ${dateStr}, Time: ${timeStr}`);
      console.log(`  New scheduledDateTime: ${scheduledDateTime.toISOString()}`);
      
      // Update in DB
      await mongoose.connection.db.collection('alerts').updateOne(
        { _id: alert._id },
        { $set: { scheduledDateTime: scheduledDateTime } }
      );
      console.log(`  ✅ Fixed!\n`);
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}\n`);
    }
  }
  
  console.log('Done!');
  mongoose.disconnect();
}).catch(console.error);
