import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Reminder from './models/reminderSchema.js';

dotenv.config();

async function fix() {
    try {
        await mongoose.connect(process.env.MONGO_CONN || process.env.MONGODB_URI);
        const res = await Reminder.updateMany(
            { status: { $in: ['pending', 'snoozed'] }, isActive: true, cronFired: true },
            { $set: { cronFired: false } }
        );
        console.log(`✅ Fixed DB: Reset cronFired to false for ${res.modifiedCount} active reminders.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fix();
