import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/employeeSchema.js';
import Admin from './models/adminAuthSchema.js';
import Notification from './models/notificationModel.js';

dotenv.config();

const checkRecentActivity = async () => {
    try {
        await mongoose.connect(process.env.MONGO_CONN);

        console.log('--- RECENT ADMIN NOTIFICATIONS ---');
        const recentNotifs = await Notification.find({ type: 'admin_reminder' })
            .sort({ createdAt: -1 })
            .limit(5);

        recentNotifs.forEach(n => {
            console.log(`Time: ${n.createdAt.toISOString()} | Title: ${n.title}`);
        });

        console.log('\n--- ALL ADMIN TOKENS ---');
        const admins = await Admin.find({});
        admins.forEach(a => console.log(`Admin ${a.email}: ${a.fcmToken ? a.fcmToken.substring(0, 10) + '...' : 'NONE'}`));

        console.log('\n--- ALL SUB-ADMIN TOKENS ---');
        const subAdmins = await Employee.find({ giveAdminAccess: true });
        subAdmins.forEach(e => console.log(`Sub-Admin ${e.name}: ${e.fcmToken ? e.fcmToken.substring(0, 10) + '...' : 'NONE'}`));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkRecentActivity();
