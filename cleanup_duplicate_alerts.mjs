import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_CONN).then(async () => {
  console.log('=== CLEANING DUPLICATE ALERTS ===\n');
  
  // Find duplicate alerts (same user, title, time) 
  const duplicateGroups = await mongoose.connection.db.collection('alerts').aggregate([
    { $match: { 
        isActive: true,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }
    },
    { $group: { 
        _id: { 
          userId: "$userId", 
          title: "$title", 
          time: "$time",
          reason: "$reason"
        },
        count: { $sum: 1 },
        alerts: { $push: { id: "$_id", created: "$createdAt", fcmToken: "$fcmToken" } }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  
  console.log(`Found ${duplicateGroups.length} groups of duplicate alerts\n`);
  
  let totalDeleted = 0;
  
  for (const group of duplicateGroups) {
    console.log(`Group: "${group._id.title}" at ${group._id.time} - ${group.count} duplicates`);
    
    // Sort by creation date, keep the oldest (first created)
    group.alerts.sort((a, b) => new Date(a.created) - new Date(b.created));
    const keepAlert = group.alerts[0]; // Keep the first one
    const deleteAlerts = group.alerts.slice(1); // Delete the rest
    
    console.log(`  Keeping: ${keepAlert.id} (created: ${new Date(keepAlert.created).toLocaleString()})`);
    
    for (const deleteAlert of deleteAlerts) {
      console.log(`  Deleting: ${deleteAlert.id} (created: ${new Date(deleteAlert.created).toLocaleString()})`);
      
      await mongoose.connection.db.collection('alerts').deleteOne({ _id: deleteAlert.id });
      totalDeleted++;
    }
    console.log('');
  }
  
  console.log(`✅ Cleanup complete: ${totalDeleted} duplicate alerts deleted`);
  console.log('🚀 Server restart required to apply cron fix');
  
  mongoose.disconnect();
}).catch(console.error);
