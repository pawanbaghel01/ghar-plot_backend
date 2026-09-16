import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Reminder from './models/reminderSchema.js';
import Employee from './models/employeeSchema.js';
import Admin from './models/adminAuthSchema.js';

dotenv.config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_CONN || process.env.MONGODB_URI);
        const now = new Date();
        console.log('Current Time (UTC):', now.toISOString());

        const reminders = await Reminder.find({
            isActive: true,
            status: { $nin: ['completed', 'dismissed'] },
            reminderDateTime: { $lte: now }
        }).populate('employeeId', 'name email adminReminderPopupEnabled');

        console.log(`Found ${reminders.length} due reminders:`);
        reminders.forEach(r => {
            console.log(`- ${r.title} | DT: ${r.reminderDateTime?.toISOString()} | cronFired: ${r.cronFired} | Status: ${r.status} | Emp: ${r.employeeId?.name} (Popup: ${r.employeeId?.adminReminderPopupEnabled})`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
