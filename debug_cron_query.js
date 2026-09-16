import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Reminder from './models/reminderSchema.js';

dotenv.config();

const test = async () => {
    await mongoose.connect(process.env.MONGO_CONN);
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    console.log('Now:', now.toISOString());
    console.log('12h ago:', twelveHoursAgo.toISOString());

    const targetId = '69a42f3fc720569e1aff51d5';
    const r = await Reminder.findById(targetId);
    console.log('Reminder DT:', r.reminderDateTime.toISOString());
    console.log('Status:', r.status);
    console.log('cronFired:', r.cronFired);

    const query = {
        _id: targetId,
        isActive: true,
        status: { $nin: ['completed', 'dismissed'] },
        // cronFired: { $ne: true }, // Commented out because it already fired today
        $or: [
            { status: 'pending', reminderDateTime: { $lte: now, $gte: twelveHoursAgo }, isRepeating: { $ne: true } },
            { status: 'snoozed', snoozedUntil: { $lte: now } },
            { isRepeating: true, nextTrigger: { $lte: now } }
        ]
    };

    const found = await Reminder.findOne(query);
    console.log('Found with query:', found ? 'YES' : 'NO');

    process.exit(0);
};

test();
