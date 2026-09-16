#!/bin/bash

# Quick Test Script for Admin Reminder Notifications

echo "================================================"
echo "Admin Reminder Notification - Quick Test"
echo "================================================"
echo ""

# Set your variables here
BASE_URL="http://localhost:4000"
EMPLOYEE_EMAIL="shivam@gmail.com"
EMPLOYEE_PASSWORD="your_password"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin_password"

echo "Step 1: Employee Login (Shivam)"
echo "--------------------------------"
EMPLOYEE_LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMPLOYEE_EMAIL}\",
    \"password\": \"${EMPLOYEE_PASSWORD}\"
  }")

EMPLOYEE_TOKEN=$(echo $EMPLOYEE_LOGIN | jq -r '.token')

if [ "$EMPLOYEE_TOKEN" == "null" ]; then
  echo "❌ Employee login failed!"
  echo $EMPLOYEE_LOGIN | jq
  exit 1
fi

echo "✅ Employee logged in successfully"
echo "Token: ${EMPLOYEE_TOKEN:0:20}..."
echo ""

echo "Step 2: Check Employee adminReminderPopupEnabled Status"
echo "--------------------------------------------------------"
EMPLOYEE_INFO=$(echo $EMPLOYEE_LOGIN | jq -r '.user.adminReminderPopupEnabled')
echo "adminReminderPopupEnabled: $EMPLOYEE_INFO"

if [ "$EMPLOYEE_INFO" != "true" ]; then
  echo "⚠️ Warning: adminReminderPopupEnabled is not true!"
  echo "   Admin will NOT receive notifications for this employee."
fi
echo ""

echo "Step 3: Create a Test Reminder"
echo "--------------------------------"
CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
echo "Reminder Time: $CURRENT_TIME"

REMINDER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/reminder/create" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Test Admin Notification - $(date +%H:%M:%S)\",
    \"comment\": \"This reminder should trigger admin notification IMMEDIATELY\",
    \"reminderDateTime\": \"${CURRENT_TIME}\",
    \"clientName\": \"Test Client\",
    \"phone\": \"9999999999\",
    \"email\": \"test@example.com\",
    \"location\": \"Test Location\"
  }")

echo "Reminder Response:"
echo $REMINDER_RESPONSE | jq
echo ""

REMINDER_ID=$(echo $REMINDER_RESPONSE | jq -r '.data._id')

if [ "$REMINDER_ID" == "null" ]; then
  echo "❌ Failed to create reminder!"
  exit 1
fi

echo "✅ Reminder created successfully!"
echo "Reminder ID: $REMINDER_ID"
echo ""

echo "Step 4: Admin Login"
echo "--------------------"
ADMIN_LOGIN=$(curl -s -X POST "${BASE_URL}/admin/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${ADMIN_EMAIL}\",
    \"password\": \"${ADMIN_PASSWORD}\"
  }")

ADMIN_TOKEN=$(echo $ADMIN_LOGIN | jq -r '.token')

if [ "$ADMIN_TOKEN" == "null" ]; then
  echo "❌ Admin login failed!"
  echo $ADMIN_LOGIN | jq
  exit 1
fi

echo "✅ Admin logged in successfully"
echo "Token: ${ADMIN_TOKEN:0:20}..."
echo ""

echo "Step 5: Check Admin Notifications (Should be INSTANT)"
echo "-------------------------------------------------------"
echo "Fetching admin reminder notifications..."

ADMIN_NOTIFICATIONS=$(curl -s -X GET "${BASE_URL}/admin/notifications/admin-reminders?unreadOnly=true&limit=5" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

echo "Admin Notifications:"
echo $ADMIN_NOTIFICATIONS | jq

NOTIFICATION_COUNT=$(echo $ADMIN_NOTIFICATIONS | jq -r '.data.unreadCount')
echo ""
echo "Unread Admin Notifications: $NOTIFICATION_COUNT"

if [ "$NOTIFICATION_COUNT" == "0" ] || [ "$NOTIFICATION_COUNT" == "null" ]; then
  echo "⚠️ No unread notifications found!"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check if server is running: pm2 status"
  echo "2. Check server logs: pm2 logs"
  echo "3. Verify employee adminReminderPopupEnabled is true"
  echo "4. Make sure Socket.io is working"
else
  echo "✅ Admin received notification(s)!"
fi

echo ""
echo "Step 6: Wait for Cron Job (1 minute) and Check Due Reminders"
echo "-------------------------------------------------------------"
echo "Cron job runs every minute to process due reminders..."
echo "Waiting 60 seconds..."

for i in {60..1}; do
  echo -ne "Time remaining: $i seconds\r"
  sleep 1
done
echo ""

echo "Checking due reminders for admin..."
DUE_REMINDERS=$(curl -s -X GET "${BASE_URL}/admin/reminders/due-all" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

echo "Due Reminders for Admin:"
echo $DUE_REMINDERS | jq

echo ""
echo "================================================"
echo "Test Complete!"
echo "================================================"
echo ""
echo "Summary:"
echo "--------"
echo "1. Employee Reminder Created: ✅"
echo "2. Admin Notification (Instant): Check above"
echo "3. Due Reminder Check: Check above"
echo ""
echo "If admin is not receiving notifications:"
echo "1. Check Socket.io connection on frontend"
echo "2. Listen to 'adminReminderNotification' event"
echo "3. Verify server logs: pm2 logs"
echo "4. Restart server: pm2 restart backend"
