#!/bin/bash

# Test Admin Reminder API
echo "========================================="
echo "TESTING ADMIN REMINDER ENABLE API"
echo "========================================="
echo ""

# Step 1: Admin Login (Replace with your actual admin credentials)
echo "Step 1: Admin Login..."
LOGIN_RESPONSE=$(curl -s -X POST https://abc.bhoomitechzone.us/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }')

echo "Login Response:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

# Extract token (adjust based on your actual response structure)
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .data.token // .accessToken' 2>/dev/null)

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed! Token not found."
  echo "Please update admin email and password in this script."
  exit 1
fi

echo "✅ Token received: ${TOKEN:0:20}..."
echo ""

# Step 2: Get all employees with reminder status
echo "Step 2: Get All Employees with Reminder Status..."
EMPLOYEES=$(curl -s -X GET "https://abc.bhoomitechzone.us/admin/reminders/employees-status?limit=5" \
  -H "Authorization: Bearer $TOKEN")

echo "$EMPLOYEES" | jq '.' 2>/dev/null || echo "$EMPLOYEES"
echo ""

# Extract first employee ID
EMPLOYEE_ID=$(echo "$EMPLOYEES" | jq -r '.data[0]._id' 2>/dev/null)

if [ "$EMPLOYEE_ID" = "null" ] || [ -z "$EMPLOYEE_ID" ]; then
  echo "❌ No employees found!"
  exit 1
fi

echo "Found Employee ID: $EMPLOYEE_ID"
echo ""

# Step 3: Enable popup for employee
echo "Step 3: Enable Popup for Employee $EMPLOYEE_ID..."
ENABLE_RESPONSE=$(curl -s -X PUT "https://abc.bhoomitechzone.us/admin/reminders/employee/$EMPLOYEE_ID/toggle-popup" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}')

echo "$ENABLE_RESPONSE" | jq '.' 2>/dev/null || echo "$ENABLE_RESPONSE"
echo ""

# Step 4: Get admin reminder stats
echo "Step 4: Get Admin Reminder Statistics..."
STATS=$(curl -s -X GET "https://abc.bhoomitechzone.us/admin/reminders/stats" \
  -H "Authorization: Bearer $TOKEN")

echo "$STATS" | jq '.' 2>/dev/null || echo "$STATS"
echo ""

# Step 5: Get due reminders for admin
echo "Step 5: Get Due Reminders for Admin..."
DUE_REMINDERS=$(curl -s -X GET "https://abc.bhoomitechzone.us/admin/reminders/due-all" \
  -H "Authorization: Bearer $TOKEN")

echo "$DUE_REMINDERS" | jq '.' 2>/dev/null || echo "$DUE_REMINDERS"
echo ""

# Step 6: Disable popup for employee
echo "Step 6: Disable Popup for Employee $EMPLOYEE_ID..."
DISABLE_RESPONSE=$(curl -s -X PUT "https://abc.bhoomitechzone.us/admin/reminders/employee/$EMPLOYEE_ID/toggle-popup" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}')

echo "$DISABLE_RESPONSE" | jq '.' 2>/dev/null || echo "$DISABLE_RESPONSE"
echo ""

echo "========================================="
echo "✅ ALL TESTS COMPLETED!"
echo "========================================="
