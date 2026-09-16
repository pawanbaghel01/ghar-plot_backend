#!/bin/bash

# Admin Reminder Notification API Testing Script
# Replace with your actual admin token and server URL

BASE_URL="http://localhost:4000"
ADMIN_TOKEN="your_admin_token_here"

echo "======================================"
echo "Admin Reminder Notification API Tests"
echo "======================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Get Admin Reminder Notifications (All)
echo -e "${BLUE}Test 1: Get All Admin Reminder Notifications${NC}"
curl -X GET "${BASE_URL}/admin/notifications/admin-reminders" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" | jq
echo ""
echo "---"
echo ""

# Test 2: Get Admin Reminder Notifications (Unread Only)
echo -e "${BLUE}Test 2: Get Unread Admin Reminder Notifications${NC}"
curl -X GET "${BASE_URL}/admin/notifications/admin-reminders?unreadOnly=true" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" | jq
echo ""
echo "---"
echo ""

# Test 3: Get Admin Reminder Notifications (Paginated)
echo -e "${BLUE}Test 3: Get Admin Reminder Notifications (Page 1, Limit 10)${NC}"
curl -X GET "${BASE_URL}/admin/notifications/admin-reminders?page=1&limit=10" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" | jq
echo ""
echo "---"
echo ""

# Test 4: Mark Single Admin Reminder as Read
# Replace NOTIFICATION_ID with actual notification ID
echo -e "${BLUE}Test 4: Mark Single Admin Reminder as Read${NC}"
NOTIFICATION_ID="notification_id_here"
curl -X PUT "${BASE_URL}/admin/notifications/admin-reminders/${NOTIFICATION_ID}/read" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" | jq
echo ""
echo "---"
echo ""

# Test 5: Mark All Admin Reminders as Read
echo -e "${BLUE}Test 5: Mark All Admin Reminders as Read${NC}"
curl -X PUT "${BASE_URL}/admin/notifications/admin-reminders/mark-all-read" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" | jq
echo ""
echo "---"
echo ""

# Test 6: Get Employee Reminder Status (Check if adminReminderPopupEnabled is true)
echo -e "${BLUE}Test 6: Get All Employees Reminder Status${NC}"
curl -X GET "${BASE_URL}/admin/reminders/employees-status" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" | jq
echo ""
echo "---"
echo ""

# Test 7: Toggle Employee Admin Reminder Popup (Enable for Shivam)
echo -e "${BLUE}Test 7: Enable Admin Reminder Popup for Employee${NC}"
EMPLOYEE_ID="696b869560c90a398567116d"  # Shivam's ID
curl -X PUT "${BASE_URL}/admin/reminders/employee/${EMPLOYEE_ID}/toggle-popup" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true
  }' | jq
echo ""
echo "---"
echo ""

# Test 8: Get Due Reminders for Specific Employee
echo -e "${BLUE}Test 8: Get Due Reminders for Specific Employee${NC}"
curl -X GET "${BASE_URL}/admin/reminders/employee/${EMPLOYEE_ID}/due" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" | jq
echo ""
echo "---"
echo ""

# Test 9: Get All Due Reminders for Admin (All Employees with Popup Enabled)
echo -e "${BLUE}Test 9: Get All Due Reminders for Admin${NC}"
curl -X GET "${BASE_URL}/admin/reminders/due-all" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" | jq
echo ""
echo "---"
echo ""

# Test 10: Get Admin Reminder Stats
echo -e "${BLUE}Test 10: Get Admin Reminder Statistics${NC}"
curl -X GET "${BASE_URL}/admin/reminders/stats" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" | jq
echo ""
echo "---"
echo ""

echo -e "${GREEN}======================================"
echo "All Tests Completed!"
echo "======================================${NC}"
