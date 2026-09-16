# Employee Management Screen — Employee Login API & CURL Commands

## 📋 Overview
Jab koi **Employee login** karke aata hai aur uske role mein **employees module ki permission** hai, tab ye saari APIs use hoti hain.  
**Sabhi APIs Employee Token (`/api/employees/*` & `/api/roles/*`) se chalti hain.**  
❌ `/admin/*` routes employee token se NAHI chalenge.

---

## 🔐 Step 1: Employee Login (Token lena)

**Kahan lagega:** App open hone pe Login screen pe  
**Permission:** Koi permission nahi chahiye (Public API)

```bash
curl -X POST "http://localhost:8866/api/employees/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee@example.com",
    "password": "your_password"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "employee": {
      "_id": "employee_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": { "_id": "role_id", "name": "Manager", "permissions": [...] },
      "giveAdminAccess": true,
      "isActive": true
    },
    "token": "eyJhbGciOiJ..."
  }
}
```

**Token export karo:**
```bash
export TOKEN="eyJhbGciOiJ..."
```

---

## 📋 API 1: Get All Employees List

**Kahan lagega:** Employee Management Screen — jab screen open ho tab employee list load karne ke liye  
**2 options hain — koi bhi ek use karo:**

### Option A: giveAdminAccess = true ho toh (koi role permission nahi chahiye)

```bash
# Basic list (Page 1, 10 items)
curl -X GET "http://localhost:8866/api/employees/for-admin-employee?page=1&limit=10" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

### Option B: Role mein employees → read permission ho toh

```bash
# Basic list (Page 1, 10 items)
curl -X GET "http://localhost:8866/api/employees?page=1&limit=10" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

### Search & Filters (dono options pe same kaam karte hain):

```bash
# Name/Email/Phone se search
curl -X GET "http://localhost:8866/api/employees?page=1&limit=10&search=john" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"

# Department filter
curl -X GET "http://localhost:8866/api/employees?page=1&limit=10&department=Sales" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"

# Active/Inactive filter
curl -X GET "http://localhost:8866/api/employees?page=1&limit=10&isActive=true" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"

# Role filter
curl -X GET "http://localhost:8866/api/employees?page=1&limit=10&roleFilter=ROLE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"

# Sab filters ek saath
curl -X GET "http://localhost:8866/api/employees?page=1&limit=10&search=john&department=Sales&isActive=true&roleFilter=ROLE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"

# Page 2 (pagination)
curl -X GET "http://localhost:8866/api/employees?page=2&limit=10" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "employee_id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "role": { "_id": "role_id", "name": "Sales Executive" },
      "department": "Sales",
      "giveAdminAccess": true,
      "isActive": true,
      "adminReminderPopupEnabled": true,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalEmployees": 50,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 🔍 API 2: Get Employee By ID

**Kahan lagega:** Employee list mein kisi employee pe click karke uski detail dekhne ke liye  
**Permission:** `employees → read` (ya agar apna khud ka ID hai toh koi permission nahi chahiye)

```bash
curl -X GET "http://localhost:8866/api/employees/EMPLOYEE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "employee_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "department": "Sales",
    "role": { "_id": "role_id", "name": "Sales Executive", "permissions": [...] },
    "giveAdminAccess": true,
    "isActive": true,
    "adminReminderPopupEnabled": true,
    "address": {
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "zipCode": "400001",
      "country": "India"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## ➕ API 3: Create New Employee

**Kahan lagega:** "Add Employee" button pe click karke form fill karke submit karne pe  
**Permission:** `employees → create`

```bash
curl -X POST "http://localhost:8866/api/employees" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "9988776655",
    "password": "SecurePass123!",
    "department": "HR",
    "role": "ROLE_ID",
    "giveAdminAccess": false,
    "address": {
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "Maharashtra",
      "zipCode": "400001",
      "country": "India"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "_id": "new_employee_id",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": { "_id": "role_id", "name": "HR" }
  }
}
```

---

## ✏️ API 4: Update Employee (Dusre Employee ko)

**Kahan lagega:** Employee detail screen mein "Edit" button pe click karke details change karke save karne pe  
**Permission:** `employees → update`

```bash
curl -X PUT "http://localhost:8866/api/employees/EMPLOYEE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Updated Name",
    "email": "updated@example.com",
    "phone": "9876543210",
    "department": "Marketing",
    "role": "ROLE_ID",
    "giveAdminAccess": true,
    "isActive": true,
    "adminReminderPopupEnabled": true
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": {
    "_id": "employee_id",
    "name": "Updated Name",
    "email": "updated@example.com"
  }
}
```

---

## ✏️ API 5: Update Own Profile (Apna khud ka)

**Kahan lagega:** Profile screen mein apna name/phone/address edit karne ke liye  
**Permission:** Koi permission nahi chahiye (sirf apna data)  
⚠️ **Sirf `name`, `phone`, `address` change kar sakte ho. Email, role, department etc NAHI change hoga.**

```bash
curl -X PUT "http://localhost:8866/api/employees/APNA_EMPLOYEE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "My Updated Name",
    "phone": "9876543210",
    "address": {
      "street": "456 New St",
      "city": "Pune",
      "state": "Maharashtra",
      "zipCode": "411001",
      "country": "India"
    }
  }'
```

---

## 🔒 API 6: Change Password (Dusre Employee ka)

**Kahan lagega:** Employee detail screen mein "Change Password" button pe  
**Permission:** `employees → update`

```bash
curl -X PUT "http://localhost:8866/api/employees/EMPLOYEE_ID/password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "newPassword": "NewSecurePass123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

## 🔒 API 7: Change Own Password (Apna khud ka)

**Kahan lagega:** Profile/Settings mein "Change My Password" pe  
**Permission:** Koi permission nahi chahiye (apna password)

```bash
curl -X PUT "http://localhost:8866/api/employees/APNA_EMPLOYEE_ID/password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "currentPassword": "OldPass123!",
    "newPassword": "NewPass456!"
  }'
```

---

## 🗑️ API 8: Delete Employee

**Kahan lagega:** Employee detail screen mein "Delete" button pe  
**Permission:** `employees → delete`

```bash
curl -X DELETE "http://localhost:8866/api/employees/EMPLOYEE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Employee deleted successfully"
}
```

---

## 🎭 API 9: Get All Roles (Dropdown ke liye)

**Kahan lagega:** Employee Create/Edit form mein "Role" dropdown load karne ke liye  
**Permission:** `roles → read`

```bash
curl -X GET "http://localhost:8866/api/roles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "role_id_1",
      "name": "Agent",
      "permissions": [
        { "module": "employees", "actions": ["read"] },
        { "module": "leads", "actions": ["read", "create"] }
      ]
    },
    {
      "_id": "role_id_2",
      "name": "Manager",
      "permissions": [
        { "module": "employees", "actions": ["read", "create", "update", "delete"] },
        { "module": "roles", "actions": ["read"] }
      ]
    }
  ]
}
```

---

## 📊 API 10: Dashboard Stats

**Kahan lagega:** Employee Management screen ke top pe stats cards dikhane ke liye (Total, Active, Inactive count)  
**Permission:** `employees → read`

```bash
curl -X GET "http://localhost:8866/api/employees/dashboard-stats" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEmployees": 50,
    "activeEmployees": 45,
    "inactiveEmployees": 5,
    "totalRoles": 8,
    "employeesByDepartment": [
      { "_id": "Sales", "count": 15 },
      { "_id": "HR", "count": 10 }
    ]
  }
}
```

---

## 👤 API 11: Get Own Profile

**Kahan lagega:** Profile screen pe apni details dekhne ke liye  
**Permission:** Koi permission nahi chahiye (sirf logged-in hona chahiye)

```bash
curl -X GET "http://localhost:8866/api/employees/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Quick Reference Table

| # | API | Method | Endpoint | Permission | Kahan Lagegi |
|---|-----|--------|----------|------------|-------------|
| 1 | Login | POST | `/api/employees/login` | ❌ None | Login Screen |
| 2a | Get All Employees | GET | `/api/employees/for-admin-employee` | `giveAdminAccess: true` | Employee List Screen |
| 2b | Get All Employees | GET | `/api/employees` | `employees → read` | Employee List Screen |
| 3 | Get Employee By ID | GET | `/api/employees/:id` | `employees → read` / apna | Employee Detail Screen |
| 4 | Create Employee | POST | `/api/employees` | `employees → create` | Add Employee Form |
| 5 | Update Employee | PUT | `/api/employees/:id` | `employees → update` | Edit Employee Form |
| 6 | Update Own Profile | PUT | `/api/employees/:id` | ❌ None (apna) | Profile Edit |
| 7 | Change Password | PUT | `/api/employees/:id/password` | `employees → update` / apna | Change Password Button |
| 8 | Delete Employee | DELETE | `/api/employees/:id` | `employees → delete` | Delete Button |
| 9 | Get Roles | GET | `/api/roles` | `roles → read` | Role Dropdown |
| 10 | Dashboard Stats | GET | `/api/employees/dashboard-stats` | `employees → read` | Stats Cards |
| 11 | Own Profile | GET | `/api/employees/profile` | ❌ None | Profile Screen |

---

## 🔑 Permission Mapping

Employee ke role mein ye permissions honi chahiye:

```
employees module:
  ├── read   → List dekh sakta, Detail dekh sakta, Stats dekh sakta
  ├── create → Naya employee bana sakta
  ├── update → Employee edit kar sakta, Password change kar sakta
  └── delete → Employee delete kar sakta

roles module:
  └── read   → Role dropdown mein roles load ho sakti hain
```

### Bina kisi permission ke kya kar sakta hai:
- ✅ Apna profile dekh sakta hai (`GET /api/employees/profile`)
- ✅ Apna name, phone, address edit kar sakta hai (`PUT /api/employees/APNA_ID`)
- ✅ Apna password change kar sakta hai (`PUT /api/employees/APNA_ID/password`)
- ✅ Agar `giveAdminAccess: true` hai toh employee list dekh sakta hai

---

## ⚠️ Important Notes

1. **Sab APIs `/api/employees/*` ya `/api/roles/*` pe hain** — Employee token se sirf yehi chalti hain
2. **`/admin/*` routes NAHI chalenge** employee token se — 401 Unauthorized aayega
3. **Password body mein `confirmPassword` NAHI bhejni** — sirf `newPassword` (aur apna password change karne pe `currentPassword` bhi)
4. **Apna profile update mein sirf 3 fields change hoti hain:** `name`, `phone`, `address` — baaki fields backend ignore kar deta hai
5. **`for-admin-employee` route** sirf `giveAdminAccess` flag check karta hai, role permission nahi dekhta

---

**Base URL:** `http://localhost:8866`  
**Last Updated:** February 7, 2026
