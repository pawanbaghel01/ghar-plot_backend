import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Reminder from './models/reminderSchema.js';

dotenv.config();

const run = async () => {
    await mongoose.connect(process.env.MONGO_CONN);
    const now = new Date();
    const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);

    const triggered = await Reminder.find({
        cronFired: true,
        lastTriggered: { $gte: tenMinsAgo }
    }).populate('employeeId', 'name adminReminderPopupEnabled');

    console.log('--- Triggered in last 10 mins ---');
    triggered.forEach(r => {
        console.log(`Title: ${r.title}`);
        console.log(`Emp: ${r.employeeId?.name}`);
        console.log(`IsAdminPopupEnabled: ${r.employeeId?.adminReminderPopupEnabled}`);
        console.log(`TriggeredAt: ${r.lastTriggered}`);
        console.log('---------------------------');
    });

    // Check if there are any due reminders NOT triggered
    const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const due = await Reminder.find({
        isActive: true,
        cronFired: { $ne: true },
        status: { $nin: ['completed', 'dismissed'] },
        $or: [
            { status: 'pending', reminderDateTime: { $lte: now, $gte: fiveMinsAgo }, isRepeating: { $ne: true } },
            { status: 'snoozed', snoozedUntil: { $lte: now, $gte: fiveMinsAgo } }
        ]
    });
    console.log(`Total due but not fired: ${due.length}`);

    process.exit(0);
};

run();
