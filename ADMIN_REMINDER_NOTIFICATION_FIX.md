# Admin Reminder Notification Fix

## Problem
Employee ka `adminReminderPopupEnabled` flag `true` tha, par admin ko reminder ka notification nahi aa raha tha.

## Root Cause
Cron job (`cron/reminderCron.js`) sirf employee ko hi reminder notification bhej raha tha. Admin ko notification bhejna ka logic missing tha, even though `adminReminderPopupEnabled` flag check nahi ho raha tha.

## Solution Implemented

### 1. Updated Cron Job (`cron/reminderCron.js`)
- Employee populate karte waqt `adminReminderPopupEnabled` field bhi include kiya
- Har reminder process karte waqt check kiya ki employee ka `adminReminderPopupEnabled` true hai ya nahi
- Agar true hai, to ek separate admin notification create kiya:
  - Type: `admin_reminder`
  - Title: `🔔 Employee Reminder - {employee name}`
  - Complete reminder details include kiya (employee info, client info, reminder time, etc.)
  - Socket.io notification emit kiya admin ke liye: `adminReminderNotification` event

### 2. Added New API Endpoints (`controllers/adminNotificationController.js` & `routes/adminNotificationRoute.js`)

#### Get Admin Reminder Notifications
```http
GET /api/admin-notifications/admin-reminders
Authorization: Bearer {admin_token}
Query Parameters:
  - page (optional, default: 1)
  - limit (optional, default: 20)
  - unreadOnly (optional, true/false)
```

Response:
```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 5,
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "total": 45,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Mark Single Admin Reminder as Read
```http
PUT /api/admin-notifications/admin-reminders/:notificationId/read
Authorization: Bearer {admin_token}
```

Response:
```json
{
  "success": true,
  "message": "Admin reminder notification marked as read",
  "data": {...}
}
```

#### Mark All Admin Reminders as Read
```http
PUT /api/admin-notifications/admin-reminders/mark-all-read
Authorization: Bearer {admin_token}
```

Response:
```json
{
  "success": true,
  "message": "5 admin reminder notifications marked as read",
  "data": {
    "modifiedCount": 5
  }
}
```

## How It Works Now

1. **Cron Job Execution** (har minute):
   - Due reminders check karta hai
   - Employee ko notification bhejta hai (FCM + Socket.io + In-app)
   - Check karta hai ki `employee.adminReminderPopupEnabled === true`
   - Agar true hai, to:
     - Admin ke liye separate notification create karta hai
     - Socket.io se admin ko real-time notification bhejta hai (`adminReminderNotification` event)
     - Database mein store karta hai with type `admin_reminder`

2. **Admin Frontend**:
   - Socket.io listener lagao: `socket.on('adminReminderNotification', callback)`
   - API se notifications fetch karo: `GET /api/admin-notifications/admin-reminders`
   - Read mark karo: `PUT /api/admin-notifications/admin-reminders/:id/read`

## Database Changes
No schema changes needed. Existing `Notification` model use kiya with:
- `type: 'admin_reminder'`
- `metadata`: Contains employee details, reminder details
- `read: false` (initially)

## Testing

### Test Employee Data
```json
{
  "_id": "696b869560c90a398567116d",
  "name": "shivam",
  "email": "shivam@gmail.com",
  "adminReminderPopupEnabled": true
}
```

### Steps to Test:
1. Server restart karo: `npm start` or `pm2 restart`
2. Shivam employee ke liye ek reminder create karo with due time (past or current time)
3. Wait for 1 minute (cron runs every minute)
4. Check logs: Admin notification create hona chahiye
5. Frontend mein socket listener add karo
6. API call karo: `GET /api/admin-notifications/admin-reminders`

## Socket.io Events

### Employee Notification Event
```javascript
socket.on('newNotification', (data) => {
  // Employee ke liye
  console.log(data);
});
```

### Admin Reminder Notification Event (NEW)
```javascript
socket.on('adminReminderNotification', (data) => {
  // Admin ke liye
  console.log(data);
  // Show popup/alert to admin
});
```

## Files Modified
1. `/cron/reminderCron.js` - Added admin notification logic
2. `/controllers/adminNotificationController.js` - Added 3 new functions
3. `/routes/adminNotificationRoute.js` - Added 3 new routes

## Important Notes
- Admin ko sirf un employees ke reminders ki notification milegi jinka `adminReminderPopupEnabled: true` hai
- Notification type `admin_reminder` se filter kar sakte ho
- Socket.io event name: `adminReminderNotification` (employee ke liye alag hai: `newNotification`)
- Cooldown period: 1 hour (same reminder duplicate nahi bhejega)
