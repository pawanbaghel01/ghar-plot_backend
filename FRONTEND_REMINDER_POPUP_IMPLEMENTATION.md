# Frontend Reminder Popup Implementation Guide

## 🎯 Complete Guide for Frontend Developer

---

## 📦 Required Packages

```bash
# For React/React Native
npm install socket.io-client

# For notifications (optional)
npm install react-toastify
```

---

## 🔌 Step 1: Socket.io Connection Setup

### For React Web App

Create a file: `src/services/socketService.js`

```javascript
import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:8866'; // Replace with your server URL

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  // Connect to socket server
  connect(token, userType = 'employee') {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Setup listeners based on user type
    if (userType === 'employee') {
      this.setupEmployeeListeners();
    } else if (userType === 'admin') {
      this.setupAdminListeners();
    }
  }

  // Employee listeners
  setupEmployeeListeners() {
    this.socket.on('newNotification', (data) => {
      console.log('🔔 Employee Reminder:', data);
      this.emit('reminder', data);
    });
  }

  // Admin listeners
  setupAdminListeners() {
    this.socket.on('adminReminderNotification', (data) => {
      console.log('📢 Admin Reminder:', data);
      this.emit('adminReminder', data);
    });
  }

  // Custom event emitter for React components
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => callback(data));
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }
}

export default new SocketService();
```

---

## 🎨 Step 2: Reminder Popup Component (React)

Create a file: `src/components/ReminderPopup.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import './ReminderPopup.css';

const ReminderPopup = () => {
  const [notification, setNotification] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Listen for reminder notifications
    const handleReminder = (data) => {
      setNotification(data);
      setIsVisible(true);
      
      // Play notification sound
      playNotificationSound();
      
      // Show browser notification if permission granted
      showBrowserNotification(data);
    };

    socketService.on('reminder', handleReminder);

    return () => {
      socketService.off('reminder', handleReminder);
    };
  }, []);

  const playNotificationSound = () => {
    const audio = new Audio('/notification-sound.mp3');
    audio.play().catch(err => console.log('Audio play failed:', err));
  };

  const showBrowserNotification = (data) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(data.title, {
        body: data.message,
        icon: '/notification-icon.png',
        badge: '/badge-icon.png',
        tag: 'reminder-notification',
        requireInteraction: true
      });
    }
  };

  const handleComplete = async () => {
    try {
      const token = localStorage.getItem('employeeToken');
      const response = await fetch(
        `http://localhost:8866/api/reminder/complete/${notification.reminderData.reminderId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        console.log('✅ Reminder marked as complete');
        closePopup();
      }
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };

  const handleSnooze = async (minutes = 30) => {
    try {
      const token = localStorage.getItem('employeeToken');
      const response = await fetch(
        `http://localhost:8866/api/reminder/snooze/${notification.reminderData.reminderId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ snoozeMinutes: minutes })
        }
      );
      
      if (response.ok) {
        console.log(`✅ Reminder snoozed for ${minutes} minutes`);
        closePopup();
      }
    } catch (error) {
      console.error('Error snoozing reminder:', error);
    }
  };

  const handleDismiss = async () => {
    try {
      const token = localStorage.getItem('employeeToken');
      const response = await fetch(
        `http://localhost:8866/api/reminder/dismiss/${notification.reminderData.reminderId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        console.log('✅ Reminder dismissed');
        closePopup();
      }
    } catch (error) {
      console.error('Error dismissing reminder:', error);
    }
  };

  const closePopup = () => {
    setIsVisible(false);
    setTimeout(() => setNotification(null), 300);
  };

  if (!notification || !isVisible) return null;

  const { reminderData } = notification;

  return (
    <div className="reminder-popup-overlay">
      <div className="reminder-popup">
        <div className="popup-header">
          <div className="header-icon">🔔</div>
          <h3>{notification.title}</h3>
          <button className="close-btn" onClick={closePopup}>×</button>
        </div>

        <div className="popup-body">
          <div className="info-row">
            <span className="label">Client Name:</span>
            <span className="value">{reminderData.name || 'N/A'}</span>
          </div>
          
          <div className="info-row">
            <span className="label">Phone:</span>
            <span className="value">
              <a href={`tel:${reminderData.phone}`}>{reminderData.phone || 'N/A'}</a>
            </span>
          </div>
          
          {reminderData.email && (
            <div className="info-row">
              <span className="label">Email:</span>
              <span className="value">
                <a href={`mailto:${reminderData.email}`}>{reminderData.email}</a>
              </span>
            </div>
          )}
          
          {reminderData.location && (
            <div className="info-row">
              <span className="label">Location:</span>
              <span className="value">{reminderData.location}</span>
            </div>
          )}
          
          {reminderData.note && (
            <div className="info-row note">
              <span className="label">Note:</span>
              <span className="value">{reminderData.note}</span>
            </div>
          )}
          
          <div className="info-row">
            <span className="label">Reminder Time:</span>
            <span className="value">
              {new Date(reminderData.reminderTime).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="popup-actions">
          <button className="btn btn-success" onClick={handleComplete}>
            ✓ Complete
          </button>
          
          <div className="snooze-group">
            <button className="btn btn-warning" onClick={() => handleSnooze(15)}>
              ⏰ Snooze 15m
            </button>
            <button className="btn btn-warning" onClick={() => handleSnooze(30)}>
              ⏰ Snooze 30m
            </button>
            <button className="btn btn-warning" onClick={() => handleSnooze(60)}>
              ⏰ Snooze 1h
            </button>
          </div>
          
          <button className="btn btn-secondary" onClick={handleDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReminderPopup;
```

---

## 🎨 Step 3: CSS Styling

Create a file: `src/components/ReminderPopup.css`

```css
.reminder-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.reminder-popup {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.popup-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px 12px 0 0;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.header-icon {
  font-size: 28px;
  animation: ring 1s ease-in-out infinite;
}

@keyframes ring {
  0%, 100% {
    transform: rotate(0deg);
  }
  10%, 30% {
    transform: rotate(-10deg);
  }
  20%, 40% {
    transform: rotate(10deg);
  }
}

.popup-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  flex: 1;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 28px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.popup-body {
  padding: 24px;
}

.info-row {
  display: flex;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.info-row.note {
  flex-direction: column;
}

.info-row .label {
  font-weight: 600;
  color: #555;
  min-width: 120px;
  font-size: 14px;
}

.info-row .value {
  color: #333;
  flex: 1;
  font-size: 14px;
}

.info-row .value a {
  color: #667eea;
  text-decoration: none;
}

.info-row .value a:hover {
  text-decoration: underline;
}

.info-row.note .value {
  margin-top: 8px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-style: italic;
}

.popup-actions {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 0 0 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover {
  background: #059669;
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover {
  background: #d97706;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

.snooze-group {
  display: flex;
  gap: 8px;
}

.snooze-group .btn {
  flex: 1;
  font-size: 12px;
  padding: 10px 12px;
}

/* Mobile responsive */
@media (max-width: 600px) {
  .reminder-popup {
    width: 95%;
    margin: 10px;
  }

  .popup-header h3 {
    font-size: 16px;
  }

  .info-row {
    flex-direction: column;
    gap: 4px;
  }

  .info-row .label {
    min-width: auto;
  }

  .snooze-group {
    flex-direction: column;
  }
}
```

---

## 🔧 Step 4: Admin Reminder Popup Component

Create a file: `src/components/AdminReminderPopup.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import './AdminReminderPopup.css';

const AdminReminderPopup = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handleAdminReminder = (data) => {
      setNotifications(prev => [data, ...prev].slice(0, 5)); // Keep last 5
      
      // Play sound
      const audio = new Audio('/notification-sound.mp3');
      audio.play().catch(err => console.log('Audio play failed:', err));
      
      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(data.title, {
          body: data.message,
          icon: '/admin-icon.png',
          tag: 'admin-reminder'
        });
      }
    };

    socketService.on('adminReminder', handleAdminReminder);

    return () => {
      socketService.off('adminReminder', handleAdminReminder);
    };
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(
        `http://localhost:8866/admin/notifications/admin-reminders/${notificationId}/read`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Remove from list
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n._id !== notificationId));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="admin-reminder-container">
      {notifications.map((notif) => (
        <div key={notif._id} className="admin-reminder-card">
          <div className="card-header">
            <span className="badge">Employee Reminder</span>
            <button 
              className="dismiss-btn" 
              onClick={() => dismissNotification(notif._id)}
            >
              ×
            </button>
          </div>
          
          <div className="card-body">
            <h4>{notif.title}</h4>
            <p className="message">{notif.message}</p>
            
            <div className="details">
              <div className="detail-item">
                <span className="icon">👤</span>
                <span>{notif.metadata?.employeeName}</span>
              </div>
              <div className="detail-item">
                <span className="icon">📧</span>
                <span>{notif.metadata?.employeeEmail}</span>
              </div>
              <div className="detail-item">
                <span className="icon">👥</span>
                <span>{notif.reminderData?.name}</span>
              </div>
              <div className="detail-item">
                <span className="icon">📞</span>
                <span>{notif.reminderData?.phone}</span>
              </div>
            </div>
          </div>
          
          <div className="card-footer">
            <button 
              className="btn-mark-read" 
              onClick={() => markAsRead(notif._id)}
            >
              Mark as Read
            </button>
            <span className="time">
              {new Date(notif.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminReminderPopup;
```

---

## 🎨 Step 5: Admin Popup CSS

Create a file: `src/components/AdminReminderPopup.css`

```css
.admin-reminder-container {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
}

.admin-reminder-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.card-header {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badge {
  background: rgba(255, 255, 255, 0.3);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.dismiss-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 24px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dismiss-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.card-body {
  padding: 16px;
}

.card-body h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #333;
}

.message {
  color: #666;
  font-size: 14px;
  margin-bottom: 12px;
}

.details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #555;
}

.detail-item .icon {
  font-size: 16px;
}

.card-footer {
  padding: 12px 16px;
  background: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-mark-read {
  background: #667eea;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-mark-read:hover {
  background: #5568d3;
}

.time {
  font-size: 12px;
  color: #999;
}

@media (max-width: 600px) {
  .admin-reminder-container {
    right: 10px;
    left: 10px;
    max-width: none;
  }
}
```

---

## 🚀 Step 6: Integration in Main App

### In your main App.js or Layout component:

```jsx
import React, { useEffect } from 'react';
import socketService from './services/socketService';
import ReminderPopup from './components/ReminderPopup';
import AdminReminderPopup from './components/AdminReminderPopup';

function App() {
  useEffect(() => {
    // Get token and user type from localStorage
    const token = localStorage.getItem('employeeToken') || localStorage.getItem('adminToken');
    const userType = localStorage.getItem('userType'); // 'employee' or 'admin'

    if (token) {
      // Connect to socket
      socketService.connect(token, userType);

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <div className="App">
      {/* Your app content */}
      
      {/* Add reminder popups */}
      <ReminderPopup />
      <AdminReminderPopup />
    </div>
  );
}

export default App;
```

---

## 📱 Step 7: React Native Implementation

### For Mobile App:

```javascript
// services/socketService.js (React Native)
import io from 'socket.io-client';
import { Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';

const SOCKET_URL = 'http://your-server-ip:8866';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(token, userType = 'employee') {
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    if (userType === 'employee') {
      this.socket.on('newNotification', (data) => {
        this.showLocalNotification(data);
      });
    }
  }

  showLocalNotification(data) {
    PushNotification.localNotification({
      channelId: 'reminder-channel',
      title: data.title,
      message: data.message,
      playSound: true,
      soundName: 'default',
      importance: 'high',
      vibrate: true,
      data: data.reminderData,
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default new SocketService();
```

---

## ✅ Step 8: Testing Checklist

### For Frontend Developer:

1. **Install packages:**
   ```bash
   npm install socket.io-client
   ```

2. **Update server URL:**
   - Change `http://localhost:8866` to your actual server URL
   - For production: `https://your-domain.com`

3. **Test Socket Connection:**
   - Open browser console
   - Should see: "✅ Socket connected"

4. **Test Reminder Popup:**
   - Create a reminder with current time from backend
   - Wait 60 seconds
   - Popup should appear automatically

5. **Test Actions:**
   - Click "Complete" → Reminder should be marked complete
   - Click "Snooze" → Reminder should snooze
   - Click "Dismiss" → Popup should close

6. **Test Browser Notifications:**
   - Allow notification permission
   - Create reminder
   - Should see browser notification

---

## 🔧 Configuration

### Update these values in your code:

```javascript
// Server URL
const SOCKET_URL = 'http://localhost:8866'; // Change this

// API endpoints
const API_BASE_URL = 'http://localhost:8866'; // Change this

// Token storage keys
localStorage.getItem('employeeToken'); // Your key name
localStorage.getItem('adminToken'); // Your key name
```

---

## 📞 API Endpoints Reference

```javascript
// Complete reminder
PUT /api/reminder/complete/:id

// Snooze reminder
PUT /api/reminder/snooze/:id
Body: { snoozeMinutes: 30 }

// Dismiss reminder
PUT /api/reminder/dismiss/:id

// Get admin notifications
GET /admin/notifications/admin-reminders?unreadOnly=true

// Mark admin notification as read
PUT /admin/notifications/admin-reminders/:id/read
```

---

## 🎉 Done!

Yeh complete implementation hai. Frontend developer ko bas:
1. Files create karni hain
2. Server URL update karna hai
3. Token management setup karna hai
4. Test karna hai

Sab kuch ready hai! 🚀
