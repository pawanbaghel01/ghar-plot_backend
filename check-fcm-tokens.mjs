import mongoose from 'mongoose';
import Employee from './models/employeeSchema.js';
import Reminder from './models/reminderSchema.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkFCMStatus() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const employeesWithToken = await Employee.find({
            fcmToken: { $exists: true, $ne: '' }
        }).select('name email');

        const employeesWithoutToken = await Employee.find({
            $or: [{ fcmToken: { $exists: false } }, { fcmToken: '' }]
        }).select('name email');

        const dueReminders = await Reminder.find({
            isActive: true,
            status: { $nin: ['completed', 'dismissed'] },
            reminderDateTime: { $lte: new Date() }
        }).populate('employeeId', 'name fcmToken').limit(5);

        console.log('=== FCM TOKEN STATUS ===');
        console.log(`WITH TOKEN: ${employeesWithToken.length}`);
        console.log(`WITHOUT TOKEN: ${employeesWithoutToken.length}`);
        console.log(`\nDUE REMINDERS: ${dueReminders.length}`);

        if (employeesWithoutToken.length > 0) {
            console.log('\nEmployees WITHOUT FCM tokens:');
            employeesWithoutToken.forEach(e => console.log(`  - ${e.name}`));
        }

        if (dueReminders.length > 0) {
            console.log('\nDue reminders:');
            dueReminders.forEach(r => {
                const hasToken = r.employeeId?.fcmToken ? 'HAS TOKEN' : 'NO TOKEN';
                console.log(`  - ${r.title} (${r.employeeId?.name}) - ${hasToken}`);
            });
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1);
    }
}

checkFCMStatus();
