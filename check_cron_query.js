import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Reminder from './models/reminderSchema.js';

dotenv.config();

const checkReminders = async () => {
    try {
        if (!process.env.MONGO_CONN) {
            console.error('MONGO_CONN not found in .env');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGO_CONN);
        console.log('Connected to MongoDB');

        const now = new Date();
        const count = await Reminder.countDocuments({
            isActive: true,
            status: { $nin: ['completed', 'dismissed'] },
            cronFired: { $ne: true },
            $or: [
                { status: 'pending', reminderDateTime: { $lte: now } },
                { status: 'snoozed', snoozedUntil: { $lte: now } },
                { isRepeating: true, nextTrigger: { $lte: now } }
            ]
        });

        console.log(`Found ${count} reminders matching the cron query.`);

        if (count > 0) {
            const samples = await Reminder.find({
                isActive: true,
                status: { $nin: ['completed', 'dismissed'] },
                cronFired: { $ne: true },
                $or: [
                    { status: 'pending', reminderDateTime: { $lte: now } },
                    { status: 'snoozed', snoozedUntil: { $lte: now } },
                    { isRepeating: true, nextTrigger: { $lte: now } }
                ]
            }).limit(5);

            samples.forEach(r => {
                console.log(`ID: ${r._id} | Title: ${r.title} | Status: ${r.status} | cronFired: ${r.cronFired} | reminderDateTime: ${r.reminderDateTime} | nextTrigger: ${r.nextTrigger}`);
            });
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkReminders();
