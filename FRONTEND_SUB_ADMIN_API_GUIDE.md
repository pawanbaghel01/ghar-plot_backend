# 🚀 Frontend Integration Guide: Sub-Admin Reminder Management

This document provides the API endpoints and cURL commands required for the frontend developer to implement the Sub-Admin reminder monitoring system.

---

## 🏛️ System Overview
- **Super Admin:** Has full authority. Can assign specific employees to a Sub-Admin.
- **Sub-Admin (Employee with Admin Access):** Can only monitor reminders and receive notifications for the employees assigned to them by the Super Admin.
- **Access Control:** Management APIs (assign/add/remove) are restricted to the Original (Super) Admin only.

---

## 🔐 Authentication
All requests must include a Bearer Token in the headers:
`Authorization: Bearer <TOKEN>`

---

## 📋 API Reference

### 1. List All Sub-Admins
**Use Case:** Populate a dropdown or list to select which Sub-Admin to manage.
- **Endpoint:** `GET /admin/employees/sub-admins/list`
- **Role:** Super Admin

**cURL:**
```bash
curl --location 'http://localhost:8866/admin/employees/sub-admins/list' \
--header 'Authorization: Bearer <SUPER_ADMIN_TOKEN>'
```

### 2. Assign Employees to Sub-Admin (Replace)
**Use Case:** Sets the complete list of employees monitored by a Sub-Admin. Removes any existing assignments.
- **Endpoint:** `PUT /admin/employees/sub-admins/:subAdminId/assign-employees`
- **Role:** Super Admin
- **Body:** `{ "employeeIds": ["ID_1", "ID_2"] }`

**cURL:**
```bash
curl --location --request PUT 'http://localhost:8866/admin/employees/sub-admins/SUB_ADMIN_ID/assign-employees' \
--header 'Authorization: Bearer <SUPER_ADMIN_TOKEN>' \
--header 'Content-Type: application/json' \
--data '{
    "employeeIds": ["67a3b1c2d3e4f5a6b7c8d9e0", "67a3b1c2d3e4f5a6b7c8d9e1"]
}'
```

### 3. Get Managed Employees of a Sub-Admin
**Use Case:** Show which employees are currently assigned to a specific Sub-Admin.
- **Endpoint:** `GET /admin/employees/sub-admins/:subAdminId/managed-employees`
- **Role:** Super Admin

**cURL:**
```bash
curl --location 'http://localhost:8866/admin/employees/sub-admins/SUB_ADMIN_ID/managed-employees' \
--header 'Authorization: Bearer <SUPER_ADMIN_TOKEN>'
```

### 4. Add Employees to Sub-Admin (Append)
**Use Case:** Add more employees to a Sub-Admin's list without removing existing ones.
- **Endpoint:** `POST /admin/employees/sub-admins/:subAdminId/add-employees`
- **Role:** Super Admin
- **Body:** `{ "employeeIds": ["ID_3"] }`

**cURL:**
```bash
curl --location 'http://localhost:8866/admin/employees/sub-admins/SUB_ADMIN_ID/add-employees' \
--header 'Authorization: Bearer <SUPER_ADMIN_TOKEN>' \
--header 'Content-Type: application/json' \
--data '{"employeeIds": ["67a3b1c2d3e4f5a6b7c8d9e2"]}'
```

### 5. Remove Employees from Sub-Admin
**Use Case:** Remove specific employees from a Sub-Admin's monitoring list.
- **Endpoint:** `DELETE /admin/employees/sub-admins/:subAdminId/remove-employees`
- **Role:** Super Admin
- **Body:** `{ "employeeIds": ["ID_1"] }`

**cURL:**
```bash
curl --location --request DELETE 'http://localhost:8866/admin/employees/sub-admins/SUB_ADMIN_ID/remove-employees' \
--header 'Authorization: Bearer <SUPER_ADMIN_TOKEN>' \
--header 'Content-Type: application/json' \
--data '{"employeeIds": ["67a3b1c2d3e4f5a6b7c8d9e0"]}'
```

---

## 🔔 Real-time Notifications & Reminders

### 6. Fetch Due Reminders (Filtered)
**Use Case:** Fetch all reminders that are currently due. This API automatically filters based on the user's role.
- **Endpoint:** `GET /admin/reminders/due-all`
- **Behavior:** 
    - **Super Admin:** Returns reminders for all employees who have `adminReminderPopupEnabled: true`.
    - **Sub-Admin:** Returns reminders **ONLY** for their assigned `managedEmployees`.

**cURL:**
```bash
curl --location 'http://localhost:8866/admin/reminders/due-all' \
--header 'Authorization: Bearer <TOKEN>'
```

### 7. Socket.io Events
**Purpose:** Real-time desktop/web alerts.
- **Event Name:** `adminReminderNotification`
- **Payload Example:** 
```json
{
    "title": "🔔 Employee Reminder - shivam",
    "message": "Follow up with client",
    "metadata": {
        "employeeName": "shivam",
        "reminderId": "696bbc0..."
    }
}
```

---

## 💡 Integration Tips
1. **Forbidden (403):** If a Sub-Admin tries to call any Management API (Endpoints 2-5), they will receive a `403 Forbidden` error. Ensure the UI hides these management features for Sub-Admins.
2. **Dynamic Polling:** For the reminder popup, use the `GET /admin/reminders/due-all` endpoint every 1-5 minutes or listen to the Socket.io event for real-time reactivity.
3. **Data Mapping:** The `due-all` response provides grouped data by employee, making it easy to create a "Team Reminders" dashboard.
