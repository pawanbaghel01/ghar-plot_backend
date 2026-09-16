import mongoose from 'mongoose';
import Reminder from './models/reminderSchema.js';
import Employee from './models/employeeSchema.js';
import { sendReminderNotification } from './utils/fcmNotificationService.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const logFile = 'test_results.log';
function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

async function testTriggerReminder() {
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    try {
        log('🧪 Starting FCM Test...');
        await mongoose.connect(process.env.MONGO_CONN);
        log('✅ Connected to MongoDB');

        // 1. Find an employee with a token
        const employee = await Employee.findOne({ fcmToken: { $exists: true, $ne: "" } });
        if (!employee) {
            log('❌ No employee found with an FCM token in the database.');
            log('   Please make sure at least one employee has a valid fcmToken stored.');
            process.exit(1);
        }
        log(`👤 Testing with employee: ${employee.name} (${employee.email})`);
        log(`📱 Token: ${employee.fcmToken.substring(0, 20)}...`);

        // 2. Create a dummy reminder for testing
        const testReminder = new Reminder({
            employeeId: employee._id,
            title: "Test Reminder Triggered Manually",
            comment: "This is a test to verify FCM delivery",
            reminderDateTime: new Date(),
            clientName: "Test Client",
            phone: "1234567890",
            status: 'pending',
            isActive: true
        });

        log('📝 Created temporary test reminder');

        // 3. Try sending the FCM notification directly
        log('📤 Attempting to send FCM notification...');
        const fcmResult = await sendReminderNotification(employee._id, {
            reminderId: testReminder._id,
            title: testReminder.title,
            name: testReminder.clientName,
            email: testReminder.email,
            phone: testReminder.phone,
            location: testReminder.location,
            note: testReminder.comment,
            reminderTime: testReminder.reminderDateTime
        });

        if (fcmResult.success) {
            log('✅ SUCCESS: FCM notification sent successfully!');
            log(`   Message ID: ${fcmResult.messageId}`);
        } else {
            log(`❌ FAILED: FCM notification error: ${fcmResult.message}`);
            if (fcmResult.shouldRemoveToken) {
                log('   ⚠️ Note: The token is invalid and should be removed from DB.');
            }
        }

        await mongoose.disconnect();
        log('🏁 Test finished');
        process.exit(0);
    } catch (error) {
        log(`❌ Error during test: ${error.message}`);
        process.exit(1);
    }
}

testTriggerReminder();
