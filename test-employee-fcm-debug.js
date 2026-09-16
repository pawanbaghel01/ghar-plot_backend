import mongoose from 'mongoose';
import Employee from './models/employeeSchema.js';
import Reminder from './models/reminderSchema.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugEmployeeFCM() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to database');

        // 1. Check employees with FCM tokens
        console.log('\n📱 === EMPLOYEES WITH FCM TOKENS ===');
        const employeesWithToken = await Employee.find({
            fcmToken: { $exists: true, $ne: '' }
        }).select('name email fcmToken');

        if (employeesWithToken.length === 0) {
            console.log('❌ NO EMPLOYEES HAVE FCM TOKENS SAVED!');
            console.log('   👉 Fix: Employee app se FCM token save karna hoga');
            console.log('   👉 API: POST /api/employee/save-token');
            console.log('   👉 Body: { employeeId: "xxx", fcmToken: "yyy" }');
        } else {
            console.log(`✅ Found ${employeesWithToken.length} employees with FCM tokens:`);
            employeesWithToken.forEach(emp => {
                console.log(`   - ${emp.name} (${emp.email})`);
                console.log(`     Token: ${emp.fcmToken.substring(0, 50)}...`);
            });
        }

        // 2. Check all employees without FCM tokens
        console.log('\n🚫 === EMPLOYEES WITHOUT FCM TOKENS ===');
        const employeesWithoutToken = await Employee.find({
            $or: [
                { fcmToken: { $exists: false } },
                { fcmToken: '' }
            ]
        }).select('name email');

        if (employeesWithoutToken.length > 0) {
            console.log(`⚠️ ${employeesWithoutToken.length} employees don't have FCM tokens:`);
            employeesWithoutToken.forEach(emp => {
                console.log(`   - ${emp.name} (${emp.email})`);
            });
        } else {
            console.log('✅ All employees have FCM tokens!');
        }

        // 3. Check active reminders
        console.log('\n⏰ === ACTIVE REMINDERS ===');
        const now = new Date();
        const allReminders = await Reminder.find({ isActive: true })
            .populate('employeeId', 'name email fcmToken')
            .sort({ reminderDateTime: 1 })
            .limit(10);

        if (allReminders.length === 0) {
            console.log('❌ No active reminders found!');
        } else {
            console.log(`Found ${allReminders.length} active reminders (showing first 10):`);
            allReminders.forEach(r => {
                const isPast = r.reminderDateTime <= now;
                const hasFcmToken = r.employeeId?.fcmToken ? '✅' : '❌';
                const timeStatus = isPast ? '🔴 DUE' : '🟢 FUTURE';

                console.log(`\n   ${timeStatus} ${r.title}`);
                console.log(`     Employee: ${r.employeeId?.name || 'Unknown'} ${hasFcmToken} FCM`);
                console.log(`     Time: ${r.reminderDateTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
                console.log(`     Status: ${r.status}`);
                console.log(`     Last Triggered: ${r.lastTriggered || 'Never'}`);
            });
        }

        // 4. Check due reminders (ready to fire)
        console.log('\n🔔 === DUE REMINDERS (Should fire now) ===');
        const dueReminders = await Reminder.find({
            isActive: true,
            status: { $nin: ['completed', 'dismissed'] },
            $or: [
                {
                    status: 'pending',
                    reminderDateTime: { $lte: now }
                },
                {
                    status: 'snoozed',
                    snoozedUntil: { $lte: now }
                },
                {
                    isRepeating: true,
                    nextTrigger: { $lte: now }
                }
            ]
        }).populate('employeeId', 'name email fcmToken');

        if (dueReminders.length === 0) {
            console.log('ℹ️ No reminders are currently due to fire');
        } else {
            console.log(`🚨 ${dueReminders.length} reminders should fire NOW:`);
            dueReminders.forEach(r => {
                const hasFcmToken = r.employeeId?.fcmToken ? '✅ Has FCM' : '❌ NO FCM TOKEN';
                console.log(`   - ${r.title}`);
                console.log(`     Employee: ${r.employeeId?.name} ${hasFcmToken}`);

                // Check if recently triggered
                if (r.lastTriggered) {
                    const timeSince = now - new Date(r.lastTriggered);
                    const hoursSince = Math.floor(timeSince / (60 * 60 * 1000));
                    console.log(`     Last triggered: ${hoursSince} hours ago`);
                    if (hoursSince < 1) {
                        console.log(`     ⚠️ Won't fire again (cooldown: 1 hour)`);
                    } else {
                        console.log(`     ✅ Will fire on next cron run`);
                    }
                } else {
                    console.log(`     ✅ Never triggered - will fire on next cron run`);
                }
            });
        }

        // 5. Summary and recommendations
        console.log('\n📊 === SUMMARY ===');
        console.log(`Employees with FCM token: ${employeesWithToken.length}`);
        console.log(`Employees without FCM token: ${employeesWithoutToken.length}`);
        console.log(`Total active reminders: ${allReminders.length}`);
        console.log(`Due reminders ready to fire: ${dueReminders.length}`);

        console.log('\n💡 === RECOMMENDATIONS ===');
        if (employeesWithoutToken.length > 0) {
            console.log('1️⃣ Employee app se FCM token save karein:');
            console.log('   POST /api/employee/save-token');
            console.log('   Body: { employeeId: "xxx", fcmToken: "yyy" }');
        }
        if (dueReminders.length > 0) {
            console.log('2️⃣ Server running hai? Cron job console mein check karein:');
            console.log('   - "⏰ Reminder cron started" message server start par');
            console.log('   - "🔍 Checking reminders..." message har minute');
        }
        console.log('3️⃣ Server logs check karein for FCM errors');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
    }
}

debugEmployeeFCM();
