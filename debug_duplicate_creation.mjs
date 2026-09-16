import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_CONN).then(async () => {
  console.log('=== DEBUGGING DUPLICATE CREATION ===\n');
  
  // Check the exact creation pattern of "New4" alerts
  const new4Alerts = await mongoose.connection.db.collection('alerts').find({
    title: "New4"
  }).sort({createdAt: 1}).toArray();
  
  console.log(`Found ${new4Alerts.length} alerts with title "New4"\n`);
  
  new4Alerts.forEach((alert, i) => {
    const created = new Date(alert.createdAt);
    const scheduled = alert.scheduledDateTime ? new Date(alert.scheduledDateTime) : null;
    
    console.log(`Alert ${i + 1}:`);
    console.log(`  ID: ${alert._id}`);
    console.log(`  Time: ${alert.time}`);
    console.log(`  Date: ${alert.date ? new Date(alert.date).toDateString() : 'No date'}`);
    console.log(`  Repeat: ${alert.repeatFrequency}`); 
    console.log(`  Repeat Metadata: ${JSON.stringify(alert.repeatMetadata)}`);
    console.log(`  Created at: ${created.toISOString()}`);
    console.log(`  Scheduled at: ${scheduled ? scheduled.toISOString() : 'No schedule'}`);
    console.log(`  User ID: ${alert.userId}`);
    console.log(`  Active: ${alert.isActive}`);
    console.log('');
  });
  
  // Check if they have same userId and similar creation time
  if (new4Alerts.length > 1) {
    const first = new4Alerts[0];
    const second = new4Alerts[1];
    const timeDiff = new Date(second.createdAt) - new Date(first.createdAt);
    
    console.log('=== DUPLICATE ANALYSIS ===');
    console.log(`Time difference between creation: ${timeDiff}ms (${timeDiff/1000} seconds)`);
    console.log(`Same user: ${first.userId.toString() === second.userId.toString()}`);
    console.log(`Same title: ${first.title === second.title}`);
    console.log(`Different time: ${first.time !== second.time}`);
    console.log(`Different repeat: ${first.repeatFrequency !== second.repeatFrequency}`);
    
    console.log('\n🔍 POSSIBLE CAUSES:');
    console.log('1. Frontend making multiple API calls');
    console.log('2. Timezone conversion creating different times');
    console.log('3. Form submission sending different data');
    console.log('4. Backend duplicate prevention not catching this case');
  }
  
  mongoose.disconnect();
}).catch(console.error);
