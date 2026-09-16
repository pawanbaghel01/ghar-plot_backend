import admin from './config/firebase.js';
import Employee from './models/employeeSchema.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function testPush() {
    try {
        await mongoose.connect(process.env.MONGO_CONN);
        const emp = await Employee.findOne({ name: /shivam/i });
        if (!emp || !emp.fcmToken) {
            console.log('No employee or token found');
            process.exit(1);
        }

        console.log(`Sending DATA-ONLY test push to ${emp.name}...`);

        const message = {
            token: emp.fcmToken,
            data: {
                type: "employee_due_reminder",
                title: "DATA-ONLY TEST",
                clientName: "Success!",
                timestamp: String(Date.now())
            },
            android: {
                priority: "high"
            }
        };

        const response = await admin.messaging().send(message);
        console.log('✅ Successfully sent message:', response);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error sending message:', error);
        process.exit(1);
    }
}

testPush();
