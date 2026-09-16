import express from 'express';
const router = express.Router();

// Create mock due reminders for testing
let mockReminders = [];

// Generate test due reminders
router.get('/due-reminders', async (req, res) => {
  try {
    // Create a few mock reminders if none exist
    if (mockReminders.length === 0) {
      const now = new Date();
      
      mockReminders = [
        {
          _id: 'test-reminder-1',
          title: '📞 Client Follow-up',
          comment: 'Follow up with potential client about luxury apartment inquiry. Discuss pricing, amenities, and schedule viewing.',
          description: 'Follow up with potential client about property inquiry',
          message: 'Follow up with potential client about property inquiry',
          clientName: 'John Smith',
          phone: '+1-555-0123',
          email: 'john.smith@email.com',
          location: 'Downtown Office',
          assignmentType: 'LeadAssignment',
          assignmentId: 'lead-assignment-001',
          reminderDateTime: new Date(now.getTime() - 5 * 60000), // 5 minutes ago
          createdAt: new Date(now.getTime() - 24 * 60 * 60000), // Created 1 day ago
          status: 'pending',
          isRepeating: true,
          repeatType: 'weekly',
          snoozeCount: 1,
          triggerCount: 3,
          nextTrigger: new Date(now.getTime() + 7 * 24 * 60 * 60000) // Next week
        },
        {
          _id: 'test-reminder-2',
          title: '🏠 Property Viewing',
          comment: 'Schedule and conduct property viewing for interested buyer. Show all key features and address any concerns about the location.',
          description: 'Schedule property viewing for interested buyer',
          message: 'Schedule property viewing for interested buyer',
          clientName: 'Sarah Johnson',
          phone: '+1-555-0124',
          email: 'sarah.johnson@gmail.com',
          location: 'West Side Branch',
          assignmentType: 'UserLeadAssignment',
          assignmentId: 'user-lead-002',
          reminderDateTime: new Date(now.getTime() - 2 * 60000), // 2 minutes ago
          createdAt: new Date(now.getTime() - 12 * 60 * 60000), // Created 12 hours ago
          status: 'pending',
          isRepeating: false,
          snoozeCount: 0,
          triggerCount: 1,
          completionResponse: 'Previously contacted client via phone. Scheduled viewing for next Tuesday at 3 PM. Client expressed strong interest in the property location and amenities.',
          completedAt: new Date(now.getTime() - 6 * 60 * 60000), // Completed 6 hours ago
          responseWordCount: 23,
          responseColor: 'green'
        }
      ];
    }
    
    // Return only reminders that are due (in the past)
    const now = new Date();
    const dueReminders = mockReminders.filter(reminder => 
      new Date(reminder.reminderDateTime) <= now
    );
    
    res.json(dueReminders);
  } catch (error) {
    console.error('Error fetching due reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching due reminders',
      error: error.message
    });
  }
});

// Create a new test reminder
router.post('/create-test-reminder', async (req, res) => {
  try {
    const { 
      title, 
      description, 
      comment,
      clientName, 
      phone,
      email,
      location,
      minutes = 0.05 
    } = req.body; // Default to 3 seconds (0.05 minutes)
    
    // Create a reminder that's due in the specified minutes from now
    const reminderTime = new Date();
    reminderTime.setMilliseconds(reminderTime.getMilliseconds() + (minutes * 60 * 1000));
    
    const now = new Date();
    const newReminder = {
      _id: `test-reminder-${Date.now()}`,
      
      // Main reminder fields
      title: title || '🎯 Enhanced Test Reminder',
      comment: comment || description || `🔔 COMPREHENSIVE TEST: This popup shows ALL enhanced details including title, status, client info, and quick actions! Created at ${now.toLocaleTimeString()}`,
      description: description || `Enhanced test reminder with full details display`,
      message: description || `Enhanced test reminder with full details display`,
      
      // Client information
      clientName: clientName || 'Test Client',
      leadName: clientName || 'Test Client', // Alternative field name
      phone: phone || '+1-555-9999',
      email: email || 'test.client@example.com',
      location: location || 'Test Office Location',
      
      // Assignment context (for testing)
      assignmentType: 'LeadAssignment',
      assignmentId: `test-assignment-${Date.now()}`,
      
      // Reminder metadata
      reminderDateTime: reminderTime,
      createdAt: now,
      updatedAt: now,
      
      // Status and tracking
      status: 'pending',
      isActive: true,
      isRepeating: false,
      repeatType: 'daily',
      
      // Interaction counts
      snoozeCount: 0,
      triggerCount: 1,
      
      // Timing
      nextTrigger: reminderTime,
      lastTriggered: null,
      
      // Previous completion (for testing history display)
      completionResponse: null,
      completedAt: null,
      responseWordCount: 0,
      responseColor: 'red',
      
      // Employee context
      employeeId: 'test-employee-123'
    };
    
    mockReminders.push(newReminder);
    
    res.status(201).json({
      success: true,
      message: `Test reminder created - will be due in ${minutes === 0.05 ? '3 seconds' : minutes + ' minute(s)'}`,
      reminder: newReminder,
      dueTime: reminderTime.toLocaleString()
    });
  } catch (error) {
    console.error('Error creating test reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating test reminder',
      error: error.message
    });
  }
});

// Get all test reminders
router.get('/test-reminders', async (req, res) => {
  try {
    res.json({
      success: true,
      count: mockReminders.length,
      reminders: mockReminders
    });
  } catch (error) {
    console.error('Error fetching test reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching test reminders',
      error: error.message
    });
  }
});

// Clear all test reminders
router.delete('/clear-test-reminders', async (req, res) => {
  try {
    const count = mockReminders.length;
    mockReminders = [];
    
    res.json({
      success: true,
      message: `Deleted ${count} test reminders`
    });
  } catch (error) {
    console.error('Error clearing test reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing test reminders',
      error: error.message
    });
  }
});

export default router;