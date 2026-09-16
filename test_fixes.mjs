import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Test duplicate prevention logic
async function testDuplicateLogic() {
  await mongoose.connect(process.env.MONGO_CONN);
  console.log('=== TESTING DUPLICATE PREVENTION LOGIC ===\n');
  
  // Sample data for testing
  const testUserId = '507f1f77bcf86cd799439011'; // Sample ObjectId
  const testTitle = 'Test Alert';
  const testTime = '14:30';
  const testDate = new Date();
  const testReason = 'Test Reason';
  
  // Test the exact duplicate check logic used in controllers
  const existingAlert = await mongoose.connection.db.collection('alerts').findOne({
    userId: new mongoose.Types.ObjectId(testUserId),
    title: { $regex: new RegExp(testTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
    $or: [
      { time: testTime },
      { 
        date: {
          $gte: new Date(testDate.getTime() - 24 * 60 * 60 * 1000),
          $lte: new Date(testDate.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    ],
    isActive: true,
    $or: [
      { createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } },
      { title: testTitle, time: testTime, reason: testReason }
    ]
  });
  
  console.log('Test duplicate check result:', existingAlert ? 'DUPLICATE FOUND' : 'NO DUPLICATE');
  
  // Check recent alerts for patterns
  console.log('\n=== RECENT ALERT PATTERNS ===');
  const recentAlerts = await mongoose.connection.db.collection('alerts')
    .find({}).sort({createdAt: -1}).limit(5).toArray();
    
  recentAlerts.forEach((alert, i) => {
    console.log(`${i+1}. "${alert.title}" | ${alert.time} | ${new Date(alert.createdAt).toLocaleString()} | Active: ${alert.isActive}`);
  });
  
  // Check for actual duplicates in last hour
  console.log('\n=== ACTUAL DUPLICATES IN LAST HOUR ===');
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const duplicates = await mongoose.connection.db.collection('alerts').aggregate([
    { $match: { createdAt: { $gte: oneHourAgo } } },
    { $group: { 
        _id: { title: "$title", time: "$time", userId: "$userId" },
        count: { $sum: 1 },
        ids: { $push: "$_id" }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  
  console.log(`Found ${duplicates.length} actual duplicate groups in last hour:`);
  duplicates.forEach(dup => {
    console.log(`  "${dup._id.title}" at ${dup._id.time} - ${dup.count} copies - IDs: ${dup.ids.join(', ')}`);
  });
  
  mongoose.disconnect();
}

testDuplicateLogic().catch(console.error);
