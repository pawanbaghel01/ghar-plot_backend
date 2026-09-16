import Reminder from "../models/reminderSchema.js";
import LeadAssignment from "../models/leadAssignmentSchema.js";
import UserLeadAssignment from "../models/userLeadAssignmentSchema.js";
import ManualInquiry from "../models/manualInquirySchema.js";
import Employee from "../models/employeeSchema.js";
import Notification from "../models/notificationModel.js";
import { sendAdminReminderNotification } from "../utils/fcmNotificationService.js";





// Create a new reminder
// export const createReminder = async (req, res) => {
//   try {
//     const {
//       assignmentId,
//       assignmentType,
//       enquiryId,
//       manualInquiryId, // New field for manual inquiry
//       title,
//       comment,
//       note, // Support both 'comment' and 'note' fields
//       reminderDateTime,
//       isRepeating,
//       repeatType,
//       // Client information fields
//       clientName,
//       phone,
//       email,
//       location
//     } = req.body;
//     const employeeId = req.user.id || req.user._id;

//     console.log('Creating reminder:', { assignmentId, assignmentType, enquiryId, manualInquiryId, title, reminderDateTime, employeeId, clientName });

//     let finalAssignmentId = assignmentId;
//     let finalAssignmentType = assignmentType;
//     let finalManualInquiryId = manualInquiryId;

//     // If manualInquiryId is provided, validate it exists
//     if (manualInquiryId) {
//       const manualInquiry = await ManualInquiry.findById(manualInquiryId);
//       if (!manualInquiry) {
//         return res.status(404).json({
//           success: false,
//           message: "Manual inquiry not found"
//         });
//       }
//       finalManualInquiryId = manualInquiryId;
//       finalAssignmentType = 'ManualInquiry';
//       console.log('Manual inquiry found:', { manualInquiryId, clientName: manualInquiry.clientName });
//     }

//     // If enquiryId is provided instead of assignmentId, find the assignment for this employee
//     if (enquiryId && !assignmentId && !manualInquiryId) {
//       const assignment = await LeadAssignment.findOne({
//         enquiryId: enquiryId,
//         employeeId: employeeId
//       });

//       if (assignment) {
//         finalAssignmentId = assignment._id;
//         finalAssignmentType = 'LeadAssignment';
//         console.log('Found assignment:', { assignmentId: finalAssignmentId, enquiryId });
//       } else {
//         // If no assignment found, create a reminder without assignment reference
//         console.log('No assignment found for enquiryId, creating standalone reminder');
//         finalAssignmentId = null;
//         finalAssignmentType = null;
//       }
//     }

//     // Validate assignment exists and belongs to employee (if assignment is required)
//     if (finalAssignmentId) {
//       let assignment;
//       if (finalAssignmentType === 'LeadAssignment') {
//         assignment = await LeadAssignment.findById(finalAssignmentId);
//       } else if (finalAssignmentType === 'UserLeadAssignment') {
//         assignment = await UserLeadAssignment.findById(finalAssignmentId);
//       }

//       if (!assignment) {
//         return res.status(404).json({
//           success: false,
//           message: "Assignment not found"
//         });
//       }

//       if (assignment.employeeId.toString() !== employeeId.toString()) {
//         return res.status(403).json({
//           success: false,
//           message: "Not authorized to create reminder for this assignment"
//         });
//       }
//     }

//     // Use note if comment is not provided
//     const finalComment = comment || note || '';
//     const finalTitle = title || 'Reminder';

//     // Create reminder
//     const reminder = new Reminder({
//       assignmentId: finalAssignmentId,
//       assignmentType: finalAssignmentType,
//       manualInquiryId: finalManualInquiryId, // Add manual inquiry reference
//       employeeId,
//       title: finalTitle.trim ? finalTitle.trim() : finalTitle,
//       comment: finalComment, // Don't trim HTML content
//       reminderDateTime: new Date(reminderDateTime),
//       isRepeating: isRepeating || false,
//       repeatType: repeatType || 'daily',
//       // Store client information for display in popup
//       clientName: clientName?.trim(),
//       phone: phone?.trim(),
//       email: email?.trim(),
//       location: location?.trim()
//     });

//     // Calculate next trigger for repeating reminders
//     if (reminder.isRepeating) {
//       reminder.calculateNextTrigger();
//     }

//     await reminder.save();

//     // ✅ Check if admin notification is enabled for this employee
//     const employee = await Employee.findById(employeeId).select('name email fcmToken adminReminderPopupEnabled');
//     if (employee && employee.adminReminderPopupEnabled === true) {
//       console.log(`📢 Admin notification enabled for employee: ${employee.name}`);

//       // Create admin notification immediately
//       const adminNotification = new Notification({
//         title: `🔔 New Reminder Set - ${employee.name}`,
//         message: `${employee.name} has set a reminder: ${reminder.title || "Untitled reminder"}`,
//         type: 'admin_reminder',
//         priority: 'high',
//         metadata: {
//           reminderId: reminder._id,
//           employeeId: employee._id,
//           employeeName: employee.name,
//           employeeEmail: employee.email,
//           reminderTitle: reminder.title,
//           clientName: reminder.clientName,
//           phone: reminder.phone,
//           location: reminder.location,
//           note: reminder.comment,
//           reminderTime: reminder.reminderDateTime,
//           createdNow: true // Flag to indicate this is a creation notification
//         },
//         reminderData: {
//           name: reminder.clientName,
//           email: reminder.email,
//           phone: reminder.phone,
//           location: reminder.location,
//           note: reminder.comment,
//           reminderTime: reminder.reminderDateTime,
//         },
//         read: false,
//       });

//       await adminNotification.save();
//       console.log(`✅ Admin notification created for new reminder ${reminder._id}`);

//       // 🚀 Send FCM push notification to admin + only sub-admins who manage this employee
//       const fcmResult = await sendAdminReminderNotification(
//         {
//           title: reminder.title,
//           clientName: reminder.clientName,
//           phone: reminder.phone,
//           location: reminder.location,
//           note: reminder.comment,
//           reminderTime: reminder.reminderDateTime
//         },
//         {
//           employeeName: employee.name,
//           employeeEmail: employee.email,
//           fcmToken: employee.fcmToken
//         },
//         employee._id  // ← filter sub-admins to only those managing this employee
//       );

//       if (fcmResult.success) {
//         console.log(`✅ FCM notification sent to ${fcmResult.successCount} admin(s)`);
//       } else {
//         console.log(`⚠️ FCM notification failed: ${fcmResult.message}`);
//       }

//       // Send Socket.io notification to admin if io is available
//       if (req.io) {
//         req.io.emit("adminReminderNotification", {
//           _id: adminNotification._id,
//           title: adminNotification.title,
//           message: adminNotification.message,
//           type: adminNotification.type,
//           priority: adminNotification.priority,
//           metadata: adminNotification.metadata,
//           reminderData: adminNotification.reminderData,
//           createdAt: adminNotification.createdAt,
//           // Include employeeId so sub-admin clients can self-filter by managedEmployees
//           employeeId: employee._id?.toString(),
//         });
//         console.log(`✅ Socket.io admin notification emitted for new reminder ${reminder._id}`);
//       }
//     }

//     res.status(201).json({
//       success: true,
//       message: "Reminder created successfully",
//       data: reminder
//     });

//   } catch (error) {
//     console.error("Error creating reminder:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to create reminder",
//       error: error.message
//     });
//   }
// };



// export const createReminder = async (req, res) => {
//   try {
//     const {
//       assignmentId,
//       assignmentType,
//       enquiryId,
//       manualInquiryId, // New field for manual inquiry
//       title,
//       comment,
//       note, // Support both 'comment' and 'note' fields
//       reminderDateTime,
//       isRepeating,
//       repeatType,
//       // Client information fields
//       clientName,
//       phone,
//       email,
//       location
//     } = req.body;
//     const employeeId = req.user.id || req.user._id;

//     console.log('Creating reminder:', { assignmentId, assignmentType, enquiryId, manualInquiryId, title, reminderDateTime, employeeId, clientName });

//     let finalAssignmentId = assignmentId;
//     let finalAssignmentType = assignmentType;
//     let finalManualInquiryId = manualInquiryId;

//     // If manualInquiryId is provided, validate it exists
//     if (manualInquiryId) {
//       const manualInquiry = await ManualInquiry.findById(manualInquiryId);
//       if (!manualInquiry) {
//         return res.status(404).json({
//           success: false,
//           message: "Manual inquiry not found"
//         });
//       }
//       finalManualInquiryId = manualInquiryId;
//       finalAssignmentType = 'ManualInquiry';
//       console.log('Manual inquiry found:', { manualInquiryId, clientName: manualInquiry.clientName });
//     }

//     // If enquiryId is provided instead of assignmentId, find the assignment for this employee
//     if (enquiryId && !assignmentId && !manualInquiryId) {
//       const assignment = await LeadAssignment.findOne({
//         enquiryId: enquiryId,
//         employeeId: employeeId
//       });

//       if (assignment) {
//         finalAssignmentId = assignment._id;
//         finalAssignmentType = 'LeadAssignment';
//         console.log('Found assignment:', { assignmentId: finalAssignmentId, enquiryId });
//       } else {
//         // If no assignment found, create a reminder without assignment reference
//         console.log('No assignment found for enquiryId, creating standalone reminder');
//         finalAssignmentId = null;
//         finalAssignmentType = null;
//       }
//     }

//     // Validate assignment exists and belongs to employee (if assignment is required)
//     if (finalAssignmentId) {
//       let assignment;
//       if (finalAssignmentType === 'LeadAssignment') {
//         assignment = await LeadAssignment.findById(finalAssignmentId);
//       } else if (finalAssignmentType === 'UserLeadAssignment') {
//         assignment = await UserLeadAssignment.findById(finalAssignmentId);
//       }

//       if (!assignment) {
//         return res.status(404).json({
//           success: false,
//           message: "Assignment not found"
//         });
//       }

//       if (assignment.employeeId.toString() !== employeeId.toString()) {
//         return res.status(403).json({
//           success: false,
//           message: "Not authorized to create reminder for this assignment"
//         });
//       }
//     }

//     // Use note if comment is not provided
//     const finalComment = comment || note || '';
//     const finalTitle = title || 'Reminder';

//     // Create reminder
//     const reminder = new Reminder({
//       assignmentId: finalAssignmentId,
//       assignmentType: finalAssignmentType,
//       manualInquiryId: finalManualInquiryId, // Add manual inquiry reference
//       employeeId,
//       title: finalTitle.trim ? finalTitle.trim() : finalTitle,
//       comment: finalComment, // Don't trim HTML content
//       reminderDateTime: new Date(reminderDateTime),
//       isRepeating: isRepeating || false,
//       repeatType: repeatType || 'daily',
//       // Store client information for display in popup
//       clientName: clientName?.trim(),
//       phone: phone?.trim(),
//       email: email?.trim(),
//       location: location?.trim()
//     });

//     // Calculate next trigger for repeating reminders
//     if (reminder.isRepeating) {
//       reminder.calculateNextTrigger();
//     }

//     await reminder.save();

//     // ✅ Check if admin notification is enabled for this employee
//     const employee = await Employee.findById(employeeId).select('name email fcmToken adminReminderPopupEnabled');
//     if (employee && employee.adminReminderPopupEnabled === true) {
//       console.log(`📢 Admin notification enabled for employee: ${employee.name}`);

//       // Create admin notification immediately
//       const adminNotification = new Notification({
//         title: `🔔 New Reminder Set - ${employee.name}`,
//         message: `${employee.name} has set a reminder: ${reminder.title || "Untitled reminder"}`,
//         type: 'admin_reminder',
//         priority: 'high',
//         metadata: {
//           reminderId: `${reminder._id}_new`, // 🔥 Force unique ID for creation
//           employeeId: employee._id,
//           employeeName: employee.name,
//           employeeEmail: employee.email,
//           reminderTitle: reminder.title,
//           clientName: reminder.clientName,
//           phone: reminder.phone,
//           location: reminder.location,
//           note: reminder.comment,
//           reminderTime: reminder.reminderDateTime,
//           createdNow: true // Flag to indicate this is a creation notification
//         },
//         reminderData: {
//           name: reminder.clientName,
//           email: reminder.email,
//           phone: reminder.phone,
//           location: reminder.location,
//           note: reminder.comment,
//           reminderTime: reminder.reminderDateTime,
//         },
//         read: false,
//       });

//       await adminNotification.save();
//       console.log(`✅ Admin notification created for new reminder ${reminder._id}`);

//       // 🚀 Send FCM push notification to admin + only sub-admins who manage this employee
//       const fcmResult = await sendAdminReminderNotification(
//         {
//           title: reminder.title,
//           clientName: reminder.clientName,
//           phone: reminder.phone,
//           location: reminder.location,
//           note: reminder.comment,
//           reminderTime: reminder.reminderDateTime
//         },
//         {
//           employeeName: employee.name,
//           employeeEmail: employee.email,
//           fcmToken: employee.fcmToken
//         },
//         employee._id  // ← filter sub-admins to only those managing this employee
//       );

//       if (fcmResult.success) {
//         console.log(`✅ FCM notification sent to ${fcmResult.successCount} admin(s)`);
//       } else {
//         console.log(`⚠️ FCM notification failed: ${fcmResult.message}`);
//       }

//       // Send Socket.io notification to admin if io is available
//       if (req.io) {
//         req.io.emit("adminReminderNotification", {
//           _id: adminNotification._id,
//           title: adminNotification.title,
//           message: adminNotification.message,
//           type: adminNotification.type,
//           priority: adminNotification.priority,
//           metadata: adminNotification.metadata,
//           reminderData: adminNotification.reminderData,
//           createdAt: adminNotification.createdAt,
//           // Include employeeId so sub-admin clients can self-filter by managedEmployees
//           employeeId: employee._id?.toString(),
//         });
//         console.log(`✅ Socket.io admin notification emitted for new reminder ${reminder._id}`);
//       }
//     }

//     res.status(201).json({
//       success: true,
//       message: "Reminder created successfully",
//       data: reminder
//     });

//   } catch (error) {
//     console.error("Error creating reminder:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to create reminder",
//       error: error.message
//     });
//   }
// };
export const createReminder = async (req, res) => {
  try {
    // 🐛 DEBUG: Log exact payload received
    console.log('🐛 [CreateReminder] Full payload received:', JSON.stringify(req.body, null, 2));
    console.log('🐛 [CreateReminder] User ID:', req.user?.id);
    console.log('🐛 [CreateReminder] Current time:', new Date().toISOString());
    
    const {
      assignmentId,
      assignmentType,
      enquiryId,
      manualInquiryId, // New field for manual inquiry
      title,
      comment,
      note, // Support both 'comment' and 'note' fields
      reminderDateTime,
      isRepeating,
      repeatType,
      // Client information fields
      clientName,
      phone,
      email,
      location
    } = req.body;
    const employeeId = req.user.id || req.user._id;

    console.log('Creating reminder:', { assignmentId, assignmentType, enquiryId, manualInquiryId, title, reminderDateTime, employeeId, clientName });

    let finalAssignmentId = assignmentId;
    let finalAssignmentType = assignmentType;
    let finalManualInquiryId = manualInquiryId;

    // If manualInquiryId is provided, validate it exists
    if (manualInquiryId) {
      const manualInquiry = await ManualInquiry.findById(manualInquiryId);
      if (!manualInquiry) {
        return res.status(404).json({
          success: false,
          message: "Manual inquiry not found"
        });
      }
      finalManualInquiryId = manualInquiryId;
      finalAssignmentType = 'ManualInquiry';
      console.log('Manual inquiry found:', { manualInquiryId, clientName: manualInquiry.clientName });
    }

    // If enquiryId is provided instead of assignmentId, find the assignment for this employee
    if (enquiryId && !assignmentId && !manualInquiryId) {
      const assignment = await LeadAssignment.findOne({
        enquiryId: enquiryId,
        employeeId: employeeId
      });

      if (assignment) {
        finalAssignmentId = assignment._id;
        finalAssignmentType = 'LeadAssignment';
        console.log('Found assignment:', { assignmentId: finalAssignmentId, enquiryId });
      } else {
        // If no assignment found, create a reminder without assignment reference
        console.log('No assignment found for enquiryId, creating standalone reminder');
        finalAssignmentId = null;
        finalAssignmentType = null;
      }
    }

    // Validate assignment exists and belongs to employee (if assignment is required)
    if (finalAssignmentId) {
      let assignment;
      if (finalAssignmentType === 'LeadAssignment') {
        assignment = await LeadAssignment.findById(finalAssignmentId);
      } else if (finalAssignmentType === 'UserLeadAssignment') {
        assignment = await UserLeadAssignment.findById(finalAssignmentId);
      }

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "Assignment not found"
        });
      }

      if (assignment.employeeId.toString() !== employeeId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to create reminder for this assignment"
        });
      }
    }

    // Use note if comment is not provided
    const finalComment = comment || note || '';
    const finalTitle = title || 'Reminder';

    // 🔥 FIX: Prevent double-submit only (2 min window) — NOT a global title match
    const existingReminder = await Reminder.findOne({
      employeeId,
      title: finalTitle,
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
    });
    
    if (existingReminder) {
      console.log(`⚠️ [CreateReminder] Double-submit prevented: ${existingReminder._id} | Employee: ${employeeId}`);
      return res.status(409).json({
        success: false,
        message: "Reminder was just created. Please wait a moment before creating another.",
        existingReminder: existingReminder._id,
        duplicateReason: "Same reminder created within last 2 minutes"
      });
    }

    // Create reminder
    const reminder = new Reminder({
      assignmentId: finalAssignmentId,
      assignmentType: finalAssignmentType,
      manualInquiryId: finalManualInquiryId, // Add manual inquiry reference
      employeeId,
      title: finalTitle.trim ? finalTitle.trim() : finalTitle,
      comment: finalComment, // Don't trim HTML content
      reminderDateTime: new Date(reminderDateTime), // 🇮🇳 Accept as-is, frontend should send UTC
      isRepeating: isRepeating || false,
      repeatType: repeatType || 'daily',
      // Store client information for display in popup
      clientName: clientName?.trim(),
      phone: phone?.trim(),
      email: email?.trim(),
      location: location?.trim()
    });
    
    console.log(`📅 [CreateReminder] reminderDateTime received: ${reminderDateTime} → stored as: ${reminder.reminderDateTime.toISOString()}`);


    // Calculate next trigger for repeating reminders
    if (reminder.isRepeating) {
      reminder.calculateNextTrigger();
    }

    await reminder.save();

    // ✅ Check if admin notification is enabled for this employee
    const employee = await Employee.findById(employeeId).select('name email fcmToken adminReminderPopupEnabled');
    if (employee && employee.adminReminderPopupEnabled === true) {
      console.log(`📢 Admin notification enabled for employee: ${employee.name}`);

      // 🔥 ADDITIONAL CHECK: Prevent duplicate admin notifications
      const recentAdminNotif = await Notification.findOne({
        type: 'admin_reminder',
        'metadata.employeeId': employee._id,
        'metadata.reminderTitle': reminder.title,
        createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) } // Within last 2 minutes
      });
      
      if (recentAdminNotif) {
        console.log(`⚠️ [AdminNotif] Duplicate admin notification prevented for employee: ${employee.name}`);
        // Continue without creating admin notification
      } else {
        // Create admin notification immediately
        const adminNotification = new Notification({
        title: `🔔 New Reminder Set - ${employee.name}`,
        message: `${employee.name} has set a reminder: ${reminder.title || "Untitled reminder"}`,
        type: 'admin_reminder',
        priority: 'high',
        metadata: {
          reminderId: `${reminder._id}_new`, // 🔥 Force unique ID for creation
          employeeId: employee._id,
          employeeName: employee.name,
          employeeEmail: employee.email,
          reminderTitle: reminder.title,
          clientName: reminder.clientName,
          phone: reminder.phone,
          location: reminder.location,
          note: reminder.comment,
          reminderTime: reminder.reminderDateTime,
          createdNow: true // Flag to indicate this is a creation notification
        },
        reminderData: {
          name: reminder.clientName,
          email: reminder.email,
          phone: reminder.phone,
          location: reminder.location,
          note: reminder.comment,
          reminderTime: reminder.reminderDateTime,
        },
        read: false,
      });

      await adminNotification.save();
      console.log(`✅ Admin notification created for new reminder ${reminder._id}`);

      // 🚀 DIRECT FCM SEND (Simplified)
      try {
        const admin = (await import('firebase-admin')).default;
        const Admin = (await import('../models/adminAuthSchema.js')).default;

        // 1. Get all unique admin tokens (including all active devices)
        const adminUsers = await Admin.find({
          $or: [{ "fcmTokens.0": { $exists: true } }, { fcmToken: { $exists: true, $ne: "" } }]
        });
        const subAdmins = await Employee.find({
          giveAdminAccess: true,
          managedEmployees: employeeId,
          $or: [{ "fcmTokens.0": { $exists: true } }, { fcmToken: { $exists: true, $ne: "" } }]
        });

        const tokens = new Set();
        adminUsers.forEach(a => {
          const list = a.fcmTokens?.length ? a.fcmTokens.map(t => t.token || t).filter(Boolean) : (a.fcmToken ? [a.fcmToken] : []);
          list.forEach(t => tokens.add(t));
        });
        subAdmins.forEach(sa => {
          const list = sa.fcmTokens?.length ? sa.fcmTokens.map(t => t.token || t).filter(Boolean) : (sa.fcmToken ? [sa.fcmToken] : []);
          list.forEach(t => tokens.add(t));
        });

        // Remove employee's own tokens from the list
        const empTokens = employee.fcmTokens?.length
          ? employee.fcmTokens.map(t => t.token || t).filter(Boolean)
          : (employee.fcmToken ? [employee.fcmToken] : []);
        empTokens.forEach(t => tokens.delete(t));

        console.log(`[Direct-FCM] Sending to ${tokens.size} unique admin devices`);

        // 2. Send to each token (DATA-ONLY like employee reminder for INDIGO theme)
        for (const token of tokens) {
          const message = {
            token: token,
            // 🔥 DATA-ONLY payload - No 'notification' object
            // App's FCM handler will use Notifee for INDIGO theme
            data: {
              type: "admin_reminder",
              reminderId: String(reminder._id),
              title: `🔔 New Reminder Set - ${employee.name}`,
              body: `${employee.name} set a reminder for ${reminder.clientName}`,
              clientName: String(reminder.clientName || ""),
              employeeName: String(employee.name || ""),
              phone: String(reminder.phone || ""),
              location: String(reminder.location || ""),
              note: String(reminder.comment || ""),
              reminderTime: String(reminder.reminderDateTime || ""),
              createdBy: String(employee.name || ""),
              timestamp: String(Date.now())
            },
            android: { priority: "high", ttl: 86400 },
            apns: {
              payload: { aps: { contentAvailable: true, sound: "default", badge: 1 } },
              headers: { "apns-priority": "10", "apns-expiration": "86400" }
            }
          };

          admin.messaging().send(message)
            .then(res => console.log(`✅ Direct FCM Sent: ${res}`))
            .catch(err => console.error(`❌ Direct FCM Error: ${err.message}`));
        }
      } catch (fcmErr) {
        console.error("Direct FCM block error:", fcmErr);
      }

      // Send Socket.io notification to admin if io is available
      if (req.io) {
        req.io.emit("adminReminderNotification", {
          _id: adminNotification._id,
          title: adminNotification.title,
          message: adminNotification.message,
          type: adminNotification.type,
          priority: adminNotification.priority,
          metadata: adminNotification.metadata,
          reminderData: adminNotification.reminderData,
          createdAt: adminNotification.createdAt,
          // Include employeeId so sub-admin clients can self-filter by managedEmployees
          employeeId: employee._id?.toString(),
        });
        console.log(`✅ Socket.io admin notification emitted for new reminder ${reminder._id}`);
      }
      } // Close the else block for duplicate check
    }

    res.status(201).json({
      success: true,
      message: "Reminder created successfully",
      data: reminder
    });

  } catch (error) {
    console.error("Error creating reminder:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create reminder",
      error: error.message
    });
  }
};


// Get reminders for an employee's assignments
export const getEmployeeReminders = async (req, res) => {
  try {
    const employeeId = req.user.id || req.user._id;
    const { status, assignmentType, enquiryId, manualInquiryId, page = 1, limit = 20 } = req.query;

    const filter = { employeeId };

    if (status) filter.status = status;
    if (assignmentType) filter.assignmentType = assignmentType;

    // Filter by manualInquiryId if provided
    if (manualInquiryId) {
      filter.manualInquiryId = manualInquiryId;
    }

    // Filter by enquiryId if provided
    if (enquiryId) {
      // Find assignments with this enquiryId
      const leadAssignments = await LeadAssignment.find({ inquiryId: enquiryId }).select('_id');
      const userLeadAssignments = await UserLeadAssignment.find({ inquiryId: enquiryId }).select('_id');

      const assignmentIds = [
        ...leadAssignments.map(a => a._id),
        ...userLeadAssignments.map(a => a._id)
      ];

      if (assignmentIds.length > 0) {
        filter.assignmentId = { $in: assignmentIds };
      } else {
        // No assignments found for this enquiryId, return empty result
        return res.status(200).json({
          success: true,
          data: {
            reminders: [],
            pagination: {
              currentPage: parseInt(page),
              totalPages: 0,
              total: 0,
              hasNext: false,
              hasPrev: false
            }
          }
        });
      }
    }

    const skip = (page - 1) * limit;

    const reminders = await Reminder.find(filter)
      .populate({
        path: 'employeeId',
        select: 'name email'
      })
      .populate({
        path: 'editHistory.editedBy',
        select: 'name email'
      })
      .sort({ reminderDateTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Manually populate assignmentId only for reminders that have valid assignmentType (not 'Lead')
    for (const reminder of reminders) {
      // Populate manual inquiry if present
      if (reminder.manualInquiryId) {
        try {
          await reminder.populate({
            path: 'manualInquiryId',
            select: 'clientName contactNumber location s_No ClientCode ProjectCode productType caseStatus address source majorComments'
          });
        } catch (error) {
          console.warn(`Failed to populate manual inquiry for reminder ${reminder._id}:`, error.message);
        }
      }

      if (reminder.assignmentId && reminder.assignmentType && reminder.assignmentType !== 'Lead') {
        try {
          await reminder.populate({
            path: 'assignmentId',
            select: 'userId inquiryId createdAt status'
          });
        } catch (error) {
          console.warn(`Failed to populate assignment for reminder ${reminder._id}:`, error.message);
          // Continue without population
        }
      }
    }

    const total = await Reminder.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        reminders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error("Error getting employee reminders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get reminders",
      error: error.message
    });
  }
};

// Get reminders by employee ID (Admin or internal use)
export const getRemindersByEmployeeId = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID is required"
      });
    }

    const reminders = await Reminder.find({ employeeId })
      .populate({
        path: "employeeId",
        select: "name email"
      })
      .populate({
        path: "manualInquiryId",
        select: "clientName contactNumber location caseStatus"
      })
      .sort({ reminderDateTime: 1 });

    return res.status(200).json({
      success: true,
      message: "Reminders fetched successfully",
      count: reminders.length,
      data: reminders
    });

  } catch (error) {
    console.error("Error fetching reminders by employeeId:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reminders",
      error: error.message
    });
  }
};


// Get due reminders for popup notifications
export const getDueReminders = async (req, res) => {
  try {
    const employeeId = req.user.id || req.user._id;

    const dueReminders = await Reminder.getDueReminders(employeeId);

    console.log(`📋 Found ${dueReminders.length} due reminders for employee ${employeeId}`);
    dueReminders.forEach(reminder => {
      console.log(`  - Reminder ${reminder._id}: Status=${reminder.status}, Title="${reminder.title}", Comment="${reminder.comment ? reminder.comment.substring(0, 100) : 'No comment'}"`);
      console.log(`    Available fields:`, Object.keys(reminder.toObject()));
    });

    res.status(200).json({
      success: true,
      data: dueReminders,
      count: dueReminders.length
    });

  } catch (error) {
    console.error("Error getting due reminders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get due reminders",
      error: error.message
    });
  }
};

// Complete a reminder
export const completeReminder = async (req, res) => {
  try {
    const { reminderId } = req.params;
    const { response } = req.body;
    const employeeId = req.user.id || req.user._id;

    const reminder = await Reminder.findById(reminderId);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    if (reminder.employeeId.toString() !== employeeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to complete this reminder"
      });
    }

    if (!response || response.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Response is required to complete reminder"
      });
    }

    console.log(`🔄 Completing reminder ${reminderId} with current status: ${reminder.status}, isRepeating: ${reminder.isRepeating}`);

    // Complete the reminder
    await reminder.completeReminder(response.trim());

    console.log(`✅ Reminder completed. New status: ${reminder.status}, isRepeating: ${reminder.isRepeating}`);

    // Add notification record
    reminder.notifications.push({
      triggeredAt: new Date(),
      acknowledged: true,
      acknowledgedAt: new Date(),
      action: 'completed'
    });

    await reminder.save();

    res.status(200).json({
      success: true,
      message: "Reminder completed successfully",
      data: {
        reminder,
        responseColor: reminder.responseColor,
        wordCount: reminder.responseWordCount
      }
    });

  } catch (error) {
    console.error("Error completing reminder:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete reminder",
      error: error.message
    });
  }
};

// Snooze a reminder
export const snoozeReminder = async (req, res) => {
  try {
    const { reminderId } = req.params;
    const { snoozeMinutes = 15 } = req.body;
    const employeeId = req.user.id || req.user._id;

    const reminder = await Reminder.findById(reminderId);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    if (reminder.employeeId.toString() !== employeeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to snooze this reminder"
      });
    }

    await reminder.snoozeReminder(parseInt(snoozeMinutes));

    // Add notification record
    reminder.notifications.push({
      triggeredAt: new Date(),
      acknowledged: true,
      acknowledgedAt: new Date(),
      action: 'snoozed'
    });

    await reminder.save();

    res.status(200).json({
      success: true,
      message: `Reminder snoozed for ${snoozeMinutes} minutes`,
      data: reminder
    });

  } catch (error) {
    console.error("Error snoozing reminder:", error);
    res.status(500).json({
      success: false,
      message: "Failed to snooze reminder",
      error: error.message
    });
  }
};

// Dismiss a reminder
export const dismissReminder = async (req, res) => {
  try {
    const { reminderId } = req.params;
    const employeeId = req.user.id || req.user._id;

    const reminder = await Reminder.findById(reminderId);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    if (reminder.employeeId.toString() !== employeeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to dismiss this reminder"
      });
    }

    await reminder.dismissReminder();

    // Add notification record
    reminder.notifications.push({
      triggeredAt: new Date(),
      acknowledged: true,
      acknowledgedAt: new Date(),
      action: 'dismissed'
    });

    await reminder.save();

    res.status(200).json({
      success: true,
      message: "Reminder dismissed successfully",
      data: reminder
    });

  } catch (error) {
    console.error("Error dismissing reminder:", error);
    res.status(500).json({
      success: false,
      message: "Failed to dismiss reminder",
      error: error.message
    });
  }
};

// Update reminder settings (toggle repeat, change time, etc.)


export const updateReminder = async (req, res) => {
  try {
    const { reminderId } = req.params;
    const { 
      title, 
      comment, 
      note,  // Support both comment and note
      reminderDateTime, 
      isRepeating, 
      repeatType, 
      isActive,
      // 🔥 NEW: Allow updating client details
      clientName,
      phone,
      email,
      location
    } = req.body;
    const employeeId = req.user.id || req.user._id;

    const reminder = await Reminder.findById(reminderId);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    // if (reminder.employeeId.toString() !== employeeId.toString()) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Not authorized to update this reminder"
    //   });
    // }

    // Store old values for edit history
    const oldContent = {
      title: reminder.title,
      comment: reminder.comment,
      reminderDateTime: reminder.reminderDateTime,
      clientName: reminder.clientName,
      phone: reminder.phone,
      location: reminder.location
    };

    // Track if any content changed
    let contentChanged = false;

    // Update fields
    if (title !== undefined && title.trim() !== reminder.title) {
      reminder.title = title.trim();
      contentChanged = true;
    }
    // Support both comment and note fields
    const finalComment = comment !== undefined ? comment : (note !== undefined ? note : undefined);
    if (finalComment !== undefined && finalComment !== reminder.comment) {
      reminder.comment = finalComment;
      contentChanged = true;
    }
    if (reminderDateTime !== undefined && new Date(reminderDateTime).getTime() !== reminder.reminderDateTime.getTime()) {
      reminder.reminderDateTime = new Date(reminderDateTime);
      contentChanged = true;
      
      // 🔥 If time changed to future, reset status to pending so cron picks it up
      if (new Date(reminderDateTime) > new Date()) {
        reminder.status = 'pending';
        reminder.cronFired = false;
        console.log(`🔄 [UpdateReminder] Time changed to future - status reset to pending`);
      }
    }
    
    // 🔥 NEW: Update client details
    if (clientName !== undefined && clientName !== reminder.clientName) {
      reminder.clientName = clientName.trim();
      contentChanged = true;
    }
    if (phone !== undefined && phone !== reminder.phone) {
      reminder.phone = phone.trim();
      contentChanged = true;
    }
    if (email !== undefined && email !== reminder.email) {
      reminder.email = email.trim();
      contentChanged = true;
    }
    if (location !== undefined && location !== reminder.location) {
      reminder.location = location.trim();
      contentChanged = true;
    }
    
    if (isRepeating !== undefined) reminder.isRepeating = isRepeating;
    if (repeatType !== undefined) reminder.repeatType = repeatType;
    if (isActive !== undefined) reminder.isActive = isActive;

    // Add to edit history if content changed
    if (contentChanged) {
      if (!reminder.editHistory) {
        reminder.editHistory = [];
      }
      reminder.editHistory.push({
        oldContent: oldContent,
        newContent: {
          title: reminder.title,
          comment: reminder.comment,
          reminderDateTime: reminder.reminderDateTime,
          clientName: reminder.clientName,
          phone: reminder.phone,
          location: reminder.location
        },
        editedAt: new Date(),
        editedBy: employeeId
      });

      // 🔥 IMPORTANT: Reset cronFired when content changes so updated data goes in next notification
      // Schema's pre-save hook only resets for time changes, not title/comment changes
      reminder.cronFired = false;
      console.log(`🔄 [UpdateReminder] Content changed for "${reminder.title}" - cronFired reset to false`);
    }

    // Recalculate next trigger if needed
    if (reminder.isRepeating && reminder.isActive) {
      reminder.calculateNextTrigger();
    } else {
      reminder.nextTrigger = null;
    }

    await reminder.save();

    res.status(200).json({
      success: true,
      message: "Reminder updated successfully",
      data: reminder
    });

  } catch (error) {
    console.error("Error updating reminder:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update reminder",
      error: error.message
    });
  }
};




// Delete a reminder
export const deleteReminder = async (req, res) => {
  try {
    const { reminderId } = req.params;
    const employeeId = req.user.id || req.user._id;

    const reminder = await Reminder.findById(reminderId);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    if (reminder.employeeId.toString() !== employeeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this reminder"
      });
    }

    await Reminder.findByIdAndDelete(reminderId);

    res.status(200).json({
      success: true,
      message: "Reminder deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting reminder:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete reminder",
      error: error.message
    });
  }
};

// Get reminder statistics for employee
export const getReminderStats = async (req, res) => {
  try {
    const employeeId = req.user.id || req.user._id;

    const stats = await Reminder.aggregate([
      { $match: { employeeId: employeeId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const dueCount = await Reminder.countDocuments({
      employeeId,
      isActive: true,
      $or: [
        { status: 'pending', reminderDateTime: { $lte: new Date() } },
        { status: 'snoozed', snoozedUntil: { $lte: new Date() } }
      ]
    });

    const formattedStats = {
      total: 0,
      pending: 0,
      completed: 0,
      snoozed: 0,
      dismissed: 0,
      due: dueCount
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
      formattedStats.total += stat.count;
    });

    res.status(200).json({
      success: true,
      data: formattedStats
    });

  } catch (error) {
    console.error("Error getting reminder stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get reminder statistics",
      error: error.message
    });
  }
};

// Create reminder directly from lead data (simplified endpoint)
// export const createReminderFromLead = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       phone,
//       location,
//       reminderTime,
//       note,
//       manualInquiryId // Support manual inquiry ID
//     } = req.body;
//     const employeeId = req.user.id || req.user._id;

//     console.log('Creating reminder from lead:', { name, email, phone, reminderTime, employeeId, manualInquiryId });

//     // Validate required fields
//     if (!reminderTime) {
//       return res.status(400).json({
//         success: false,
//         message: "Reminder time is required"
//       });
//     }

//     if (!name) {
//       return res.status(400).json({
//         success: false,
//         message: "Client name is required"
//       });
//     }

//     // Validate manual inquiry if provided
//     let finalManualInquiryId = null;
//     let assignmentType = 'Lead';

//     if (manualInquiryId) {
//       const manualInquiry = await ManualInquiry.findById(manualInquiryId);
//       if (!manualInquiry) {
//         return res.status(404).json({
//           success: false,
//           message: "Manual inquiry not found"
//         });
//       }
//       finalManualInquiryId = manualInquiryId;
//       assignmentType = 'ManualInquiry';
//       console.log('Manual inquiry linked to reminder:', { manualInquiryId, clientName: manualInquiry.clientName });
//     }

//     // Create reminder without assignment (standalone reminder or with manual inquiry)
//     const reminder = new Reminder({
//       employeeId,
//       title: `Follow up with ${name}`,
//       comment: note || `Reminder to follow up with ${name}`,
//       note: note || '',
//       reminderDateTime: new Date(reminderTime),
//       isRepeating: false,
//       // Store client information for display
//       clientName: name?.trim(),
//       phone: phone?.trim(),
//       email: email?.trim(),
//       location: location?.trim(),
//       // Manual inquiry reference if provided
//       manualInquiryId: finalManualInquiryId,
//       assignmentId: null,
//       assignmentType: assignmentType
//     });

//     await reminder.save();

//     res.status(201).json({
//       success: true,
//       message: "Reminder created successfully",
//       data: reminder
//     });

//   } catch (error) {
//     console.error("Error creating reminder from lead:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to create reminder",
//       error: error.message
//     });
//   }
// };



export const createReminderFromLead = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      location,
      reminderTime,
      note,
      manualInquiryId // Support manual inquiry ID
    } = req.body;
    const employeeId = req.user.id || req.user._id;

    console.log('Creating reminder from lead:', { name, email, phone, reminderTime, employeeId, manualInquiryId });

    // Validate required fields
    if (!reminderTime) {
      return res.status(400).json({
        success: false,
        message: "Reminder time is required"
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Client name is required"
      });
    }

    // Validate manual inquiry if provided
    let finalManualInquiryId = null;
    let assignmentType = 'Lead';

    if (manualInquiryId) {
      const manualInquiry = await ManualInquiry.findById(manualInquiryId);
      if (!manualInquiry) {
        return res.status(404).json({
          success: false,
          message: "Manual inquiry not found"
        });
      }
      finalManualInquiryId = manualInquiryId;
      assignmentType = 'ManualInquiry';
      console.log('Manual inquiry linked to reminder:', { manualInquiryId, clientName: manualInquiry.clientName });
    }

    // Create reminder without assignment (standalone reminder or with manual inquiry)
    const reminder = new Reminder({
      employeeId,
      title: `Follow up with ${name}`,
      comment: note || `Reminder to follow up with ${name}`,
      note: note || '',
      reminderDateTime: new Date(reminderTime),
      isRepeating: false,
      // Store client information for display
      clientName: name?.trim(),
      phone: phone?.trim(),
      email: email?.trim(),
      location: location?.trim(),
      // Manual inquiry reference if provided
      manualInquiryId: finalManualInquiryId,
      assignmentId: null,
      assignmentType: assignmentType
    });

    await reminder.save();

    // ✅ Notification logic for admin/managers
    try {
      console.log(`[DEBUG] createReminderFromLead: Checking admin notification status for employee ${employeeId}`);
      const employee = await Employee.findById(employeeId).select('name email fcmToken adminReminderPopupEnabled');

      if (employee && employee.adminReminderPopupEnabled === true) {
        console.log(`📢 Admin notification enabled for employee: ${employee.name}. Proceeding to notify admins.`);

        // 1. Create database notification record
        const adminNotification = new Notification({
          title: `🔔 New Reminder Set - ${employee.name}`,
          message: `${employee.name} has set a reminder for ${reminder.clientName}: ${reminder.title || "Follow up"}`,
          type: 'admin_reminder',
          priority: 'high',
          metadata: {
            reminderId: reminder._id,
            employeeId: employee._id,
            employeeName: employee.name,
            employeeEmail: employee.email,
            reminderTitle: reminder.title,
            clientName: reminder.clientName,
            phone: reminder.phone,
            location: reminder.location,
            note: reminder.comment,
            reminderTime: reminder.reminderDateTime,
            createdNow: true
          },
          reminderData: {
            name: reminder.clientName,
            email: reminder.email,
            phone: reminder.phone,
            location: reminder.location,
            note: reminder.comment,
            reminderTime: reminder.reminderDateTime,
          },
          read: false,
        });
        await adminNotification.save();
        console.log(`[DEBUG] createReminderFromLead: DB Notification record saved successfully.`);

        // 2. Send FCM push notification
        console.log(`[DEBUG] createReminderFromLead: Triggering FCM push via sendAdminReminderNotification...`);
        const fcmResult = await sendAdminReminderNotification(
          {
            title: reminder.title,
            clientName: reminder.clientName,
            phone: reminder.phone,
            location: reminder.location,
            note: reminder.comment,
            reminderTime: reminder.reminderDateTime
          },
          {
            employeeName: employee.name,
            employeeEmail: employee.email,
            fcmToken: employee.fcmToken
          },
          employee._id // managedEmployees filter
        );
        console.log(`[DEBUG] createReminderFromLead: FCM notification process finished. Success: ${fcmResult?.success}`);
      } else {
        console.log(`[DEBUG] createReminderFromLead: Admin notification SKIPPED. adminReminderPopupEnabled is ${employee?.adminReminderPopupEnabled}`);
      }
    } catch (notifErr) {
      console.error("[ERROR] createReminderFromLead: Failed to send admin creation notification:", notifErr);
    }

    res.status(201).json({
      success: true,
      message: "Reminder created successfully",
      data: reminder
    });

  } catch (error) {
    console.error("Error creating reminder from lead:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create reminder",
      error: error.message
    });
  }
};

// Mark reminder as seen (viewed but not completed)
export const markReminderAsSeen = async (req, res) => {
  try {
    const { reminderId } = req.params;
    const employeeId = req.user.id || req.user._id;

    const reminder = await Reminder.findById(reminderId);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    if (reminder.employeeId.toString() !== employeeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this reminder"
      });
    }

    // NOTE: Do NOT set lastTriggered here — that field is exclusively controlled
    // by the cron job. Setting it here would prevent the cron from sending the
    // admin FCM notification at due time (race condition fix).

    // 1. Add to notification history
    if (!reminder.notifications) {
      reminder.notifications = [];
    }

    reminder.notifications.push({
      triggeredAt: new Date(),
      acknowledged: true,
      acknowledgedAt: new Date(),
      action: 'viewed'
    });

    await reminder.save();

    console.log(`👁️ Reminder ${reminderId} marked as seen/viewed`);

    res.status(200).json({
      success: true,
      message: "Reminder marked as seen successfully",
      data: reminder
    });

  } catch (error) {
    console.error("Error marking reminder as seen:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark reminder as seen",
      error: error.message
    });
  }
};

// Legacy function for backward compatibility
// export const getReminders = async (req, res) => {
//   return getEmployeeReminders(req, res);
// };

export const getReminders = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const now = new Date();

    const reminders = await Reminder.find({
      employeeId,
      isActive: true,
      status: {
        $nin: ["completed", "dismissed"],
      },
      $or: [
        {
          isRepeating: false,
          reminderDateTime: { $gte: now },
        },
        {
          isRepeating: true,
          nextTrigger: { $gte: now },
        },
      ],
    }).sort({
      isRepeating: 1,
      reminderDateTime: 1,
      nextTrigger: 1,
    });

    return res.status(200).json({
      success: true,
      count: reminders.length,
      data: reminders,
    });
  } catch (error) {
    console.error("Error fetching reminders:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch reminders",
      error: error.message,
    });
  }
};

// Get reminders by manual inquiry ID
export const getRemindersByManualInquiry = async (req, res) => {
  try {
    const { manualInquiryId } = req.params;
    const employeeId = req.user.id || req.user._id;

    console.log('Getting reminders for manual inquiry:', { manualInquiryId, employeeId });

    // Validate manual inquiry exists
    const manualInquiry = await ManualInquiry.findById(manualInquiryId);
    if (!manualInquiry) {
      return res.status(404).json({
        success: false,
        message: "Manual inquiry not found"
      });
    }

    // Get all reminders for this manual inquiry
    const reminders = await Reminder.find({
      manualInquiryId,
      employeeId
    })
      .populate({
        path: 'employeeId',
        select: 'name email'
      })
      .populate({
        path: 'manualInquiryId',
        select: 'clientName contactNumber location s_No ClientCode ProjectCode productType caseStatus address source majorComments'
      })
      .populate({
        path: 'editHistory.editedBy',
        select: 'name email'
      })
      .sort({ reminderDateTime: 1 });

    res.status(200).json({
      success: true,
      message: "Reminders retrieved successfully",
      data: {
        manualInquiry,
        reminders,
        count: reminders.length
      }
    });

  } catch (error) {
    console.error("Error getting reminders by manual inquiry:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get reminders",
      error: error.message
    });
  }
};

/**
 * Schedule FCM notification for reminder
 * This sends push notification at scheduled time even when app is closed
 * POST /api/reminder/schedule-notification
 */
export const scheduleReminderNotification = async (req, res) => {
  try {
    const { reminderId, scheduledTime, title, message, fcmToken, data } = req.body;

    // Validate required fields
    if (!reminderId || !scheduledTime || !fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: reminderId, scheduledTime, fcmToken'
      });
    }

    // Calculate delay in milliseconds
    const scheduledDate = new Date(scheduledTime);
    const now = new Date();
    const delayMs = scheduledDate - now;

    // Validate scheduled time is in future
    if (delayMs <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled time must be in the future'
      });
    }

    console.log('📅 Scheduling reminder notification:', {
      reminderId,
      scheduledTime,
      delayMinutes: Math.round(delayMs / 60000)
    });

    // Use setTimeout for single-time scheduling (node-cron has timezone mismatch bug
    // when server is UTC and timezone: "Asia/Kolkata" is used with getHours())
    // 🛑 DISABLED: Redundant with centralized reminderCron.js
    /*
    setTimeout(async () => {
      try {
        await sendFCMNotification(fcmToken, title, message, data);
        console.log('✅ Scheduled reminder notification sent via FCM at due time');
      } catch (error) {
        console.error('❌ Failed to send scheduled reminder notification:', error);
      }
    }, delayMs);
    */
    console.log('ℹ️ Manual schedule-notification skipped: centrally handled by Cron');

    res.json({
      success: true,
      message: 'Reminder notification scheduled successfully',
      scheduledTime: scheduledDate.toISOString(),
      delayMinutes: Math.round(delayMs / 60000)
    });

  } catch (error) {
    console.error('❌ Error scheduling reminder notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule reminder notification',
      error: error.message
    });
  }
};

/**
 * Helper function to send FCM notification
 */
const sendFCMNotification = async (fcmToken, title, message, data) => {
  const admin = (await import('../config/firebase.js')).default;

  const fcmMessage = {
    token: fcmToken,
    // 🔥 DATA-ONLY: Removed top-level notification block to prevent Android auto-display.
    // This allows our custom Notifee handler and dedup logic to work correctly.
    data: {
      ...data,
      title: title || 'Reminder',
      body: message || 'You have a reminder',
      sentAt: new Date().toISOString(),
      click_action: "FLUTTER_NOTIFICATION_CLICK"
    },
    android: {
      priority: 'high',
      // Removed android notification block
    },
    apns: {
      headers: {
        'apns-priority': '10'
      },
      payload: {
        aps: {
          sound: 'default',
          'content-available': 1
        }
      }
    }
  };

  const response = await admin.messaging().send(fcmMessage);
  console.log('✅ FCM notification sent:', response);
  return response;
};
