import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8866';

async function testReminderSystem() {
  console.log('🧪 Testing Reminder System...\n');

  try {
    // Step 1: Employee Login
    console.log('Step 1: Employee Login');
    console.log('------------------------');
    const loginResponse = await fetch(`${BASE_URL}/employee/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'aslam6209khan@gmail.com',
        password: 'aslam'
      })
    });

    const loginData = await loginResponse.json();

    if (!loginData.success || !loginData.data?.token) {
      console.log('❌ Login failed:', loginData);
      return;
    }

    console.log('✅ Employee logged in successfully');
    console.log(`   Name: ${loginData.data.employee?.name || 'N/A'}`);
    console.log(`   Email: ${loginData.data.employee?.email || 'N/A'}`);
    console.log(`   Admin Reminder Popup: ${loginData.data.employee?.adminReminderPopupEnabled || false}`);
    console.log(`   FCM Token: ${loginData.data.employee?.fcmToken ? 'Present ✅' : 'Not Set ❌'}`);
    console.log(`   Token: ${loginData.data.token.substring(0, 20)}...`);

    const employeeToken = loginData.data.token;
    const employeeId = loginData.data.employee?._id;
    console.log('');

    // Step 2: Create Test Reminder (Due NOW)
    console.log('Step 2: Create Test Reminder (Due NOW)');
    console.log('----------------------------------------');

    const now = new Date();
    const reminderTime = now.toISOString();

    console.log(`   Current Time: ${now.toLocaleString()}`);
    console.log(`   Reminder Time: ${reminderTime}`);

    const reminderResponse = await fetch(`${BASE_URL}/api/reminder/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        title: `Test Reminder - ${now.toLocaleTimeString()}`,
        comment: 'Testing admin notification system',
        reminderDateTime: reminderTime,
        clientName: 'Test Client',
        phone: '9999999999',
        email: 'test@example.com',
        location: 'Test Location'
      })
    });

    const reminderData = await reminderResponse.json();

    if (!reminderData.success) {
      console.log('❌ Reminder creation failed:', reminderData);
      return;
    }

    console.log('✅ Reminder created successfully');
    console.log(`   Reminder ID: ${reminderData.data._id}`);
    console.log(`   Title: ${reminderData.data.title}`);
    console.log(`   Status: ${reminderData.data.status}`);
    console.log('');

    // Step 3: Wait for Cron Job
    console.log('Step 3: Waiting for Cron Job (60 seconds)');
    console.log('-------------------------------------------');
    console.log('   Cron job runs every minute to process reminders...');

    for (let i = 60; i > 0; i--) {
      process.stdout.write(`\r   Time remaining: ${i} seconds `);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\n✅ Wait complete\n');

    // Step 4: Admin Login
    console.log('Step 4: Admin Login');
    console.log('--------------------');
    const adminLoginResponse = await fetch(`${BASE_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'crmgharplot@gmail.com',
        password: 'crmgharplot@gmail.com'
      })
    });

    const adminLoginData = await adminLoginResponse.json();

    if (!adminLoginData.token) {
      console.log('❌ Admin login failed:', adminLoginData);
      return;
    }

    console.log('✅ Admin logged in successfully');
    console.log(`   Token: ${adminLoginData.token.substring(0, 20)}...`);
    const adminToken = adminLoginData.token;
    console.log('');

    // Step 5: Check Admin Notifications
    console.log('Step 5: Check Admin Notifications');
    console.log('-----------------------------------');
    const notificationsResponse = await fetch(
      `${BASE_URL}/admin/notifications/admin-reminders?unreadOnly=true&limit=5`,
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );

    const notificationsData = await notificationsResponse.json();

    if (!notificationsData.success) {
      console.log('❌ Failed to fetch notifications:', notificationsData);
      return;
    }

    console.log(`   Unread Count: ${notificationsData.data.unreadCount || 0}`);
    console.log(`   Total Notifications: ${notificationsData.data.notifications?.length || 0}`);

    if (notificationsData.data.notifications?.length > 0) {
      console.log('\n   Latest Notifications:');
      notificationsData.data.notifications.slice(0, 3).forEach((notif, index) => {
        console.log(`\n   ${index + 1}. ${notif.title}`);
        console.log(`      Message: ${notif.message}`);
        console.log(`      Employee: ${notif.metadata?.employeeName || 'N/A'}`);
        console.log(`      Client: ${notif.reminderData?.name || 'N/A'}`);
        console.log(`      Time: ${new Date(notif.createdAt).toLocaleString()}`);
        console.log(`      Read: ${notif.read ? 'Yes' : 'No'}`);
      });
    }
    console.log('');

    // Step 6: Check Due Reminders
    console.log('Step 6: Check Due Reminders for Admin');
    console.log('---------------------------------------');
    const dueRemindersResponse = await fetch(
      `${BASE_URL}/admin/reminders/due-all`,
      {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      }
    );

    const dueRemindersData = await dueRemindersResponse.json();

    if (dueRemindersData.success) {
      console.log(`   Total Due Reminders: ${dueRemindersData.count || 0}`);
      console.log(`   Employees with Due Reminders: ${dueRemindersData.totalEmployees || 0}`);

      if (dueRemindersData.data?.length > 0) {
        console.log('\n   Due Reminders by Employee:');
        dueRemindersData.data.forEach((item, index) => {
          console.log(`\n   ${index + 1}. ${item.employee.name} (${item.employee.email})`);
          console.log(`      Reminders: ${item.reminders.length}`);
          item.reminders.slice(0, 2).forEach((rem, idx) => {
            console.log(`      - ${rem.title}`);
            console.log(`        Client: ${rem.clientName || 'N/A'}`);
            console.log(`        Time: ${new Date(rem.reminderDateTime).toLocaleString()}`);
          });
        });
      }
    }
    console.log('');

    // Summary
    console.log('========================================');
    console.log('📊 Test Summary');
    console.log('========================================');
    console.log(`✅ Employee Login: Success`);
    console.log(`✅ Reminder Created: Success`);
    console.log(`✅ Admin Login: Success`);
    console.log(`${notificationsData.data.unreadCount > 0 ? '✅' : '❌'} Admin Notifications: ${notificationsData.data.unreadCount || 0} unread`);
    console.log(`${dueRemindersData.count > 0 ? '✅' : '⚠️'} Due Reminders: ${dueRemindersData.count || 0} found`);
    console.log('========================================');

    if (notificationsData.data.unreadCount > 0) {
      console.log('\n🎉 SUCCESS! Admin is receiving reminder notifications!');
    } else {
      console.log('\n⚠️ WARNING: No admin notifications found.');
      console.log('   Possible reasons:');
      console.log('   1. Cron job not running (check server logs)');
      console.log('   2. Employee adminReminderPopupEnabled is false');
      console.log('   3. Reminder time was in the past');
      console.log('   4. Server needs restart');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error);
  }
}

testReminderSystem();
