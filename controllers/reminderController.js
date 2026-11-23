import Reminder from "../models/reminderSchema.js";
import LeadAssignment from "../models/leadAssignmentSchema.js";
import UserLeadAssignment from "../models/userLeadAssignmentSchema.js";
import ManualInquiry from "../models/manualInquirySchema.js";
import Employee from "../models/employeeSchema.js";
import Notification from "../models/notificationModel.js";
import Alert from "../models/alertSchema.js";
import USPEmployee from "../models/uspEmployeeSchema.js";
import { extractLatestComment, buildCommentThread, parseCommentThread, formatCommentDate } from "../utils/commentHelper.js";
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

    // Read placeReminder toggle (default true)
    const isPlaceReminder = req.body.placeReminder !== undefined
      ? (req.body.placeReminder === true || req.body.placeReminder === 'true')
      : true;

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
      placeReminder: isPlaceReminder,
      // Store client information for display in popup
      clientName: clientName?.trim(),
      phone: phone?.trim(),
      email: email?.trim(),
      location: location?.trim()
    });
    
    console.log(`📅 [CreateReminder] reminderDateTime received: ${reminderDateTime} → stored as: ${reminder.reminderDateTime.toISOString()} | placeReminder: ${isPlaceReminder}`);


    // Calculate next trigger for repeating reminders
    if (reminder.isRepeating) {
      reminder.calculateNextTrigger();
    }

    await reminder.save();

    // ℹ️ Note: Immediate notification to admin on reminder creation has been disabled as per user requirement.
    // Admin will only receive due reminder notifications via reminderCron when the scheduled time arrives.
    /*
    const employee = await Employee.findById(employeeId).select('name email fcmToken adminReminderPopupEnabled');
    if (isPlaceReminder && employee && employee.adminReminderPopupEnabled === true) {
      console.log(`📢 Admin notification enabled for employee: ${employee.name}`);
      ...
    }
    */

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
      location,
      status
    } = req.body;
    const editorId = req.user.id || req.user._id;

    // Helper: Resolve editor name and role (Admin or Employee)
    let editorName = (req.body.editorName || "").trim();
    let editorRole = (req.user?.role === "admin" || req.user?.role === "superadmin") ? "admin" : "employee";
    let editorModel = "Employee";

    try {
      const Admin = (await import("../models/adminAuthSchema.js")).default;
      const Employee = (await import("../models/employeeSchema.js")).default;

      if (editorRole === "admin") {
        editorModel = "Admin";
        if (!editorName) {
          const adminDoc = await Admin.findById(editorId).select("fullName name email");
          editorName = adminDoc?.fullName || adminDoc?.name || adminDoc?.email || "Admin";
        }
      } else {
        // Double-check if this ID is in Admin collection
        const adminDoc = await Admin.findById(editorId).select("fullName name email");
        if (adminDoc) {
          editorName = adminDoc.fullName || adminDoc.name || adminDoc.email || "Admin";
          editorRole = "admin";
          editorModel = "Admin";
        } else {
          const empDoc = await Employee.findById(editorId).select("name email");
          editorName = empDoc?.name || empDoc?.email || req.user?.fullName || req.user?.email || "Employee";
          editorRole = "employee";
          editorModel = "Employee";
        }
      }
    } catch (resolveErr) {
      console.warn("⚠️ [UpdateReminder] Error resolving editor info:", resolveErr.message);
      if (!editorName) editorName = req.user?.fullName || req.user?.email || "User";
    }

    const cleanId = String(reminderId).replace(/^(alert_|reminder_)/, '');
    let reminder = await Reminder.findById(cleanId);

    if (!reminder) {
      const alert = await Alert.findById(cleanId);
      if (alert) {
        const alertChanges = [];
        if (title !== undefined && title.trim() !== alert.title) {
          alertChanges.push(`Title changed from "${alert.title}" to "${title.trim()}"`);
          alert.title = title.trim();
        }
        const effectiveReason = comment !== undefined ? comment : (note !== undefined ? note : undefined);
        if (req.body.newComment || req.body.commentHistory || (effectiveReason !== undefined && effectiveReason.trim() !== '')) {
          if (!Array.isArray(alert.commentHistory)) alert.commentHistory = [];
          if (alert.commentHistory.length === 0 && alert.reason) {
            const parsed = parseCommentThread(alert.reason, alert.clientName || 'Employee', 'employee', alert.createdAt || new Date());
            alert.commentHistory = parsed.length > 0 ? parsed : [{
              text: alert.reason.trim(),
              authorName: alert.clientName || 'Employee',
              authorRole: 'employee',
              authorId: alert.assignedEmployeeId || alert.userId,
              createdAt: alert.createdAt || new Date(),
            }];
          }

          const trimmedNewComment = (req.body.newComment || "").trim();
          if (trimmedNewComment) {
            alert.commentHistory.push({
              text: trimmedNewComment,
              authorName: editorName,
              authorRole: editorRole,
              authorId: editorId,
              createdAt: new Date(),
            });
            alert.reason = buildCommentThread(alert.commentHistory);
            alertChanges.push(`New comment added: "${trimmedNewComment}"`);
          } else if (Array.isArray(req.body.commentHistory) && req.body.commentHistory.length > 0) {
            alert.commentHistory = req.body.commentHistory;
            alert.reason = buildCommentThread(alert.commentHistory);
            alertChanges.push(`Comment history updated`);
          } else if (effectiveReason !== undefined && effectiveReason.trim() !== '') {
            const cleanNew = effectiveReason.trim();
            if (cleanNew.includes('---')) {
              alert.reason = cleanNew;
              alert.commentHistory = parseCommentThread(cleanNew, editorName, editorRole, new Date());
              alertChanges.push(`Comment thread updated`);
            } else {
              const lastCommentText = alert.commentHistory.length > 0
                ? (alert.commentHistory[alert.commentHistory.length - 1].text || '').trim()
                : '';
              if (cleanNew !== lastCommentText) {
                alert.commentHistory.push({
                  text: cleanNew,
                  authorName: editorName,
                  authorRole: editorRole,
                  authorId: editorId,
                  createdAt: new Date(),
                });
                alert.reason = buildCommentThread(alert.commentHistory);
                alertChanges.push(`New comment added: "${cleanNew}"`);
              }
            }
          }
        }
        if (req.body.placeReminder !== undefined) {
          const isPlace = req.body.placeReminder === true || req.body.placeReminder === 'true';
          if (isPlace !== alert.placeReminder) {
            alertChanges.push(`Place reminder set to ${isPlace}`);
            alert.placeReminder = isPlace;
            alert.isActive = isPlace;
          }
        }
        if (isActive !== undefined) {
          const boolActive = isActive === true || isActive === 'true';
          if (boolActive !== alert.isActive) {
            alertChanges.push(`Active status set to ${boolActive}`);
            alert.isActive = boolActive;
          }
        }

        if (alertChanges.length > 0) {
          if (!alert.editHistory) alert.editHistory = [];
          alert.editHistory.push({
            changesSummary: alertChanges.join("; "),
            details: alertChanges,
            editedAt: new Date(),
            editorName: editorName,
            editorRole: editorRole,
            editedBy: editorId
          });
          alert.lastEditedByName = editorName;
          alert.lastEditedByRole = editorRole;
          alert.lastEditedAt = new Date();
          alert.lastEditSummary = alertChanges.join("; ");
        }

        await alert.save();
        return res.status(200).json({
          success: true,
          message: "Alert updated successfully",
          data: alert,
        });
      }

      const uspEmployee = await USPEmployee.findById(cleanId);
      if (uspEmployee) {
        if (title !== undefined && title.trim()) uspEmployee.reminderTitle = title.trim();
        if (comment !== undefined || note !== undefined) {
          const noteToAdd = extractLatestComment((comment || note || '').trim());
          if (noteToAdd) {
            const currentLatest = extractLatestComment(
              Array.isArray(uspEmployee.descriptionHistory) && uspEmployee.descriptionHistory.length > 0
                ? uspEmployee.descriptionHistory[uspEmployee.descriptionHistory.length - 1].text
                : (uspEmployee.description || '')
            );

            if (noteToAdd !== currentLatest) {
              const now = new Date();
              const timeStr = now.toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });
              const appendedEntry = `\n\n[Update ${timeStr} by ${editorName} (${editorRole})]:\n${noteToAdd}`;
              uspEmployee.description = uspEmployee.description
                ? `${uspEmployee.description.trim()}${appendedEntry}`
                : noteToAdd;

              if (!Array.isArray(uspEmployee.descriptionHistory)) {
                uspEmployee.descriptionHistory = [];
              }
              uspEmployee.descriptionHistory.push({
                text: noteToAdd,
                addedAt: new Date(),
                addedBy: `${editorName} (${editorRole})`,
              });
            }
          }
        }
        if (req.body.placeReminder !== undefined) {
          const isPlace = req.body.placeReminder === true || req.body.placeReminder === 'true';
          uspEmployee.isReminderActive = isPlace;
        }
        if (isActive !== undefined) {
          uspEmployee.isActive = isActive === true || isActive === 'true';
        }
        if (repeatType !== undefined) {
          uspEmployee.repeatType = repeatType;
          uspEmployee.scheduleType = repeatType === 'none' ? 'one_time' : 'recurring';
        }
        if (req.body.customRepeatMinutes) {
          uspEmployee.customDurationMinutes = Number(req.body.customRepeatMinutes) || 0;
        }
        if (reminderDateTime) {
          uspEmployee.scheduledDateTime = new Date(reminderDateTime);
          uspEmployee.scheduledDate = new Date(reminderDateTime);
        }
        uspEmployee.cronFired = false;
        uspEmployee.lastTriggered = null;
        await uspEmployee.save();

        return res.status(200).json({
          success: true,
          message: "USP Reminder updated successfully",
          data: uspEmployee,
        });
      }

      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    // Store old values for edit history
    const oldContent = {
      title: reminder.title || '',
      comment: reminder.comment || '',
      note: reminder.note || '',
      reminderDateTime: reminder.reminderDateTime,
      clientName: reminder.clientName || '',
      phone: reminder.phone || '',
      email: reminder.email || '',
      location: reminder.location || '',
      status: reminder.status || 'pending',
      isActive: reminder.isActive,
      placeReminder: reminder.placeReminder,
      repeatType: reminder.repeatType || 'none'
    };

    // Track specific changes made in this edit
    const changes = [];

    // 1. Update Title
    if (title !== undefined && title.trim() !== "" && title.trim() !== reminder.title) {
      changes.push(`Title: "${reminder.title || ''}" ➔ "${title.trim()}"`);
      reminder.title = title.trim();
    }

    // 2. Update Comment / Note with Threaded Comment History
    if (req.body.newComment || req.body.commentHistory || comment !== undefined || note !== undefined) {
      if (!Array.isArray(reminder.commentHistory)) {
        reminder.commentHistory = [];
      }
      if (reminder.commentHistory.length === 0 && (reminder.comment || reminder.note)) {
        const parsed = parseCommentThread(reminder.comment || reminder.note, reminder.clientName || 'Employee', 'employee', reminder.createdAt || new Date());
        reminder.commentHistory = parsed.length > 0 ? parsed : [{
          text: (reminder.comment || reminder.note).trim(),
          authorName: reminder.clientName || 'Employee',
          authorRole: 'employee',
          authorId: reminder.employeeId,
          createdAt: reminder.createdAt || new Date(),
        }];
      }

      const trimmedNewComment = (req.body.newComment || '').trim();
      const rawComment = comment !== undefined ? comment : (note !== undefined ? note : undefined);
      const cleanComment = rawComment !== undefined ? String(rawComment).trim() : '';

      if (trimmedNewComment) {
        reminder.commentHistory.push({
          text: trimmedNewComment,
          authorName: editorName,
          authorRole: editorRole,
          authorId: editorId,
          createdAt: new Date(),
        });
        const thread = buildCommentThread(reminder.commentHistory);
        reminder.comment = thread;
        reminder.note = thread;
        changes.push('New comment added: ' + trimmedNewComment);
      } else if (Array.isArray(req.body.commentHistory) && req.body.commentHistory.length > 0) {
        reminder.commentHistory = req.body.commentHistory;
        const thread = buildCommentThread(reminder.commentHistory);
        reminder.comment = thread;
        reminder.note = thread;
        changes.push('Comment history updated');
      } else if (cleanComment) {
        if (cleanComment.includes('---')) {
          reminder.comment = cleanComment;
          reminder.note = cleanComment;
          reminder.commentHistory = parseCommentThread(cleanComment, editorName, editorRole, new Date());
          changes.push('Comment thread updated');
        } else {
          const lastCommentText = reminder.commentHistory.length > 0
            ? (reminder.commentHistory[reminder.commentHistory.length - 1].text || '').trim()
            : '';
          if (cleanComment !== lastCommentText) {
            reminder.commentHistory.push({
              text: cleanComment,
              authorName: editorName,
              authorRole: editorRole,
              authorId: editorId,
              createdAt: new Date(),
            });
            const thread = buildCommentThread(reminder.commentHistory);
            reminder.comment = thread;
            reminder.note = thread;
            changes.push('New comment added: ' + cleanComment);
          }
        }
      }
    }

    // 3. Update Reminder Date & Time
    if (reminderDateTime !== undefined) {
      const newTime = new Date(reminderDateTime);
      if (!isNaN(newTime.getTime())) {
        const currentTimeMillis = reminder.reminderDateTime ? new Date(reminder.reminderDateTime).getTime() : 0;
        if (newTime.getTime() !== currentTimeMillis) {
          const oldTimeStr = reminder.reminderDateTime 
            ? new Date(reminder.reminderDateTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) 
            : "N/A";
          const newTimeStr = newTime.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
          changes.push(`Reminder Time: ${oldTimeStr} ➔ ${newTimeStr}`);
          reminder.reminderDateTime = newTime;

          // If time changed to future, reset status to pending so cron picks it up
          if (newTime > new Date()) {
            reminder.status = 'pending';
            reminder.cronFired = false;
            console.log(`🔄 [UpdateReminder] Time changed to future - status reset to pending`);
          }
        }
      }
    }
    
    // 4. Update Client Details
    if (clientName !== undefined && clientName.trim() !== (reminder.clientName || "")) {
      changes.push(`Client Name: "${reminder.clientName || ''}" ➔ "${clientName.trim()}"`);
      reminder.clientName = clientName.trim();
    }
    if (phone !== undefined && phone.trim() !== (reminder.phone || "")) {
      changes.push(`Phone: "${reminder.phone || ''}" ➔ "${phone.trim()}"`);
      reminder.phone = phone.trim();
    }
    if (email !== undefined && email.trim() !== (reminder.email || "")) {
      changes.push(`Email: "${reminder.email || ''}" ➔ "${email.trim()}"`);
      reminder.email = email.trim();
    }
    if (location !== undefined && location.trim() !== (reminder.location || "")) {
      changes.push(`Location: "${reminder.location || ''}" ➔ "${location.trim()}"`);
      reminder.location = location.trim();
    }

    // 5. Update Status
    if (status !== undefined && status !== reminder.status) {
      changes.push(`Status: "${reminder.status}" ➔ "${status}"`);
      reminder.status = status;
    }
    
    // 6. Update Repeat Settings
    if (isRepeating !== undefined && isRepeating !== reminder.isRepeating) {
      changes.push(`Repeat: ${reminder.isRepeating} ➔ ${isRepeating}`);
      reminder.isRepeating = isRepeating;
    }
    if (repeatType !== undefined && repeatType !== reminder.repeatType) {
      changes.push(`Repeat Type: "${reminder.repeatType || 'none'}" ➔ "${repeatType}"`);
      reminder.repeatType = repeatType;
      if (repeatType !== 'custom' && !String(repeatType).includes('min')) {
        reminder.customRepeatMinutes = 0;
      }
    }

    // 7. Update Active / Place Reminder
    if (isActive !== undefined && isActive !== reminder.isActive) {
      changes.push(`Active: ${reminder.isActive} ➔ ${isActive}`);
      reminder.isActive = isActive;
    }
    if (req.body.placeReminder !== undefined) {
      const isPlaceReminder = req.body.placeReminder === true || req.body.placeReminder === 'true';
      if (isPlaceReminder !== reminder.placeReminder) {
        changes.push(`Place Reminder: ${reminder.placeReminder} ➔ ${isPlaceReminder}`);
        reminder.placeReminder = isPlaceReminder;
        if (isPlaceReminder) {
          if (new Date(reminder.reminderDateTime) > new Date()) {
            reminder.status = 'pending';
            reminder.cronFired = false;
            reminder.isActive = true;
          }
        } else {
          reminder.isActive = false;
          reminder.status = 'inactive';
        }
      }
    }

    // 8. If any content changed, record in edit history and update tracking fields
    if (changes.length > 0) {
      if (!reminder.editHistory) {
        reminder.editHistory = [];
      }

      const editRecord = {
        oldContent: oldContent,
        newContent: {
          title: reminder.title,
          comment: reminder.comment,
          note: reminder.note,
          reminderDateTime: reminder.reminderDateTime,
          clientName: reminder.clientName,
          phone: reminder.phone,
          email: reminder.email,
          location: reminder.location,
          status: reminder.status,
          isActive: reminder.isActive,
          placeReminder: reminder.placeReminder,
          repeatType: reminder.repeatType
        },
        changesSummary: changes.join("; "),
        details: changes,
        editedAt: new Date(),
        editorName: editorName,
        editorRole: editorRole,
        editedBy: editorId,
        editorModel: editorModel
      };

      reminder.editHistory.push(editRecord);

      // Also set quick-access fields for latest editor
      reminder.lastEditedByName = editorName;
      reminder.lastEditedByRole = editorRole;
      reminder.lastEditedAt = editRecord.editedAt;
      reminder.lastEditSummary = editRecord.changesSummary;
      reminder.lastEditDetails = changes;

      // 🔥 IMPORTANT: Reset cronFired when content changes so updated data goes in next notification
      reminder.cronFired = false;
      console.log(`📝 [UpdateReminder] Edit recorded by ${editorRole} "${editorName}" (${editorId}) at ${editRecord.editedAt.toISOString()}: ${editRecord.changesSummary}`);
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

// Get single reminder by ID (with full details, edit history, employee info)
export const getReminderById = async (req, res) => {
  try {
    const { reminderId } = req.params;
    const cleanId = String(reminderId).replace(/^(alert_|reminder_)/, '');

    let reminder = await Reminder.findById(cleanId)
      .populate('employeeId', 'name email phone department')
      .populate('editHistory.editedBy', 'name email fullName');

    if (!reminder) {
      const alert = await Alert.findById(cleanId);
      if (alert) {
        return res.status(200).json({
          success: true,
          data: alert,
          reminder: alert
        });
      }

      const uspEmployee = await USPEmployee.findById(cleanId);
      if (uspEmployee) {
        return res.status(200).json({
          success: true,
          data: uspEmployee,
          reminder: uspEmployee
        });
      }

      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: reminder,
      reminder: reminder
    });
  } catch (error) {
    console.error("Error fetching reminder by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reminder",
      error: error.message
    });
  }
};




// Delete a reminder
export const deleteReminder = async (req, res) => {
  try {
    const { reminderId } = req.params;
    const employeeId = req.user.id || req.user._id;

    const cleanId = String(reminderId).replace(/^(alert_|reminder_)/, '');
    const reminder = await Reminder.findById(cleanId);

    if (!reminder) {
      const alert = await Alert.findById(cleanId);
      if (alert) {
        await Alert.findByIdAndDelete(cleanId);
        return res.status(200).json({
          success: true,
          message: "Alert deleted successfully"
        });
      }
      const uspEmployee = await USPEmployee.findById(cleanId);
      if (uspEmployee) {
        uspEmployee.isReminderActive = false;
        uspEmployee.cronFired = true;
        uspEmployee.scheduledDateTime = null;
        await uspEmployee.save();
        return res.status(200).json({
          success: true,
          message: "USP reminder deleted successfully"
        });
      }
      return res.status(404).json({
        success: false,
        message: "Reminder not found"
      });
    }

    const Admin = (await import('../models/adminAuthSchema.js')).default;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin' || (await Admin.exists({ _id: employeeId }));

    if (!isAdmin && reminder.employeeId?.toString() !== employeeId?.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this reminder"
      });
    }

    await Reminder.findByIdAndDelete(cleanId);

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

    const isPlaceReminder = req.body.placeReminder !== undefined
      ? (req.body.placeReminder === true || req.body.placeReminder === 'true')
      : true;

    // Create reminder without assignment (standalone reminder or with manual inquiry)
    const reminder = new Reminder({
      employeeId,
      title: `Follow up with ${name}`,
      comment: note || `Reminder to follow up with ${name}`,
      note: note || '',
      reminderDateTime: new Date(reminderTime),
      isRepeating: false,
      placeReminder: isPlaceReminder,
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

    // ℹ️ Note: Immediate notification to admin on reminder creation has been disabled as per user requirement.
    // Admin will only receive due reminder notifications via reminderCron when the scheduled time arrives.
    /*
    try {
      console.log(`[DEBUG] createReminderFromLead: Checking admin notification status for employee ${employeeId}`);
      ...
    } catch (notifErr) {}
    */

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

    if (req.body.placeReminder === false) {
      return res.status(200).json({
        success: true,
        message: 'Notification skipped because placeReminder is disabled'
      });
    }

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
