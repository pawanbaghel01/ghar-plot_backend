# Admin Reminder Notification API - cURL Commands

## Prerequisites
```bash
# Get your admin token first
ADMIN_TOKEN="your_admin_token_here"
BASE_URL="http://localhost:4000"
```

---

## 1️⃣ Get All Admin Reminder Notifications

```bash
curl -X GET "${BASE_URL}/admin/notifications/admin-reminders" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "...",
        "title": "🔔 Employee Reminder - shivam",
        "message": "shivam has a reminder: Client Meeting",
        "type": "admin_reminder",
        "priority": "high",
        "metadata": {
          "reminderId": "...",
          "employeeId": "696b869560c90a398567116d",
          "employeeName": "shivam",
          "employeeEmail": "shivam@gmail.com",
          "reminderTitle": "Client Meeting",
          "clientName": "John Doe",
          "reminderTime": "2026-01-22T10:00:00.000Z"
        },
        "read": false,
        "createdAt": "2026-01-22T09:55:00.000Z"
      }
    ],
    "unreadCount": 5,
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "total": 5,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

## 2️⃣ Get Unread Admin Reminder Notifications Only

```bash
curl -X GET "${BASE_URL}/admin/notifications/admin-reminders?unreadOnly=true" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json"
```

---

## 3️⃣ Get Admin Reminder Notifications (Paginated)

```bash
# Page 1, 10 items per page
curl -X GET "${BASE_URL}/admin/notifications/admin-reminders?page=1&limit=10" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json"
```

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `unreadOnly` (optional, true/false)

---

## 4️⃣ Mark Single Admin Reminder as Read

```bash
NOTIFICATION_ID="67890abcdef12345"

curl -X PUT "${BASE_URL}/admin/notifications/admin-reminders/${NOTIFICATION_ID}/read" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Admin reminder notification marked as read",
  "data": {
    "_id": "67890abcdef12345",
    "read": true,
    "readAt": "2026-01-22T10:30:00.000Z",
    ...
  }
}
```

---

## 5️⃣ Mark All Admin Reminders as Read

```bash
curl -X PUT "${BASE_URL}/admin/notifications/admin-reminders/mark-all-read" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "5 admin reminder notifications marked as read",
  "data": {
    "modifiedCount": 5
  }
}
```

---

## 6️⃣ Toggle Employee Admin Reminder Popup (Enable/Disable)

```bash
EMPLOYEE_ID="696b869560c90a398567116d"  # Shivam's ID

# Enable
curl -X PUT "${BASE_URL}/admin/reminders/employee/${EMPLOYEE_ID}/toggle-popup" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true
  }'

# Disable
curl -X PUT "${BASE_URL}/admin/reminders/employee/${EMPLOYEE_ID}/toggle-popup" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Admin reminder popup enabled for employee",
  "data": {
    "employeeId": "696b869560c90a398567116d",
    "name": "shivam",
    "email": "shivam@gmail.com",
    "adminReminderPopupEnabled": true
  }
}
```

---

## 7️⃣ Get All Employees Reminder Status

```bash
curl -X GET "${BASE_URL}/admin/reminders/employees-status" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "696b869560c90a398567116d",
      "name": "shivam",
      "email": "shivam@gmail.com",
      "phone": "9878676535",
      "department": "",
      "adminReminderPopupEnabled": true,
      "isActive": true,
      "role": {
        "_id": "...",
        "name": "Sales Executive"
      },
      "reminderStats": {
        "totalPending": 3,
        "currentlyDue": 1
      }
    }
  ],
  "pagination": {...}
}
```

---

## 8️⃣ Get Due Reminders for Specific Employee

```bash
EMPLOYEE_ID="696b869560c90a398567116d"

curl -X GET "${BASE_URL}/admin/reminders/employee/${EMPLOYEE_ID}/due" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json"
```

---

## 9️⃣ Get All Due Reminders for Admin (All Employees with Popup Enabled)

```bash
curl -X GET "${BASE_URL}/admin/reminders/due-all" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "totalEmployees": 2,
  "data": [
    {
      "employee": {
        "_id": "696b869560c90a398567116d",
        "name": "shivam",
        "email": "shivam@gmail.com",
        "phone": "9878676535",
        "department": ""
      },
      "reminders": [
        {
          "_id": "...",
          "title": "Client Meeting",
          "clientName": "John Doe",
          "reminderDateTime": "2026-01-22T10:00:00.000Z",
          "status": "pending",
          ...
        }
      ]
    }
  ]
}
```

---

## 🔟 Get Admin Reminder Statistics

```bash
curl -X GET "${BASE_URL}/admin/reminders/stats" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "employees": {
      "total": 10,
      "withPopupEnabled": 5
    },
    "reminders": {
      "total": 150,
      "pending": 45,
      "completed": 100,
      "currentlyDue": 8,
      "byStatus": [
        { "_id": "pending", "count": 45 },
        { "_id": "completed", "count": 100 },
        { "_id": "snoozed", "count": 5 }
      ]
    },
    "topEmployees": [
      {
        "employeeId": "696b869560c90a398567116d",
        "name": "shivam",
        "email": "shivam@gmail.com",
        "reminderCount": 25
      }
    ]
  }
}
```

---

## WebSocket Events (Socket.io)

### Listen for Admin Reminder Notifications

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:4000');

// Listen for admin reminder notifications
socket.on('adminReminderNotification', (data) => {
  console.log('📢 New Admin Reminder Notification:', data);
  /*
  {
    _id: "...",
    title: "🔔 Employee Reminder - shivam",
    message: "shivam has a reminder: Client Meeting",
    type: "admin_reminder",
    priority: "high",
    metadata: {
      reminderId: "...",
      employeeId: "696b869560c90a398567116d",
      employeeName: "shivam",
      employeeEmail: "shivam@gmail.com",
      reminderTitle: "Client Meeting",
      clientName: "John Doe",
      reminderTime: "2026-01-22T10:00:00.000Z"
    },
    reminderData: {...},
    createdAt: "2026-01-22T09:55:00.000Z"
  }
  */
  
  // Show notification/alert to admin
  showAdminNotification(data);
});
```

---

## Quick Test Script

```bash
#!/bin/bash

# Set your variables
export BASE_URL="http://localhost:4000"
export ADMIN_TOKEN="your_admin_token_here"

# Test getting notifications
curl -X GET "${BASE_URL}/admin/notifications/admin-reminders?unreadOnly=true" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq

# Check employee status
curl -X GET "${BASE_URL}/admin/reminders/employees-status" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq

# Get due reminders
curl -X GET "${BASE_URL}/admin/reminders/due-all" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq
```

---

## Production URL Example

```bash
# For production server
BASE_URL="https://your-domain.com"
ADMIN_TOKEN="actual_admin_jwt_token"

curl -X GET "${BASE_URL}/admin/notifications/admin-reminders?unreadOnly=true" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json"
```
