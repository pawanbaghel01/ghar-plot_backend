import mongoose from 'mongoose';
import dotenv from 'dotenv';
import url from 'url';

dotenv.config();

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

async function run() {
    await mongoose.connect(process.env.MONGO_CONN);
    console.log('Connected to DB');

    const Notification = (await import('./models/notificationModel.js')).default;

    const res = await Notification.deleteMany({ title: { $regex: 'Reminder Alert', $options: 'i' } });

    console.log(`Deleted ${res.deletedCount} notifications containing 'Reminder Alert'`);

    process.exit(0);
}

run().catch(console.error);
