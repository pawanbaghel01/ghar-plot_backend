# 🔔 FCM Notification Payload Standardization Guide

## Backend Developer Ke Liye Instructions

**Date:** March 2026  
**Purpose:** Frontend notification styling (Indigo Reminder vs Red Alert) ko standardize karna

---

## 📌 Problem Statement

Abhi frontend mein notification ka style decide karne ke liye **"keyword checking"** ka use ho raha hai.  
Matlab agar `title` ya `body` mein "reminder" word aaye, toh Indigo theme laga do, warna Red Alert.

**Ye approach unreliable hai!**

### Frontend Ko Sahi Type Chahiye - Backend Se:

| Frontend Style | Kab Dikhana Hai | Backend Se Kya `type` Aana Chahiye |
|----------------|-----------------|-------------------------------------|
| 🔵 **Indigo (Blue) Theme** | Reminder notifications | `admin_reminder`, `employee_due_reminder`, `employee_reminder_to_admin`, `reminder` |
| 🔴 **Red Alert Theme** | System alerts, warnings | `alert`, `system_alert`, `warning` |

---

## ✅ Solution: 3 Main Fixes Required

### 1️⃣ Unified Notification Type (SABSE ZARURI)

Backend jab bhi notification bhejta hai, `data` payload mein `type` field honi chahiye.

#### 🔴 WRONG Approach (AVOID THIS):
```javascript
// ❌ Reminder ke liye 'alert' type use mat karo
data: {
  type: "alert",  // ❌ WRONG - frontend isko RED ALERT samjhega
  title: "Meeting Reminder"
}
```

#### ✅ CORRECT Approach:
```javascript
// ✅ Reminder ke liye correct types use karo
data: {
  type: "admin_reminder",  // ✅ CORRECT - frontend isko INDIGO REMINDER samjhega
  title: "Meeting Reminder"
}
```

#### Notification Types Ki Complete List:

| Type | Kab Use Karna Hai | Frontend Theme |
|------|-------------------|----------------|
| `admin_reminder` | Jab admin apna khud ka reminder set kare | 🔵 Indigo |
| `employee_due_reminder` | Jab employee ka reminder due ho jaye | 🔵 Indigo |
| `employee_reminder_to_admin` | Jab employee admin ko reminder bheje | 🔵 Indigo |
| `reminder` | Generic reminder (fallback) | 🔵 Indigo |
| `rating_reminder` | Service rating ke liye reminder | 🔵 Indigo |
| `alert` | System warning / emergency ONLY | 🔴 Red |
| `system_alert` | Critical system notification | 🔴 Red |

⚠️ **IMPORTANT:** `alert` type **SIRF** emergency/warning ke liye use karo. Reminder ke liye **KABHI** `alert` mat bhejo!

---

### 2️⃣ Include `reminderId` in Data Payload (COMPULSORY)

Har reminder notification ke `data` object mein `reminderId` ka hona **mandatory** hai.

**Frontend Logic:** Hamara app `reminderId` ko dekh kar turant samajh jata hai ki ye Indigo theme wala reminder hai.

#### Example FCM Payload:

```json
{
  "to": "FCM_TOKEN",
  "data": {
    "type": "admin_reminder",
    "reminderId": "660f1a2b3c4d5e6f7a8b9c0d",
    "title": "🔔 Meeting Reminder",
    "body": "Client meeting in 30 minutes",
    "reminderTitle": "Meet Client",
    "clientName": "Rahul Kumar",
    "phone": "9876543210",
    "location": "Office",
    "note": "Bring documents",
    "reminderTime": "2026-03-13T10:30:00.000Z",
    "employeeName": "Shivam",
    "timestamp": "1710320400000"
  },
  "android": {
    "priority": "high"
  }
}
```

#### Required Fields Checklist:

| Field | Required? | Description |
|-------|-----------|-------------|
| `type` | ✅ **MUST** | `admin_reminder` / `employee_due_reminder` / `reminder` |
| `reminderId` | ✅ **MUST** | MongoDB ObjectId of the reminder |
| `title` | ✅ **MUST** | Notification title |
| `body` | ✅ **MUST** | Notification body |
| `reminderTitle` | Optional | Original reminder title |
| `clientName` | Optional | Client name (if applicable) |
| `phone` | Optional | Contact number |
| `location` | Optional | Location/address |
| `note` | Optional | Additional notes |
| `reminderTime` | Optional | ISO date string of reminder time |
| `employeeName` | Optional | Name of employee (for admin notifications) |
| `timestamp` | Optional | Unix timestamp |

---

### 3️⃣ Dedicated Notification Channel (Android Only)

Status bar mein sahi heading aur priority ke liye backend ko `android_channel_id` specify karni chahiye:

#### Channel IDs:

| Channel ID | Use Case | Priority |
|------------|----------|----------|
| `admin_reminders` | Admin/Employee reminders | HIGH |
| `gharplot_alerts` | System alerts, warnings | HIGH |
| `high_importance_channel` | Critical notifications | MAX |

#### Complete Android Configuration:

```javascript
// For Reminders
android: {
  priority: "high",
  ttl: 0,  // Immediate delivery, no storage
  notification: {
    channelId: "admin_reminders",  // ✅ Correct channel
    sound: "default",
    priority: "high"
  }
}

// For System Alerts
android: {
  priority: "high",
  notification: {
    channelId: "gharplot_alerts",  // ✅ Alert channel
    sound: "default",
    priority: "max"
  }
}
```

---

## 📝 Complete FCM Message Examples

### Example 1: Admin Reminder Notification

```javascript
const message = {
  token: adminFcmToken,
  data: {
    type: "admin_reminder",                    // ✅ CORRECT TYPE
    reminderId: String(reminder._id),          // ✅ MUST INCLUDE
    title: "🔔 Reminder - Employee Name",
    body: `Reminder: ${reminder.title}`,
    reminderTitle: String(reminder.title || ""),
    clientName: String(reminder.clientName || ""),
    phone: String(reminder.phone || ""),
    location: String(reminder.location || ""),
    note: String(reminder.comment || ""),
    reminderTime: String(reminder.reminderDateTime || ""),
    employeeName: String(employee.name || ""),
    timestamp: String(Date.now())
  },
  android: {
    priority: "high",
    ttl: 0,
    notification: {
      channelId: "admin_reminders"
    }
  },
  apns: {
    payload: {
      aps: {
        contentAvailable: true,
        sound: "default",
        badge: 1
      }
    },
    headers: {
      "apns-priority": "10",
      "apns-expiration": "0"
    }
  }
};
```

### Example 2: Employee Due Reminder

```javascript
const message = {
  token: employeeFcmToken,
  data: {
    type: "employee_due_reminder",             // ✅ CORRECT TYPE
    reminderId: String(reminder._id),          // ✅ MUST INCLUDE
    title: `⏰ ${reminder.title || 'Reminder Due'}`,
    body: `${reminder.clientName} - Reminder is due now`,
    clientName: String(reminder.clientName || "N/A"),
    phone: String(reminder.phone || "N/A"),
    location: String(reminder.location || "N/A"),
    note: String(reminder.comment || ""),
    reminderTime: String(reminder.reminderDateTime || ""),
    timestamp: String(Date.now())
  },
  android: {
    priority: "high",
    ttl: 0
  },
  apns: {
    payload: {
      aps: {
        contentAvailable: true,
        sound: "default",
        badge: 1
      }
    },
    headers: {
      "apns-priority": "10"
    }
  }
};
```

---

## 🔧 Backend Code Changes Required

### File: `utils/fcmNotificationService.js`

#### sendEmployeeDueReminderNotification()
```javascript
// ✅ ALREADY CORRECT - type: "employee_due_reminder"
data: {
  type: "employee_due_reminder",  // ✅
  reminderId: String(reminderId || ""),  // ✅
  // ... other fields
}
```

#### sendAdminReminderNotification()
```javascript
// ✅ ALREADY CORRECT - type: "admin_reminder"
data: {
  type: "admin_reminder",  // ✅
  reminderId: String(_id || ""),  // ✅
  // ... other fields
}
```

### File: `cron/reminderCron.js`

Make sure notification creation also includes correct type:
```javascript
const notification = new Notification({
  type: isAdminAssignee ? 'admin_reminder' : 'employee_due_reminder',  // ✅
  metadata: {
    reminderId: r._id,  // ✅ MUST INCLUDE
    // ... other fields
  }
});
```

---

## ⚠️ Common Mistakes To Avoid

### ❌ DON'T:
1. Use `type: "alert"` for reminders
2. Send notification without `reminderId`
3. Use `type: "notification"` (too generic)
4. Mix up channel IDs

### ✅ DO:
1. Always use specific reminder types
2. Always include `reminderId` in data payload
3. Use correct Android channel IDs
4. Convert all values to String in data payload (FCM requirement)

---

## 🧪 Testing Checklist

Before deployment, verify:

- [ ] All reminder notifications have `type` = `admin_reminder` / `employee_due_reminder` / `reminder`
- [ ] All reminder notifications include `reminderId` in data payload
- [ ] Android `channelId` is set to `admin_reminders` for reminders
- [ ] No reminder notification uses `type: "alert"`
- [ ] All data values are converted to String

---

## 📞 Quick Reference for Backend Developer

> **"Bhai, jab aap FCM notification trigger karte ho, toh please:**
> 1. **`type`** field mein `alert` ki jagah strictly `admin_reminder` ya `employee_due_reminder` bhejein
> 2. **`reminderId`** data payload mein hamesha include karein
> 3. Android channel `admin_reminders` use karein
> 
> **Tabhi app use Indigo theme mein dikhayega, warna woh usko Red Alert samajh leta hai."**

---

## 📁 Files To Update

1. `utils/fcmNotificationService.js` - Verify all notification functions
2. `cron/reminderCron.js` - Verify cron job notifications
3. `controllers/reminderController.js` - Manual reminder triggers
4. `controllers/adminReminderController.js` - Admin-specific reminders

---

**Document Version:** 1.0  
**Last Updated:** March 13, 2026
