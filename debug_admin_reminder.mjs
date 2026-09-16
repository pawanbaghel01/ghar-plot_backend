import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_CONN).then(async () => {
  console.log('=== ADMIN REMINDER DEBUG ===\n');
  
  // Find employees with admin notification enabled
  const adminEmployees = await mongoose.connection.db.collection('employees').find({
    adminReminderPopupEnabled: true
  }).toArray();
  
  console.log(`Found ${adminEmployees.length} employees with admin notification enabled:`);
  adminEmployees.forEach(emp => {
    console.log(`  - ${emp.name} (${emp._id}) | fcmToken: ${emp.fcmToken ? 'exists' : 'missing'}`);
  });
  
  // Check recent reminders for these employees
  console.log('\n--- Recent Reminders for Admin-Enabled Employees ---');
  const adminEmpIds = adminEmployees.map(e => e._id);
  const recentReminders = await mongoose.connection.db.collection('reminders').find({
    employeeId: { $in: adminEmpIds },
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
  }).sort({createdAt: -1}).limit(10).toArray();
  
  recentReminders.forEach(r => {
    console.log(`  Reminder: ${r.title} | Employee: ${r.employeeId} | Status: ${r.status} | cronFired: ${r.cronFired}`);
  });
  
  // Check notifications created for admin reminders
  console.log('\n--- Admin Notification Records ---');
  const adminNotifications = await mongoose.connection.db.collection('notifications').find({
    type: 'admin_reminder',
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
  }).sort({createdAt: -1}).limit(10).toArray();
  
  adminNotifications.forEach(n => {
    const empId = n.metadata?.employeeId;
    const reminderTitle = n.metadata?.reminderTitle;
    console.log(`  Notification: ${n.title} | Employee: ${empId} | Reminder: ${reminderTitle} | Created: ${new Date(n.createdAt).toLocaleString()}`);
  });
  
  // Look for pattern in creation vs notification
  console.log('\n--- Creation vs Notification Pattern ---');
  
  // Check if reminders are created without proper notifications
  const remindersWithoutNotifs = await mongoose.connection.db.collection('reminders').aggregate([
    { $match: { 
        employeeId: { $in: adminEmpIds },
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
        status: { $nin: ['dismissed', 'completed'] }
      }
    },
    { $lookup: {
        from: 'notifications',
        let: { reminderId: '$_id' },
        pipeline: [
          { $match: { 
              $expr: { $eq: ['$metadata.reminderId', { $toString: '$$reminderId' }] },
              type: 'admin_reminder'
            }
          }
        ],
        as: 'notifications'
      }
    },
    { $match: { notifications: { $size: 0 } } }
  ]).toArray();
  
  console.log(`Found ${remindersWithoutNotifs.length} reminders without admin notifications`);
  
  mongoose.disconnect();
}).catch(console.error);
