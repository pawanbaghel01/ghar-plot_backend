import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkRecent() {
    await mongoose.connect(process.env.MONGO_CONN);
    const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }));

    console.log('--- LAST 5 NOTIFICATIONS IN DB ---');
    const logs = await Notification.find().sort({ createdAt: -1 }).limit(5);
    logs.forEach(l => {
        console.log(`[${l.createdAt || l.timestamp}] Title: ${l.title} | Type: ${l.type}`);
    });

    await mongoose.disconnect();
}

checkRecent();
