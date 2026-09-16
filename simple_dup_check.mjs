import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_CONN).then(async () => {
  console.log('=== RECENT ALERTS CHECK ===');
  
  // Check last 10 alerts
  const alerts = await mongoose.connection.db.collection('alerts')
    .find({}).sort({createdAt: -1}).limit(10).toArray();
  
  alerts.forEach((a, i) => {
    const created = a.createdAt ? new Date(a.createdAt).toLocaleString() : 'No date';
    console.log(`${i+1}. "${a.title}" | ${a.time} | ${a.repeatFrequency} | ${created} | id: ${a._id}`);
  });
  
  console.log('\n=== RECENT REMINDERS CHECK ===');
  
  const reminders = await mongoose.connection.db.collection('reminders')
    .find({}).sort({createdAt: -1}).limit(10).toArray();
  
  reminders.forEach((r, i) => {
    const created = r.createdAt ? new Date(r.createdAt).toLocaleString() : 'No date';
    console.log(`${i+1}. "${r.title}" | ${r.content} | ${created} | id: ${r._id}`);
  });
  
  mongoose.disconnect();
}).catch(console.error);
