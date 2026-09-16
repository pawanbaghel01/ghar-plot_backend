import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Reminder from './models/reminderSchema.js';
import Employee from './models/employeeSchema.js';
import fs from 'fs';

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_CONN);
        const triggered = await Reminder.find({ cronFired: true })
            .sort({ lastTriggered: -1 })
            .limit(10)
            .populate('employeeId');

        let out = '--- Last 10 Triggered Reminders ---\n';
        triggered.forEach(r => {
            out += `Title: ${r.title}\n`;
            out += `Employee: ${r.employeeId?.name}\n`;
            out += `adminReminderPopupEnabled: ${r.employeeId?.adminReminderPopupEnabled}\n`;
            out += `Time: ${r.lastTriggered}\n`;
            out += '---------------------------\n';
        });
        fs.writeFileSync('trigger_log.txt', out);
    } catch (e) {
        fs.writeFileSync('trigger_log.txt', String(e));
    } finally {
        process.exit(0);
    }
};

run();
