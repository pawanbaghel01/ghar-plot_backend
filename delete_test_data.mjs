import mongoose from 'mongoose';
import dotenv from 'dotenv';
import url from 'url';

dotenv.config();

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const Reminder = (await import('./models/Reminder.js')).default;
    const Notification = (await import('./models/Notification.js')).default;

    const resR = await Reminder.deleteMany({ title: { $regex: /test/i } });
    const resR2 = await Reminder.deleteMany({ clientName: { $regex: /test/i } });

    const resN = await Notification.deleteMany({ title: { $regex: /test/i } });
    const resN2 = await Notification.deleteMany({ message: { $regex: /test/i } });

    console.log('Deleted Test Reminders based on title:', resR.deletedCount);
    console.log('Deleted Test Reminders based on clientName:', resR2.deletedCount);
    console.log('Deleted Test Notifications based on title:', resN.deletedCount);
    console.log('Deleted Test Notifications based on message:', resN2.deletedCount);

    process.exit(0);
}

run().catch(console.error);
