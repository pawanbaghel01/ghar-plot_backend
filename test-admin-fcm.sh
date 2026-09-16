#!/bin/bash

# Test Admin FCM Notification System
# This script tests if admin is receiving FCM notifications when employee creates a reminder

echo "=========================================="
echo "Testing Admin FCM Notification System"
echo "=========================================="

# Get your backend URL
BACKEND_URL="http://localhost:3000"

echo ""
echo "Step 1: Save Admin FCM Token"
echo "-------------------------------"
read -p "Enter Admin ID: " ADMIN_ID
read -p "Enter Admin FCM Token: " ADMIN_FCM_TOKEN

curl -X POST "$BACKEND_URL/api/fcm/save-admin-token" \
  -H "Content-Type: application/json" \
  -d "{
    \"adminId\": \"$ADMIN_ID\",
    \"fcmToken\": \"$ADMIN_FCM_TOKEN\"
  }"

echo ""
echo ""
echo "Step 2: Check Admin FCM Token Saved"
echo "------------------------------------"
echo "Admin FCM token should be saved in database"
echo "Check your admin device for notifications when employee creates a reminder"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Make sure admin's FCM token is saved (check response above)"
echo "2. Enable 'adminReminderPopupEnabled' for an employee"
echo "3. Have that employee create a reminder"
echo "4. Admin should receive FCM push notification"
echo ""
