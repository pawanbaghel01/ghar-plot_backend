import admin from './config/firebase.js';
import Admin from './models/adminAuthSchema.js';
import mongoose from 'mongoose';
import { config } from 'dotenv';
config();

await mongoose.connect(process.env.MONGO_CONN);
console.log('✅ DB connected');

const adminDoc = await Admin.findOne({ fcmToken: { $exists: true, $ne: '' } });
if (!adminDoc) { console.log('❌ No admin with FCM token'); process.exit(1); }

console.log('📱 Admin:', adminDoc.email);
console.log('📱 Token:', adminDoc.fcmToken.substring(0, 30) + '...');

const message = {
  token: adminDoc.fcmToken,
  notification: {
    title: '🔔 TEST - Due Reminder',
    body: 'shivam: Test Client Follow Up | Udit Pal',
  },
  data: {
    type: 'admin_reminder',
    title: '🔔 TEST - Due Reminder',
    body: 'shivam: Test Client Follow Up | Udit Pal',
    employeeName: 'shivam',
    reminderTitle: 'Test Client Follow Up',
    clientName: 'Udit Pal',
    timestamp: String(Date.now()),
  },
  android: {
    priority: 'high',
    notification: {
      channelId: 'gharplot_alerts',
      sound: 'default',
      defaultSound: true,
      defaultVibrateTimings: true,
      priority: 'high',
    },
  },
};

try {
  const response = await admin.messaging().send(message);
  console.log('✅ FCM sent:', response);
} catch (err) {
  console.log('❌ FCM error:', err.code, err.message);
}

await mongoose.disconnect();
