import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Reminder from './models/reminderSchema.js';

dotenv.config();

const test = async () => {
    await mongoose.connect(process.env.MONGO_CONN);
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    const reminders = await Reminder.find({
        isActive: true,
        status: { $nin: ['completed', 'dismissed'] },
        cronFired: { $ne: true },
        $or: [
            { status: 'pending', reminderDateTime: { $lte: now, $gte: twelveHoursAgo }, isRepeating: { $ne: true } },
            { status: 'snoozed', snoozedUntil: { $lte: now } },
            { isRepeating: true, nextTrigger: { $lte: now } }
        ]
    });

    console.log('Total Found:', reminders.length);
    if (reminders.length > 0) {
        console.log('Sample Match Reasons:');
        reminders.slice(0, 5).forEach(r => {
            let reason = '';
            if (r.status === 'pending' && r.reminderDateTime <= now && r.reminderDateTime >= twelveHoursAgo && !r.isRepeating) reason = 'Pending+Due';
            else if (r.status === 'snoozed' && r.snoozedUntil <= now) reason = 'Snoozed+Due';
            else if (r.isRepeating && r.nextTrigger <= now) reason = 'Repeating+Due';
            else reason = 'UNKNOWN (Query matched but manual check failed)';

            console.log(`- ${r.title} | ID: ${r._id} | Time: ${r.reminderDateTime?.toISOString()} | Reason: ${reason}`);
        });
    }

    process.exit(0);
};

test();
