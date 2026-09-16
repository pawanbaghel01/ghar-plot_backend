import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/employeeSchema.js';
import Admin from './models/adminAuthSchema.js';

dotenv.config();

const check = async () => {
    await mongoose.connect(process.env.MONGO_CONN);
    const empCount = await Employee.countDocuments({ fcmToken: { $exists: true, $ne: '' } });
    const adminCount = await Admin.countDocuments({ fcmToken: { $exists: true, $ne: '' } });
    console.log(`Employees with tokens: ${empCount}`);
    console.log(`Admins with tokens: ${adminCount}`);

    if (adminCount > 0) {
        const admins = await Admin.find({ fcmToken: { $exists: true, $ne: '' } });
        admins.forEach(a => console.log(`Admin Token: ${a.email} -> ${a.fcmToken.substring(0, 10)}...`));
    }

    if (empCount > 0) {
        const emps = await Employee.find({ fcmToken: { $exists: true, $ne: '' } });
        emps.forEach(e => console.log(`Employee Token: ${e.name} -> ${e.fcmToken.substring(0, 10)}...`));
    }

    process.exit(0);
};
check();
