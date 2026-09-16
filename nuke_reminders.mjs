import mongoose from 'mongoose';
import dotenv from 'dotenv';
import url from 'url';

dotenv.config();

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

async function run() {
    try {
        const connStr = process.env.MONGO_CONN || process.env.MONGO_URI;
        console.log('Connecting to:', connStr.substring(0, 20) + '...');
        await mongoose.connect(connStr);
        console.log('Connected to DB');

        const Reminder = (await import('./models/reminderSchema.js')).default;

        // Find reminders that might have triggered those notifications
        const upcoming = await Reminder.find({ status: 'pending' }).select('clientName title reminderDateTime status cronFired');
        console.log(`Found ${upcoming.length} pending reminders in DB.`);
        console.log(upcoming);

        // Force complete all pending ones to STOP production server cron job from picking them up
        if (upcoming.length > 0) {
            const res = await Reminder.updateMany(
                { status: 'pending' },
                { $set: { cronFired: true, status: 'completed', triggerCount: 999 } }
            );
            console.log(`Updated ${res.modifiedCount} old reminders to 'completed' status.`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run().catch(console.error);
