import mongoose from 'mongoose';
import dotenv from 'dotenv';
import url from 'url';

dotenv.config();

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

async function run() {
    await mongoose.connect(process.env.MONGO_CONN);
    console.log('Connected to DB');

    const Employee = (await import('./models/employeeSchema.js')).default;
    const Admin = (await import('./models/adminAuthSchema.js')).default;

    // Clear all FCM tokens to solve the device mis-registration issue
    const resAdmin = await Admin.updateMany({}, { $set: { fcmToken: "" } });
    const resEmp = await Employee.updateMany({}, { $set: { fcmToken: "" } });

    console.log(`Cleared ${resAdmin.modifiedCount} admin tokens`);
    console.log(`Cleared ${resEmp.modifiedCount} employee tokens`);

    process.exit(0);
}

run().catch(console.error);
