import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_CONN).then(async () => {
  console.log('=== ADMIN REMINDER ISSUES CHECK ===\n');
  
  // Check admin notifications from last 30 minutes
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  
  console.log('--- ADMIN NOTIFICATIONS (Last 30 min) ---');
  const adminNotifs = await mongoose.connection.db.collection('notifications').find({
    type: 'admin_reminder',
    createdAt: { $gte: thirtyMinAgo }
  }).sort({createdAt: -1}).limit(10).toArray();
  
  adminNotifs.forEach((n, i) => {
    console.log(`${i+1}. "${n.title}" | ${new Date(n.createdAt).toLocaleString()} | read: ${n.read} | metadata: ${JSON.stringify(n.metadata)}`);
  });
  
  console.log('\n--- RECENT REMINDERS (Last 30 min) ---');
  const reminders = await mongoose.connection.db.collection('reminders').find({
    createdAt: { $gte: thirtyMinAgo }
  }).sort({createdAt: -1}).limit(10).toArray();
  
  reminders.forEach((r, i) => {
    const dt = r.reminderDateTime ? new Date(r.reminderDateTime).toLocaleString() : 'No date';
    console.log(`${i+1}. "${r.title}" | ${dt} | status: ${r.status} | cronFired: ${r.cronFired} | isActive: ${r.isActive}`);
  });
  
  console.log('\n--- RECENT ALERTS (Last 30 min) ---');
  const alerts = await mongoose.connection.db.collection('alerts').find({
    createdAt: { $gte: thirtyMinAgo }
  }).sort({createdAt: -1}).limit(10).toArray();
  
  alerts.forEach((a, i) => {
    const dt = a.scheduledDateTime ? new Date(a.scheduledDateTime).toLocaleString() : 'No schedule';
    console.log(`${i+1}. "${a.title}" | ${dt} | repeat: ${a.repeatFrequency} | isActive: ${a.isActive} | fcmToken: ${a.fcmToken ? 'exists' : 'null'}`);
  });
  
  // Check for exact duplicates
  console.log('\n--- EXACT DUPLICATES (Last 30 min) ---');
  const duplicates = await mongoose.connection.db.collection('notifications').aggregate([
    { $match: { createdAt: { $gte: thirtyMinAgo }, type: 'admin_reminder' } },
    { $group: { 
        _id: { title: "$title", message: "$message" },
        count: { $sum: 1 },
        ids: { $push: { id: "$_id", created: "$createdAt" } }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  
  console.log(`Found ${duplicates.length} duplicate notification groups:`);
  duplicates.forEach(dup => {
    console.log(`  "${dup._id.title}" - ${dup.count} copies`);
    dup.ids.forEach(item => {
      console.log(`    ${item.id} at ${new Date(item.created).toLocaleString()}`);
    });
  });
  
  mongoose.disconnect();
}).catch(console.error);
