import mongoose from 'mongoose';
import dotenv from 'dotenv';
import url from 'url';
dotenv.config();
async function run() {
    await mongoose.connect(process.env.MONGO_CONN);
    const Admin = (await import('./models/adminAuthSchema.js')).default;
    const Employee = (await import('./models/employeeSchema.js')).default;

    const admins = await Admin.find({ fcmToken: { $exists: true, $ne: "" } }).select('name email fcmToken');
    const emps = await Employee.find({ fcmToken: { $exists: true, $ne: "" } }).select('name email fcmToken adminReminderPopupEnabled');

    console.log('Admins:', JSON.stringify(admins, null, 2));
    console.log('\nEmployees:', JSON.stringify(emps, null, 2));
    process.exit(0);
}
run().catch(console.error);
