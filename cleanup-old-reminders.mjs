import mongoose from 'mongoose';
import dotenv from 'dotenv';
import url from 'url';
import fs from 'fs';

dotenv.config();

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const Reminder = (await import('./models/Reminder.js')).default;

    const now = new Date();
    const res = await Reminder.updateMany(
        { reminderDateTime: { $lt: now }, cronFired: { $ne: true } },
        { $set: { cronFired: true } }
    );

    console.log('Updated old reminders:', res);
    process.exit(0);
}

run().catch(console.error);
