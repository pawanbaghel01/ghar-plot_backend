const mongoose = require('mongoose');
require('dotenv').config();

// Define schema manually to avoid registration issues
const reminderSchema = new mongoose.Schema({}, { strict: false });
const Reminder = mongoose.model('Reminder', reminderSchema, 'reminders');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_CONN);
        console.log('Connected to DB');
        const now = new Date();
        const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);

        const triggered = await Reminder.find({
            cronFired: true,
            lastTriggered: { $gte: tenMinsAgo }
        });

        console.log(`--- Triggered in last 10 mins (${triggered.length}) ---`);
        for (const r of triggered) {
            console.log(`Title: ${r.title}`);
            console.log(`EmpID: ${r.employeeId}`);
            console.log(`TriggeredAt: ${r.lastTriggered}`);
            console.log('---------------------------');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
};

run();
