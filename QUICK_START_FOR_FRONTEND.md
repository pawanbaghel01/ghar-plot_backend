# Quick Start Guide for Frontend Developer

## 🚀 5-Minute Setup

### Step 1: Install Package (1 minute)
```bash
npm install socket.io-client
```

### Step 2: Create Socket Service (2 minutes)
Create `src/services/socketService.js`:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:8866'); // Your server URL

export const connectSocket = (token) => {
  socket.auth = { token };
  socket.connect();
  
  socket.on('connect', () => {
    console.log('✅ Connected');
  });
};

export const listenForReminders = (callback) => {
  socket.on('newNotification', callback);
};

export const listenForAdminReminders = (callback) => {
  socket.on('adminReminderNotification', callback);
};

export default socket;
```

### Step 3: Use in Your App (2 minutes)
```javascript
import { useEffect, useState } from 'react';
import { connectSocket, listenForReminders } from './services/socketService';

function App() {
  const [reminder, setReminder] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    connectSocket(token);
    
    listenForReminders((data) => {
      console.log('🔔 Reminder:', data);
      setReminder(data);
      // Show your popup here
      alert(`Reminder: ${data.title}\nClient: ${data.reminderData.name}`);
    });
  }, []);

  return <div>Your App</div>;
}
```

---

## 📋 What You Get from Backend

### Employee Reminder Event: `newNotification`
```javascript
{
  _id: "notification_id",
  title: "🔔 Reminder Alert",
  message: "You have a reminder",
  reminderData: {
    name: "Client Name",
    email: "client@example.com",
    phone: "9999999999",
    location: "Mumbai",
    note: "Follow up call",
    reminderTime: "2026-02-13T16:00:00.000Z"
  },
  createdAt: "2026-02-13T16:00:00.000Z"
}
```

### Admin Reminder Event: `adminReminderNotification`
```javascript
{
  _id: "notification_id",
  title: "🔔 Employee Reminder - Aslam",
  message: "Aslam has a reminder: Follow up call",
  type: "admin_reminder",
  priority: "high",
  metadata: {
    reminderId: "reminder_id",
    employeeId: "employee_id",
    employeeName: "Aslam",
    employeeEmail: "aslam@example.com",
    reminderTitle: "Follow up call",
    clientName: "Client Name",
    reminderTime: "2026-02-13T16:00:00.000Z"
  },
  reminderData: {
    name: "Client Name",
    phone: "9999999999",
    email: "client@example.com",
    location: "Mumbai",
    note: "Follow up call"
  },
  createdAt: "2026-02-13T16:00:00.000Z"
}
```

---

## 🎨 Simple Popup Example

```javascript
function ReminderPopup({ data, onClose }) {
  if (!data) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      zIndex: 9999
    }}>
      <h3>🔔 {data.title}</h3>
      <p><strong>Client:</strong> {data.reminderData.name}</p>
      <p><strong>Phone:</strong> {data.reminderData.phone}</p>
      <p><strong>Note:</strong> {data.reminderData.note}</p>
      
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

---

## 🔧 API Actions

### Complete Reminder
```javascript
const completeReminder = async (reminderId) => {
  const token = localStorage.getItem('token');
  await fetch(`http://localhost:8866/api/reminder/complete/${reminderId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
};
```

### Snooze Reminder
```javascript
const snoozeReminder = async (reminderId, minutes = 30) => {
  const token = localStorage.getItem('token');
  await fetch(`http://localhost:8866/api/reminder/snooze/${reminderId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ snoozeMinutes: minutes })
  });
};
```

---

## ✅ Testing

### Test Socket Connection:
```javascript
// In browser console
socket.connected // Should be true
```

### Test Reminder:
1. Create reminder from backend with current time
2. Wait 60 seconds
3. Popup should appear

### Test Credentials:
```javascript
// Employee Login
POST http://localhost:8866/employee/login
{
  "email": "aslam6209khan@gmail.com",
  "password": "aslam"
}

// Admin Login
POST http://localhost:8866/admin/login
{
  "email": "crmgharplot@gmail.com",
  "password": "crmgharplot@gmail.com"
}
```

---

## 📱 Mobile App (React Native)

```javascript
import io from 'socket.io-client';

const socket = io('http://your-server-ip:8866');

socket.on('newNotification', (data) => {
  // Show local notification
  PushNotification.localNotification({
    title: data.title,
    message: data.message,
  });
});
```

---

## 🆘 Troubleshooting

### Socket not connecting?
- Check server URL
- Check if server is running: `http://localhost:8866`
- Check CORS settings on backend

### Not receiving notifications?
- Check socket connection: `socket.connected`
- Check browser console for errors
- Verify token is valid

### Popup not showing?
- Check if event listener is registered
- Check console for data
- Verify reminder time is current/past

---

## 📞 Need Help?

Check these files:
- `FRONTEND_REMINDER_POPUP_IMPLEMENTATION.md` - Complete implementation
- `REMINDER_TEST_RESULTS.md` - Test results and examples
- `COMPLETE_REMINDER_TESTING_GUIDE.md` - Testing guide

Backend is ready! Just connect Socket.io and show popup! 🚀
