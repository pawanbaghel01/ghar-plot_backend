import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_CONN).then(async () => {
  console.log('=== LIVE DUPLICATE CHECK ===\n');
  
  // Check last 20 entries created in last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  
  console.log('--- RECENT ALERTS (Last 10 min) ---');
  const alerts = await mongoose.connection.db.collection('alerts').find({
    createdAt: { $gte: tenMinutesAgo }
  }).sort({createdAt: -1}).limit(20).toArray();
  
  alerts.forEach((a, i) => {
    const created = new Date(a.createdAt).toLocaleString();
    console.log(`${i+1}. "${a.title}" | ${a.time} | ${a.repeatFrequency} | ${created} | isActive: ${a.isActive}`);
  });
  
  console.log('\n--- RECENT REMINDERS (Last 10 min) ---');
  const reminders = await mongoose.connection.db.collection('reminders').find({
    createdAt: { $gte: tenMinutesAgo }
  }).sort({createdAt: -1}).limit(20).toArray();
  
  reminders.forEach((r, i) => {
    const created = new Date(r.createdAt).toLocaleString();
    console.log(`${i+1}. "${r.title}" | ${new Date(r.reminderDateTime).toLocaleString()} | ${created} | status: ${r.status}`);
  });
  
  // Group by exact duplicates
  console.log('\n--- EXACT DUPLICATE GROUPS ---');
  const dupAlerts = await mongoose.connection.db.collection('alerts').aggregate([
    { $match: { createdAt: { $gte: tenMinutesAgo } } },
    { $group: { 
        _id: { title: "$title", time: "$time", reason: "$reason", userId: "$userId" },
        count: { $sum: 1 },
        ids: { $push: { id: "$_id", created: "$createdAt" } }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  
  console.log(`Found ${dupAlerts.length} duplicate alert groups:`);
  dupAlerts.forEach(dup => {
    console.log(`  "${dup._id.title}" at ${dup._id.time} - ${dup.count} copies`);
    dup.ids.forEach(item => {
      console.log(`    ${item.id} created at ${new Date(item.created).toLocaleString()}`);
    });
  });
  
  mongoose.disconnect();
}).catch(console.error);
