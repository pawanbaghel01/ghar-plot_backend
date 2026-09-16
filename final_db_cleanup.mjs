import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_CONN);
        console.log('Connected to DB');

        // Check both Reminder and Notification collections
        const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }));
        const Reminder = mongoose.model('Reminder', new mongoose.Schema({}, { strict: false }));

        const delNotifs = await Notification.deleteMany({
            $or: [
                { title: /Reminder Alert/i },
                { message: /Reminder Alert/i },
                { 'metadata.reminderTitle': /Reminder Alert/i }
            ]
        });
        console.log(`Deleted ${delNotifs.deletedCount} legacy notifications.`);

        const delReminders = await Reminder.deleteMany({
            $or: [
                { title: /Reminder Alert/i },
                { note: /Reminder Alert/i }
            ]
        });
        console.log(`Deleted ${delReminders.deletedCount} legacy reminders.`);

        await mongoose.disconnect();
        console.log('DB disconnected');
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
