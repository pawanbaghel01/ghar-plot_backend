import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkReminderSystem() {
  try {
    console.log('🔍 Checking Reminder System Status...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_CONN);
    console.log('✅ Connected to MongoDB\n');

    // Import models
    const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }), 'employees');
    const Reminder = mongoose.model('Reminder', new mongoose.Schema({}, { strict: false }), 'reminders');
    const Notification = mongoose.model('Notification', new mongoose.Schema({}, { strict: false }), 'notifications');

    // Check 1: Find employees with adminReminderPopupEnabled
    console.log('📋 Step 1: Checking Employees with Admin Reminder Popup Enabled');
    console.log('----------------------------------------------------------------');
    const employeesWithPopup = await Employee.find({
      adminReminderPopupEnabled: true,
      isActive: true
    }).select('name email phone adminReminderPopupEnabled').limit(10);

    console.log(`   Found ${employeesWithPopup.length} employees with popup enabled:`);
    employeesWithPopup.forEach((emp, index) => {
      console.log(`   ${index + 1}. ${emp.name} (${emp.email})`);
      console.log(`      ID: ${emp._id}`);
      console.log(`      Phone: ${emp.phone || 'N/A'}`);
    });
    console.log('');

    // Check 2: Find recent reminders
    console.log('📋 Step 2: Checking Recent Reminders');
    console.log('-------------------------------------');
    const recentReminders = await Reminder.find({
      isActive: true
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('employeeId', 'name email');

    console.log(`   Found ${recentReminders.length} recent reminders:`);
    recentReminders.forEach((rem, index) => {
      console.log(`   ${index + 1}. ${rem.title || 'Untitled'}`);
      console.log(`      Employee: ${rem.employeeId?.name || 'N/A'} (${rem.employeeId?.email || 'N/A'})`);
      console.log(`      Client: ${rem.clientName || 'N/A'}`);
      console.log(`      Time: ${rem.reminderDateTime ? new Date(rem.reminderDateTime).toLocaleString() : 'N/A'}`);
      console.log(`      Status: ${rem.status || 'N/A'}`);
      console.log(`      Created: ${rem.createdAt ? new Date(rem.createdAt).toLocaleString() : 'N/A'}`);
    });
    console.log('');

    // Check 3: Find due reminders
    console.log('📋 Step 3: Checking Due Reminders (Should Trigger Notifications)');
    console.log('------------------------------------------------------------------');
    const now = new Date();
    const dueReminders = await Reminder.find({
      isActive: true,
      status: { $nin: ['completed', 'dismissed'] },
      reminderDateTime: { $lte: now }
    })
      .sort({ reminderDateTime: -1 })
      .limit(10)
      .populate('employeeId', 'name email adminReminderPopupEnabled');

    console.log(`   Found ${dueReminders.length} due reminders:`);
    dueReminders.forEach((rem, index) => {
      const timeDiff = now - new Date(rem.reminderDateTime);
      const minutesAgo = Math.floor(timeDiff / 60000);
      
      console.log(`   ${index + 1}. ${rem.title || 'Untitled'}`);
      console.log(`      Employee: ${rem.employeeId?.name || 'N/A'}`);
      console.log(`      Admin Popup: ${rem.employeeId?.adminReminderPopupEnabled ? 'YES ✅' : 'NO ❌'}`);
      console.log(`      Due: ${minutesAgo} minutes ago`);
      console.log(`      Status: ${rem.status}`);
      console.log(`      Last Triggered: ${rem.lastTriggered ? new Date(rem.lastTriggered).toLocaleString() : 'Never'}`);
    });
    console.log('');

    // Check 4: Find admin reminder notifications
    console.log('📋 Step 4: Checking Admin Reminder Notifications');
    console.log('-------------------------------------------------');
    const adminNotifications = await Notification.find({
      type: 'admin_reminder'
    })
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`   Found ${adminNotifications.length} admin reminder notifications:`);
    adminNotifications.forEach((notif, index) => {
      const timeAgo = Math.floor((now - new Date(notif.createdAt)) / 60000);
      console.log(`   ${index + 1}. ${notif.title || 'Untitled'}`);
      console.log(`      Message: ${notif.message || 'N/A'}`);
      console.log(`      Employee: ${notif.metadata?.employeeName || 'N/A'}`);
      console.log(`      Created: ${timeAgo} minutes ago`);
      console.log(`      Read: ${notif.read ? 'Yes' : 'No'}`);
    });
    console.log('');

    // Check 5: Statistics
    console.log('📊 Step 5: System Statistics');
    console.log('-----------------------------');
    const totalEmployees = await Employee.countDocuments({ isActive: true });
    const employeesWithPopupCount = await Employee.countDocuments({ 
      adminReminderPopupEnabled: true, 
      isActive: true 
    });
    const totalReminders = await Reminder.countDocuments({ isActive: true });
    const pendingReminders = await Reminder.countDocuments({ 
      isActive: true, 
      status: 'pending' 
    });
    const totalAdminNotifications = await Notification.countDocuments({ 
      type: 'admin_reminder' 
    });
    const unreadAdminNotifications = await Notification.countDocuments({ 
      type: 'admin_reminder',
      read: false 
    });

    console.log(`   Total Active Employees: ${totalEmployees}`);
    console.log(`   Employees with Admin Popup: ${employeesWithPopupCount}`);
    console.log(`   Total Active Reminders: ${totalReminders}`);
    console.log(`   Pending Reminders: ${pendingReminders}`);
    console.log(`   Due Reminders: ${dueReminders.length}`);
    console.log(`   Total Admin Notifications: ${totalAdminNotifications}`);
    console.log(`   Unread Admin Notifications: ${unreadAdminNotifications}`);
    console.log('');

    // Summary
    console.log('========================================');
    console.log('📊 System Health Check');
    console.log('========================================');
    console.log(`${employeesWithPopupCount > 0 ? '✅' : '❌'} Employees with popup enabled: ${employeesWithPopupCount}`);
    console.log(`${totalReminders > 0 ? '✅' : '⚠️'} Active reminders: ${totalReminders}`);
    console.log(`${dueReminders.length > 0 ? '✅' : '⚠️'} Due reminders: ${dueReminders.length}`);
    console.log(`${totalAdminNotifications > 0 ? '✅' : '⚠️'} Admin notifications: ${totalAdminNotifications}`);
    console.log('========================================');

    if (employeesWithPopupCount === 0) {
      console.log('\n⚠️ WARNING: No employees have adminReminderPopupEnabled set to true!');
      console.log('   Admin will not receive any reminder notifications.');
      console.log('   Enable it using: PUT /admin/reminders/employee/:id/toggle-popup');
    }

    if (dueReminders.length === 0) {
      console.log('\n💡 TIP: No due reminders found. Create a test reminder with current time to test the system.');
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkReminderSystem();
