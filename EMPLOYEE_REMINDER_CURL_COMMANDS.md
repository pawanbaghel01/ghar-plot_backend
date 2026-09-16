# Employee Reminder API - cURL Commands

## Prerequisites
```bash
# Employee login karke token le lo
EMPLOYEE_TOKEN="employee_jwt_token_here"
BASE_URL="http://localhost:4000"
```

---

## 1️⃣ Create Reminder (Basic)

```bash
curl -X POST "${BASE_URL}/api/reminder/create" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Follow up with client",
    "comment": "Discuss property details and pricing",
    "reminderDateTime": "2026-01-22T15:30:00.000Z",
    "clientName": "John Doe",
    "phone": "9876543210",
    "email": "john@example.com",
    "location": "Mumbai"
  }'
```

---

## 2️⃣ Create Reminder from Lead Assignment

```bash
curl -X POST "${BASE_URL}/api/reminder/create" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "assignmentId": "assignment_id_here",
    "assignmentType": "LeadAssignment",
    "title": "Follow up call",
    "comment": "Discuss requirements",
    "reminderDateTime": "2026-01-22T16:00:00.000Z",
    "clientName": "Client Name",
    "phone": "9876543210",
    "email": "client@example.com",
    "location": "Delhi"
  }'
```

---

## 3️⃣ Create Reminder from Enquiry ID

```bash
curl -X POST "${BASE_URL}/api/reminder/create" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "enquiryId": "enquiry_id_here",
    "title": "Property site visit",
    "comment": "Show 3BHK apartment",
    "reminderDateTime": "2026-01-23T10:00:00.000Z",
    "clientName": "Rahul Sharma",
    "phone": "9123456789",
    "email": "rahul@example.com",
    "location": "Bangalore"
  }'
```

---

## 4️⃣ Create Reminder from Manual Inquiry

```bash
curl -X POST "${BASE_URL}/api/reminder/create" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "manualInquiryId": "manual_inquiry_id_here",
    "title": "Follow up on manual lead",
    "comment": "Client interested in 2BHK",
    "reminderDateTime": "2026-01-22T14:00:00.000Z",
    "clientName": "Priya Patel",
    "phone": "9988776655",
    "email": "priya@example.com",
    "location": "Pune"
  }'
```

---

## 5️⃣ Create Repeating Reminder

```bash
curl -X POST "${BASE_URL}/api/reminder/create" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Daily follow up",
    "comment": "Call client every day at 10 AM",
    "reminderDateTime": "2026-01-22T10:00:00.000Z",
    "isRepeating": true,
    "repeatType": "daily",
    "clientName": "Amit Kumar",
    "phone": "9871234567",
    "email": "amit@example.com",
    "location": "Noida"
  }'
```

**Repeat Types:**
- `daily` - Har din repeat hoga
- `weekly` - Har hafte repeat hoga
- `monthly` - Har mahine repeat hoga

---

## 6️⃣ Get All Employee Reminders

```bash
curl -X GET "${BASE_URL}/api/reminder/list" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -H "Content-Type: application/json"
```

---

## 7️⃣ Get Due Reminders (Current time se pehle ke)

```bash
curl -X GET "${BASE_URL}/api/reminder/due" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "...",
      "title": "Follow up with client",
      "clientName": "John Doe",
      "phone": "9876543210",
      "email": "john@example.com",
      "location": "Mumbai",
      "comment": "Discuss property details",
      "reminderDateTime": "2026-01-22T15:30:00.000Z",
      "status": "pending",
      "isActive": true
    }
  ]
}
```

---

## 8️⃣ Get Reminders with Filters

```bash
# Pending reminders only
curl -X GET "${BASE_URL}/api/reminder/list?status=pending" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}"

# Lead assignment reminders only
curl -X GET "${BASE_URL}/api/reminder/list?assignmentType=LeadAssignment" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}"

# Manual inquiry reminders
curl -X GET "${BASE_URL}/api/reminder/list?assignmentType=ManualInquiry" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}"

# Specific manual inquiry reminders
curl -X GET "${BASE_URL}/api/reminder/list?manualInquiryId=manual_inquiry_id" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}"

# Paginated
curl -X GET "${BASE_URL}/api/reminder/list?page=1&limit=10" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}"
```

---

## 9️⃣ Complete a Reminder

```bash
REMINDER_ID="reminder_id_here"

curl -X PUT "${BASE_URL}/api/reminder/complete/${REMINDER_ID}" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Reminder marked as completed",
  "data": {
    "_id": "...",
    "status": "completed",
    "completedAt": "2026-01-22T11:30:00.000Z"
  }
}
```

---

## 🔟 Snooze a Reminder

```bash
REMINDER_ID="reminder_id_here"

curl -X PUT "${BASE_URL}/api/reminder/snooze/${REMINDER_ID}" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "snoozeMinutes": 30
  }'
```

**Snooze Options:**
- `5` - 5 minutes
- `15` - 15 minutes
- `30` - 30 minutes (default)
- `60` - 1 hour
- `120` - 2 hours

---

## 1️⃣1️⃣ Dismiss a Reminder

```bash
REMINDER_ID="reminder_id_here"

curl -X PUT "${BASE_URL}/api/reminder/dismiss/${REMINDER_ID}" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -H "Content-Type: application/json"
```

---

## 1️⃣2️⃣ Update a Reminder

```bash
REMINDER_ID="reminder_id_here"

curl -X PUT "${BASE_URL}/api/reminder/update/${REMINDER_ID}" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated title",
    "comment": "Updated comment",
    "reminderDateTime": "2026-01-23T10:00:00.000Z",
    "clientName": "Updated Client Name",
    "phone": "9999999999"
  }'
```

---

## 1️⃣3️⃣ Delete a Reminder

```bash
REMINDER_ID="reminder_id_here"

curl -X DELETE "${BASE_URL}/api/reminder/delete/${REMINDER_ID}" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -H "Content-Type: application/json"
```

---

## 1️⃣4️⃣ Get Reminder Statistics

```bash
curl -X GET "${BASE_URL}/api/reminder/stats" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 25,
    "pending": 15,
    "completed": 8,
    "snoozed": 2,
    "dismissed": 0,
    "overdue": 5,
    "today": 7,
    "thisWeek": 12
  }
}
```

---

## 1️⃣5️⃣ Get Reminders by Manual Inquiry ID

```bash
MANUAL_INQUIRY_ID="manual_inquiry_id_here"

curl -X GET "${BASE_URL}/api/reminder/manual-inquiry/${MANUAL_INQUIRY_ID}" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -H "Content-Type: application/json"
```

---

## Complete Example: Lead se Reminder Create Karo

```bash
#!/bin/bash

# 1. Employee login
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "shivam@gmail.com",
    "password": "your_password"
  }')

EMPLOYEE_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "Employee Token: ${EMPLOYEE_TOKEN}"

# 2. Create reminder for lead
REMINDER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/reminder/create" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Client Follow Up",
    "comment": "Discuss 3BHK property requirements",
    "reminderDateTime": "2026-01-22T16:00:00.000Z",
    "clientName": "Ramesh Verma",
    "phone": "9876543210",
    "email": "ramesh@example.com",
    "location": "Gurgaon"
  }')

echo "Reminder Created:"
echo $REMINDER_RESPONSE | jq

# 3. Get due reminders
curl -s -X GET "${BASE_URL}/api/reminder/due" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" | jq
```

---

## Testing on Real Device

### Employee ka reminder create karo:
```bash
# Shivam employee login (adminReminderPopupEnabled: true)
curl -X POST "http://your-server-ip:4000/api/reminder/create" \
  -H "Authorization: Bearer SHIVAM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Admin Notification",
    "comment": "This should trigger admin notification",
    "reminderDateTime": "2026-01-22T12:00:00.000Z",
    "clientName": "Test Client",
    "phone": "9999999999",
    "location": "Test Location"
  }'
```

### Admin notification check karo:
```bash
# Admin device se
curl -X GET "http://your-server-ip:4000/admin/notifications/admin-reminders?unreadOnly=true" \
  -H "Authorization: Bearer ADMIN_TOKEN" | jq
```

---

## Socket.io Integration (Frontend)

### Employee Device:
```javascript
// Employee ke liye reminder notifications
socket.on('newNotification', (data) => {
  console.log('Employee Reminder:', data);
  showNotificationPopup(data);
});
```

### Admin Device:
```javascript
// Admin ke liye employee reminder notifications
socket.on('adminReminderNotification', (data) => {
  console.log('Admin - Employee Reminder:', data);
  showAdminReminderPopup(data);
});
```

---

## Important Notes

1. **Admin Notification Trigger**: Jab employee reminder create karta hai aur uska `adminReminderPopupEnabled: true` hai, tab admin ko bhi notification milega
2. **Cron Job**: Har minute check karta hai due reminders
3. **Time Format**: ISO 8601 format use karo: `2026-01-22T15:30:00.000Z`
4. **Cooldown**: Same reminder 1 hour ke andar duplicate nahi jayega
