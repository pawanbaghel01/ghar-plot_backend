import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/adminAuthSchema.js';
import Employee from './models/employeeSchema.js';

dotenv.config();

const debugTokens = async () => {
    try {
        await mongoose.connect(process.env.MONGO_CONN);
        console.log('Connected to MongoDB');

        const admins = await Admin.find({});
        console.log('--- ALL ADMINS ---');
        admins.forEach(a => console.log(`ADMIN | ID: ${a._id} | Email: ${a.email} | Token: ${a.fcmToken}`));

        const subAdmins = await Employee.find({ giveAdminAccess: true, fcmToken: { $exists: true, $ne: "" } });
        console.log('--- SUB-ADMINS (Employees with Admin Access) ---');
        subAdmins.forEach(sa => console.log(`SUBADMIN | ID: ${sa._id} | Email: ${sa.email} | Name: ${sa.name} | Token: ${sa.fcmToken}`));

        process.exit(0);
    } catch (err) {
        console.error(err); 
        process.exit(1);
    }
};

debugTokens();
