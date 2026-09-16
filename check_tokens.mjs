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

    const es = await Employee.find({ name: /shivam/i }).select('name email fcmToken adminReminderPopupEnabled');
    const as = await Admin.find({ email: /shivam/i }).select('name email fcmToken');
    const as2 = await Admin.find({ name: /shivam/i }).select('name email fcmToken');

    console.log('Emps:', JSON.stringify(es, null, 2));
    console.log('Admins by email:', JSON.stringify(as, null, 2));
    console.log('Admins by name:', JSON.stringify(as2, null, 2));

    process.exit(0);
}

run().catch(console.error);
