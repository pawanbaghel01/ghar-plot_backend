// import Alert from "../models/alertSchema.js";
// import { sendPushNotification } from "../utils/sendNotification.js";

// // Create a new alert
// export const createAlert = async (req, res) => {
//   try {
//     const { title, date, time, reason, repeatDaily, isActive } = req.body;
//     const userId = req.user.id; // From verifyToken middleware

//     // Validate required fields
//     if (!title || !date || !time || !reason) {
//       return res.status(400).json({
//         success: false,
//         message: "Title, date, time, and reason are required fields",
//       });
//     }

//     // Create new alert
//     const newAlert = new Alert({
//       userId,
//       title,
//       date: new Date(date),
//       time,
//       reason,
//       repeatDaily: repeatDaily || false,
//       isActive: isActive !== undefined ? isActive : true,
//     });

//     await newAlert.save();

//     res.status(201).json({
//       success: true,
//       message: "Alert created successfully",
//       data: newAlert,
//     });
//   } catch (error) {
//     console.error("Error creating alert:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to create alert",
//       error: error.message,
//     });
//   }
// };

// // Schedule notification for alert (with FCM support)
// export const scheduleNotification = async (req, res) => {
//   try {
//     const {
//       alertId,
//       title,
//       reason,
//       date,
//       time,
//       scheduledDateTime,
//       repeatDaily,
//       notificationType,
//       fcmToken
//     } = req.body;
//     const userId = req.user.id;

//     // Validate required fields
//     if (!reason) {
//       return res.status(400).json({
//         success: false,
//         message: "Reason is required"
//       });
//     }

//     if (!title) {
//       return res.status(400).json({
//         success: false,
//         message: "Title is required"
//       });
//     }

//     if (!scheduledDateTime && (!date || !time)) {
//       return res.status(400).json({
//         success: false,
//         message: "Either scheduledDateTime or both date and time are required"
//       });
//     }

//     let alertDate, alertTime;

//     // Parse scheduledDateTime if provided
//     if (scheduledDateTime) {
//       const scheduleDate = new Date(scheduledDateTime);
//       alertDate = scheduleDate.toISOString().split('T')[0]; // YYYY-MM-DD
//       alertTime = scheduleDate.toTimeString().substring(0, 5); // HH:MM
//     } else {
//       alertDate = date;
//       alertTime = time;
//     }

//     let alert;

//     // If alertId provided, update existing alert
//     if (alertId) {
//       alert = await Alert.findOne({ _id: alertId, userId });
      
//       if (!alert) {
//         return res.status(404).json({
//           success: false,
//           message: "Alert not found or unauthorized"
//         });
//       }

//       // Update alert
//       alert.title = title;
//       alert.date = new Date(alertDate);
//       alert.time = alertTime;
//       alert.reason = reason;
//       alert.repeatDaily = repeatDaily || false;
//       alert.isActive = true;

//       await alert.save();
//     } else {
//       // Create new alert
//       alert = new Alert({
//         userId,
//         title,
//         date: new Date(alertDate),
//         time: alertTime,
//         reason,
//         repeatDaily: repeatDaily || false
//       });

//       await alert.save();
//     }

//     // Send immediate notification if fcmToken provided
//     if (fcmToken) {
//       try {
//         await sendPushNotification(
//           fcmToken,
//           notificationType === 'alert' ? 'Alert Scheduled' : 'Notification Scheduled',
//           `Your alert "${reason}" has been scheduled for ${alertDate} at ${alertTime}`,
//           {
//             alertId: alert._id.toString(),
//             date: alertDate,
//             time: alertTime,
//             reason: reason,
//             type: notificationType || 'alert'
//           }
//         );
//         console.log('✅ Scheduled notification sent via FCM');
//       } catch (fcmError) {
//         console.error('FCM notification failed:', fcmError);
//         // Don't fail the request if notification fails
//       }
//     }

//     res.status(201).json({
//       success: true,
//       message: alertId ? "Alert notification rescheduled successfully" : "Alert notification scheduled successfully",
//       data: {
//         alert,
//         scheduledFor: {
//           date: alertDate,
//           time: alertTime,
//           scheduledDateTime: new Date(`${alertDate}T${alertTime}`).toISOString()
//         }
//       }
//     });

//   } catch (error) {
//     console.error("Error scheduling notification:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to schedule notification",
//       error: error.message
//     });
//   }
// };

// // Get all alerts for a user
// export const getAlerts = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { isActive, repeatDaily, startDate, endDate } = req.query;

//     // Build filter query
//     const filter = { userId };

//     if (isActive !== undefined) {
//       filter.isActive = isActive === "true";
//     }

//     if (repeatDaily !== undefined) {
//       filter.repeatDaily = repeatDaily === "true";
//     }

//     if (startDate || endDate) {
//       filter.date = {};
//       if (startDate) {
//         filter.date.$gte = new Date(startDate);
//       }
//       if (endDate) {
//         filter.date.$lte = new Date(endDate);
//       }
//     }

//     const alerts = await Alert.find(filter).sort({ date: 1, time: 1 });

//     res.status(200).json({
//       success: true,
//       count: alerts.length,
//       data: alerts,
//     });
//   } catch (error) {
//     console.error("Error fetching alerts:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch alerts",
//       error: error.message,
//     });
//   }
// };

// // Get a single alert by ID
// export const getAlertById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     const alert = await Alert.findOne({ _id: id, userId });

//     if (!alert) {
//       return res.status(404).json({
//         success: false,
//         message: "Alert not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: alert,
//     });
//   } catch (error) {
//     console.error("Error fetching alert:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch alert",
//       error: error.message,
//     });
//   }
// };

// // Edit/Update an alert
// export const editAlert = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;
//     const { date, time, reason, repeatDaily, isActive } = req.body;

//     // Find the alert
//     const alert = await Alert.findOne({ _id: id, userId });

//     if (!alert) {
//       return res.status(404).json({
//         success: false,
//         message: "Alert not found or unauthorized",
//       });
//     }

//     // Update fields if provided
//     if (date !== undefined) alert.date = new Date(date);
//     if (time !== undefined) alert.time = time;
//     if (reason !== undefined) alert.reason = reason;
//     if (repeatDaily !== undefined) alert.repeatDaily = repeatDaily;
//     if (isActive !== undefined) alert.isActive = isActive;

//     await alert.save();

//     res.status(200).json({
//       success: true,
//       message: "Alert updated successfully",
//       data: alert,
//     });
//   } catch (error) {
//     console.error("Error updating alert:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to update alert",
//       error: error.message,
//     });
//   }
// };

// // Delete an alert
// export const deleteAlert = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     const alert = await Alert.findOneAndDelete({ _id: id, userId });

//     if (!alert) {
//       return res.status(404).json({
//         success: false,
//         message: "Alert not found or unauthorized",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Alert deleted successfully",
//       data: alert,
//     });
//   } catch (error) {
//     console.error("Error deleting alert:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to delete alert",
//       error: error.message,
//     });
//   }
// };

// // Get alerts by specific date and time
// export const getAlertsByDateTime = async (req, res) => {
//   try {
//     const { date, time } = req.query;
//     const userId = req.user.id;

//     // Validate required parameters
//     if (!date || !time) {
//       return res.status(400).json({
//         success: false,
//         message: "Date and time are required parameters",
//       });
//     }

//     // Parse the date to get start and end of day
//     const targetDate = new Date(date);
//     const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
//     const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

//     // Find alerts matching the specific date and time
//     const alerts = await Alert.find({
//       userId,
//       isActive: true,
//       $or: [
//         {
//           // One-time alerts for the specific date and time
//           date: {
//             $gte: startOfDay,
//             $lte: endOfDay,
//           },
//           time: time,
//           repeatDaily: false,
//         },
//         {
//           // Daily repeating alerts with matching time
//           time: time,
//           repeatDaily: true,
//         },
//       ],
//     }).sort({ date: 1, time: 1 });

//     res.status(200).json({
//       success: true,
//       count: alerts.length,
//       data: alerts,
//     });
//   } catch (error) {
//     console.error("Error fetching alerts by date and time:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch alerts by date and time",
//       error: error.message,
//     });
//   }
// };

// // Get alerts that need to be triggered (for cron job or notification service)
// export const getTriggeredAlerts = async (req, res) => {
//   try {
//     const now = new Date();
//     const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
//     const currentTime = now.toTimeString().split(" ")[0].substring(0, 5); // HH:MM

//     // Find alerts for today or repeating alerts
//     const alerts = await Alert.find({
//       isActive: true,
//       $or: [
//         {
//           // One-time alerts for today
//           date: {
//             $gte: new Date(currentDate),
//             $lt: new Date(new Date(currentDate).getTime() + 24 * 60 * 60 * 1000),
//           },
//           repeatDaily: false,
//         },
//         {
//           // Repeating alerts
//           repeatDaily: true,
//         },
//       ],
//     }).populate("userId", "name email phone");

//     // Filter by time (should be triggered around current time)
//     const triggeredAlerts = alerts.filter((alert) => {
//       return alert.time <= currentTime;
//     });

//     res.status(200).json({
//       success: true,
//       count: triggeredAlerts.length,
//       data: triggeredAlerts,
//     });
//   } catch (error) {
//     console.error("Error fetching triggered alerts:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch triggered alerts",
//       error: error.message,
//     });
//   }
// };



import Alert from "../models/alertSchema.js";
import { sendPushNotification } from "../utils/sendNotification.js";
import Admin from "../models/adminAuthSchema.js";
import Employee from "../models/employeeSchema.js";

// Create a new alert
export const createAlert = async (req, res) => {
  try {
    // 🐛 DEBUG: Log exact payload received
    console.log('🐛 [CreateAlert] Full payload received:', JSON.stringify(req.body, null, 2));
    console.log('🐛 [CreateAlert] User ID:', req.user?.id);
    console.log('🐛 [CreateAlert] Current time:', new Date().toISOString());
    
    const { title, date, time, reason, repeatDaily, isActive, category, repeatFrequency, repeatMetadata, fcmToken: bodyFcmToken, scheduledDateTime: providedScheduledDateTime } = req.body;
    const userId = req.user.id; // From verifyToken middleware

    // Validate required fields
    if (!title || !date || !time || !reason) {
      return res.status(400).json({
        success: false,
        message: "Title, date, time, and reason are required fields",
      });
    }

    // 🔥 FIX: Strict duplicate prevention - same title + same user within 10 seconds
    const existingAlert = await Alert.findOne({
      userId,
      title: title,
      createdAt: { $gte: new Date(Date.now() - 10 * 1000) } // Within last 10 seconds
    });
    
    if (existingAlert) {
      console.log(`⚠️ [CreateAlert] STRICT DUPLICATE BLOCKED: "${title}" created within 10s by ${userId}. Existing: ${existingAlert._id} (${existingAlert.time})`);
      return res.status(409).json({
        success: false,
        message: "Alert already created. Please wait before creating another.",
        existingAlert: existingAlert._id
      });
    }

    // 🔥 FIX: Get fcmToken from request body OR from user's profile (fallback)
    let finalFcmToken = bodyFcmToken || null;
    if (!finalFcmToken) {
      // Try to get from Admin or Employee profile
      const admin = await Admin.findById(userId).select('fcmToken');
      if (admin && admin.fcmToken) {
        finalFcmToken = admin.fcmToken;
        console.log(`📱 [CreateAlert] Got fcmToken from Admin profile`);
      } else {
        const employee = await Employee.findById(userId).select('fcmToken');
        if (employee && employee.fcmToken) {
          finalFcmToken = employee.fcmToken;
          console.log(`📱 [CreateAlert] Got fcmToken from Employee profile`);
        }
      }
    }
    console.log(`📱 [CreateAlert] fcmToken: ${finalFcmToken ? 'exists' : 'null'}`);

    // 🔥 FIX: Calculate scheduledDateTime from date + time if not provided
    let calculatedScheduledDateTime = providedScheduledDateTime ? new Date(providedScheduledDateTime) : null;
    if (!calculatedScheduledDateTime && date && time) {
      // 🇮🇳 FIX: Handle IST timezone properly
      // If time looks like it's in IST, convert to UTC
      let finalDate, finalTime;
      
      if (typeof date === 'string' && date.includes('T')) {
        // Full ISO datetime received
        finalDate = new Date(date).toISOString().split('T')[0];
      } else {
        // Date only received
        finalDate = new Date(date).toISOString().split('T')[0];
      }
      
      finalTime = time;
      
      // Construct a Date object in system local time
      const [year, month, day] = finalDate.split('-').map(Number);
      const [hours, minutes] = finalTime.split(':').map(Number);
      calculatedScheduledDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
      console.log(`📅 [CreateAlert] date=${date}, time=${time} → Local/IST: ${calculatedScheduledDateTime.toString()}`);
    }

    // Create new alert
    const newAlert = new Alert({
      userId,
      title,
      date: new Date(date),
      time,
      reason,
      repeatDaily: repeatDaily || false,
      isActive: isActive !== undefined ? isActive : true,
      category: category || "alert",
      repeatFrequency: repeatFrequency || "none",
      repeatMetadata: repeatMetadata || null,
      scheduledDateTime: calculatedScheduledDateTime,  // 🔥 Now properly set
      fcmToken: finalFcmToken,  // 🔥 Now uses fallback from user profile
    });

    await newAlert.save();
    console.log(`✅ [CreateAlert] Alert saved: ${newAlert._id} | scheduledDateTime: ${newAlert.scheduledDateTime}`);

    res.status(201).json({
      success: true,
      message: "Alert created successfully",
      data: newAlert,
    });
  } catch (error) {
    console.error("Error creating alert:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create alert",
      error: error.message,
    });
  }
};

// Schedule notification for alert (with FCM support)
export const scheduleNotification = async (req, res) => {
  try {
    const {
      alertId,
      title,
      reason,
      date,
      time,
      scheduledDateTime,
      repeatDaily,
      notificationType,
      fcmToken
    } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Reason is required"
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required"
      });
    }

    if (!scheduledDateTime && (!date || !time)) {
      return res.status(400).json({
        success: false,
        message: "Either scheduledDateTime or both date and time are required"
      });
    }

    let alertDate, alertTime;

    // Parse scheduledDateTime if provided
    if (scheduledDateTime) {
      const scheduleDate = new Date(scheduledDateTime);
      alertDate = date || scheduleDate.toISOString().split('T')[0]; // YYYY-MM-DD
      alertTime = time || scheduleDate.toTimeString().substring(0, 5); // HH:MM
    } else {
      alertDate = date;
      alertTime = time;
    }

    let alert;

    // If alertId provided, update existing alert
    if (alertId) {
      alert = await Alert.findOne({ _id: alertId, userId });
      
      if (!alert) {
        return res.status(404).json({
          success: false,
          message: "Alert not found or unauthorized"
        });
      }

      // Update alert
      alert.title = title;
      alert.date = new Date(alertDate);
      alert.time = alertTime;
      alert.reason = reason;
      alert.repeatDaily = repeatDaily || false;
      alert.isActive = true;
      if (scheduledDateTime) alert.scheduledDateTime = new Date(scheduledDateTime);
      if (fcmToken) alert.fcmToken = fcmToken;

      await alert.save();
    } else {
      // 🔥 FIX: Don't blindly create new alert - first check if one was JUST created (within 30s)
      // This prevents duplicate when frontend calls both /api/alerts/ AND /api/alerts/schedule-notification
      const recentAlert = await Alert.findOne({
        userId,
        title,
        createdAt: { $gte: new Date(Date.now() - 30 * 1000) }
      }).sort({ createdAt: -1 });

      if (recentAlert) {
        // Use the recently created alert - just update scheduledDateTime and fcmToken if provided
        console.log(`⚠️ scheduleNotification: Found recently created alert ${recentAlert._id} for "${title}" - using it instead of creating duplicate`);
        alert = recentAlert;
        if (scheduledDateTime) alert.scheduledDateTime = new Date(scheduledDateTime);
        if (fcmToken) alert.fcmToken = fcmToken;
        if (alertDate) alert.date = new Date(alertDate);
        if (alertTime) alert.time = alertTime;
        await alert.save();
      } else {
        // No recent alert exists - safe to create new one
        alert = new Alert({
          userId,
          title,
          date: new Date(alertDate),
          time: alertTime,
          reason,
          repeatDaily: repeatDaily || false,
          scheduledDateTime: scheduledDateTime ? new Date(scheduledDateTime) : null,
          fcmToken: fcmToken || null
        });
        await alert.save();
      }
    }

    // Note: Immediate FCM notification removed — cron handles delivery at scheduledDateTime
    // Sending confirmation here caused duplicate notifications (cron fires later too)

    res.status(201).json({
      success: true,
      message: alertId ? "Alert notification rescheduled successfully" : "Alert notification scheduled successfully",
      data: {
        alert,
        scheduledFor: {
          date: alertDate,
          time: alertTime,
          scheduledDateTime: new Date(`${alertDate}T${alertTime}`).toISOString()
        }
      }
    });

  } catch (error) {
    console.error("Error scheduling notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to schedule notification",
      error: error.message
    });
  }
};

// Get all alerts for a user
// Helper: compute the next time an alert will fire
const computeNextScheduledAt = (alert) => {
  if (!alert.isActive) return null;

  const now = new Date();
  let next = alert.scheduledDateTime ? new Date(alert.scheduledDateTime) : null;

  if (!next || isNaN(next.getTime())) return null;

  // If scheduledDateTime is already in the future, use it directly
  if (next > now) return next.toISOString();

  // scheduledDateTime is past — compute next occurrence based on repeat setting
  if (alert.repeatDaily || alert.repeatFrequency === "daily") {
    // Advance by 1 day until future
    while (next <= now) {
      next = new Date(next.getTime() + 24 * 60 * 60 * 1000);
    }
    return next.toISOString();
  }

  if (alert.repeatFrequency === "hourly") {
    // Advance by 1 hour until future
    while (next <= now) {
      next = new Date(next.getTime() + 60 * 60 * 1000);
    }
    return next.toISOString();
  }

  // One-time alert that has already fired
  return null;
};

// export const getAlerts = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { isActive, repeatDaily, startDate, endDate } = req.query;

//     // Build filter query
//     const filter = { userId };

//     if (isActive !== undefined) {
//       filter.isActive = isActive === "true";
//     }

//     if (repeatDaily !== undefined) {
//       filter.repeatDaily = repeatDaily === "true";
//     }

//     if (startDate || endDate) {
//       filter.date = {};
//       if (startDate) {
//         filter.date.$gte = new Date(startDate);
//       }
//       if (endDate) {
//         filter.date.$lte = new Date(endDate);
//       }
//     }

//     const alerts = await Alert.find(filter).sort({ date: 1, time: 1 });

//     const data = alerts.map((alert) => ({
//       ...alert.toObject(),
//       nextScheduledAt: computeNextScheduledAt(alert),
//     }));

//     res.status(200).json({
//       success: true,
//       count: data.length,
//       data,
//     });
//   } catch (error) {
//     console.error("Error fetching alerts:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch alerts",
//       error: error.message,
//     });
//   }
// };

// export const getAlerts = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { isActive, repeatDaily, startDate, endDate } = req.query;

//     const filter = { userId };

//     if (isActive !== undefined) {
//       filter.isActive = isActive === "true";
//     }

//     if (repeatDaily !== undefined) {
//       filter.repeatDaily = repeatDaily === "true";
//     }

//     if (startDate || endDate) {
//       filter.date = {};

//       if (startDate) {
//         filter.date.$gte = new Date(startDate);
//       }

//       if (endDate) {
//         filter.date.$lte = new Date(endDate);
//       }
//     }

//     const alerts = await Alert.find(filter);

//     const data = alerts
//       .map((alert) => {
//         const alertObj = alert.toObject();

//         return {
//           ...alertObj,
//           nextScheduledAt: computeNextScheduledAt(alertObj),
//         };
//       })
//       .sort((a, b) => {
//         const aTime = a.nextScheduledAt
//           ? new Date(a.nextScheduledAt).getTime()
//           : Number.MAX_SAFE_INTEGER;

//         const bTime = b.nextScheduledAt
//           ? new Date(b.nextScheduledAt).getTime()
//           : Number.MAX_SAFE_INTEGER;

//         return aTime - bTime;
//       });

//     return res.status(200).json({
//       success: true,
//       count: data.length,
//       data,
//     });
//   } catch (error) {
//     console.error("Error fetching alerts:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch alerts",
//       error: error.message,
//     });
//   }
// };

export const getAlerts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { isActive, repeatDaily, startDate, endDate } = req.query;

    const filter = { userId };

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (repeatDaily !== undefined) {
      filter.repeatDaily = repeatDaily === "true";
    }

    if (startDate || endDate) {
      filter.date = {};

      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }

      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }

    const alerts = await Alert.find(filter).lean();

    const now = new Date();

    const data = alerts
      .map((alert) => {
        let nextScheduledAt = null;

        if (alert.isActive) {
          // Build next occurrence using date + time in IST timezone
          // Parse time parts
          let hours = 0;
          let minutes = 0;
          if (alert.time) {
            const parts = alert.time.split(":").map(Number);
            hours = parts[0] || 0;
            minutes = parts[1] || 0;
          }

          // Build date in local IST
          const alertDateObj = new Date(alert.date);
          let next = new Date(
            alertDateObj.getFullYear(),
            alertDateObj.getMonth(),
            alertDateObj.getDate(),
            hours,
            minutes,
            0,
            0
          );

          if (next <= now) {
            if (alert.repeatFrequency === "daily" || alert.repeatDaily) {
              while (next <= now) {
                next.setDate(next.getDate() + 1);
              }
            } else if (alert.repeatFrequency === "hourly") {
              while (next <= now) {
                next.setHours(next.getHours() + 1);
              }
            } else {
              next = null;
            }
          }

          nextScheduledAt = next ? next.toISOString() : null;
        }

        return {
          ...alert,
          nextScheduledAt,
        };
      })
      .sort((a, b) => {
        if (!a.nextScheduledAt && !b.nextScheduledAt) return 0;
        if (!a.nextScheduledAt) return 1;
        if (!b.nextScheduledAt) return -1;

        return (
          new Date(a.nextScheduledAt).getTime() -
          new Date(b.nextScheduledAt).getTime()
        );
      });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch alerts",
      error: error.message,
    });
  }
};
// Get a single alert by ID
export const getAlertById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const alert = await Alert.findOne({ _id: id, userId });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    res.status(200).json({
      success: true,
      data: alert,
    });
  } catch (error) {
    console.error("Error fetching alert:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch alert",
      error: error.message,
    });
  }
};

// Edit/Update an alert
// export const editAlert = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;
//     const { date, time, reason, repeatDaily, isActive, category, repeatFrequency, repeatMetadata } = req.body;

//     // Find the alert
//     const alert = await Alert.findOne({ _id: id, userId });

//     if (!alert) {
//       return res.status(404).json({
//         success: false,
//         message: "Alert not found or unauthorized",
//       });
//     }

//     // Update fields if provided
//     if (date !== undefined) alert.date = new Date(date);
//     if (time !== undefined) alert.time = time;
//     if (reason !== undefined) alert.reason = reason;
//     if (repeatDaily !== undefined) alert.repeatDaily = repeatDaily;
//     if (isActive !== undefined) alert.isActive = isActive;
//     if (category !== undefined) alert.category = category;
//     if (repeatFrequency !== undefined) alert.repeatFrequency = repeatFrequency;
//     if (repeatMetadata !== undefined) alert.repeatMetadata = repeatMetadata;

//     await alert.save();

//     res.status(200).json({
//       success: true,
//       message: "Alert updated successfully",
//       data: alert,
//     });
//   } catch (error) {
//     console.error("Error updating alert:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to update alert",
//       error: error.message,
//     });
//   }
// };

// export const editAlert = async (req, res) => {
//   console.log("========== EDIT ALERT API HIT ==========");
//   console.log("Params:", req.params);
//   console.log("Body:", req.body);
//   console.log("User:", req.user);

//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     const {
//       date,
//       time,
//       reason,
//       repeatDaily,
//       isActive,
//       category,
//       repeatFrequency,
//       repeatMetadata,
//     } = req.body;

//     console.log("Searching alert with ID:", id);
//     console.log("Logged in User ID:", userId);

//     // Find alert
//     const alert = await Alert.findOne({ _id: id, userId });

//     console.log("Alert Found:", alert);

//     if (!alert) {
//       console.log("Alert not found or unauthorized");

//       return res.status(404).json({
//         success: false,
//         message: "Alert not found or unauthorized",
//       });
//     }

//     // Update fields
//     if (date !== undefined) {
//       console.log("Updating date:", date);
//       alert.date = new Date(date);
//     }

//     if (time !== undefined) {
//       console.log("Updating time:", time);
//       alert.time = time;
//     }

//     if (reason !== undefined) {
//       console.log("Updating reason:", reason);
//       alert.reason = reason;
//     }

//     if (repeatDaily !== undefined) {
//       console.log("Updating repeatDaily:", repeatDaily);
//       alert.repeatDaily = repeatDaily;
//     }

//     if (isActive !== undefined) {
//       console.log("Updating isActive:", isActive);
//       alert.isActive = isActive;
//     }

//     if (category !== undefined) {
//       console.log("Updating category:", category);
//       alert.category = category;
//     }

//     if (repeatFrequency !== undefined) {
//       console.log("Updating repeatFrequency:", repeatFrequency);
//       alert.repeatFrequency = repeatFrequency;
//     }

//     if (repeatMetadata !== undefined) {
//       console.log("Updating repeatMetadata:", repeatMetadata);
//       alert.repeatMetadata = repeatMetadata;
//     }

//     console.log("Saving updated alert...");

//     await alert.save();

//     console.log("Alert updated successfully");

//     res.status(200).json({
//       success: true,
//       message: "Alert updated successfully",
//       data: alert,
//     });

//   } catch (error) {
//     console.error("========== ERROR IN EDIT ALERT ==========");
//     console.error("Error Message:", error.message);
//     console.error("Full Error:", error);
//     console.error("Stack:", error.stack);

//     res.status(500).json({
//       success: false,
//       message: "Failed to update alert",
//       error: error.message,
//     });
//   }
// };

export const editAlert = async (req, res) => {
  console.log("========== EDIT ALERT API HIT ==========");

  try {
    const { id } = req.params;
    const userId = req.user.id;

    const {
      title,
      date,
      time,
      reason,
      repeatDaily,
      isActive,
      category,
      repeatFrequency,
      repeatMetadata,
      fcmToken: bodyFcmToken,
      scheduledDateTime: providedScheduledDateTime,
    } = req.body;

    const alert = await Alert.findOne({ _id: id, userId });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found or unauthorized",
      });
    }

    // Update basic fields
    if (title !== undefined) {
      alert.title = title;
    }

    if (date !== undefined) {
      alert.date = new Date(date);
    }

    if (time !== undefined) {
      alert.time = time;
    }

    if (reason !== undefined) {
      alert.reason = reason;
    }

    if (repeatDaily !== undefined) {
      alert.repeatDaily = repeatDaily;
    }

    if (isActive !== undefined) {
      alert.isActive = isActive;
    }

    if (category !== undefined) {
      alert.category = category;
    }

    if (repeatFrequency !== undefined) {
      alert.repeatFrequency = repeatFrequency;
    }

    if (repeatMetadata !== undefined) {
      alert.repeatMetadata = repeatMetadata;
    }

    // 🔥 Update FCM Token
    let finalFcmToken = bodyFcmToken;

    if (bodyFcmToken !== undefined) {
      alert.fcmToken = bodyFcmToken;
    } else {
      const admin = await Admin.findById(userId).select("fcmToken");

      if (admin?.fcmToken) {
        finalFcmToken = admin.fcmToken;
      } else {
        const employee = await Employee.findById(userId).select("fcmToken");

        if (employee?.fcmToken) {
          finalFcmToken = employee.fcmToken;
        }
      }

      if (finalFcmToken) {
        alert.fcmToken = finalFcmToken;
      }
    }

    // 🔥 Recalculate scheduledDateTime like createAlert
    let calculatedScheduledDateTime =
      providedScheduledDateTime
        ? new Date(providedScheduledDateTime)
        : null;

    if (!calculatedScheduledDateTime) {
      const finalDate =
        date !== undefined
          ? new Date(date).toISOString().split("T")[0]
          : new Date(alert.date).toISOString().split("T")[0];

      const finalTime =
        time !== undefined
          ? time
          : alert.time;

      // Construct a Date object in system local time, then convert to Date object
      const [year, month, day] = finalDate.split('-').map(Number);
      const [hours, minutes] = finalTime.split(':').map(Number);
      // Construct local time Date object, then set as scheduledDateTime
      calculatedScheduledDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
    }

    alert.scheduledDateTime = calculatedScheduledDateTime;

    console.log(
      `📅 Updated scheduledDateTime: ${alert.scheduledDateTime}`
    );

    await alert.save();

    res.status(200).json({
      success: true,
      message: "Alert updated successfully",
      data: alert,
    });

  } catch (error) {
    console.error("========== ERROR IN EDIT ALERT ==========");
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to update alert",
      error: error.message,
    });
  }
};

// Delete an alert
export const deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const alert = await Alert.findOneAndDelete({ _id: id, userId });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found or unauthorized",
      });
    }

    res.status(200).json({
      success: true,
      message: "Alert deleted successfully",
      data: alert,
    });
  } catch (error) {
    console.error("Error deleting alert:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete alert",
      error: error.message,
    });
  }
};

// Get alerts by specific date and time
export const getAlertsByDateTime = async (req, res) => {
  try {
    const { date, time } = req.query;
    const userId = req.user.id;

    // Validate required parameters
    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: "Date and time are required parameters",
      });
    }

    // Parse the date to get start and end of day
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Find alerts matching the specific date and time
    const alerts = await Alert.find({
      userId,
      isActive: true,
      $or: [
        {
          // One-time alerts for the specific date and time
          date: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
          time: time,
          repeatDaily: false,
        },
        {
          // Daily repeating alerts with matching time
          time: time,
          repeatDaily: true,
        },
      ],
    }).sort({ date: 1, time: 1 });

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    console.error("Error fetching alerts by date and time:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch alerts by date and time",
      error: error.message,
    });
  }
};

// Get alerts that need to be triggered (for cron job or notification service)
export const getTriggeredAlerts = async (req, res) => {
  try {
    const now = new Date();
    const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(" ")[0].substring(0, 5); // HH:MM

    // Find alerts for today or repeating alerts
    const alerts = await Alert.find({
      isActive: true,
      $or: [
        {
          // One-time alerts for today
          date: {
            $gte: new Date(currentDate),
            $lt: new Date(new Date(currentDate).getTime() + 24 * 60 * 60 * 1000),
          },
          repeatDaily: false,
        },
        {
          // Repeating alerts
          repeatDaily: true,
        },
      ],
    }).populate("userId", "name email phone");

    // Filter by time (should be triggered around current time)
    const triggeredAlerts = alerts.filter((alert) => {
      return alert.time <= currentTime;
    });

    res.status(200).json({
      success: true,
      count: triggeredAlerts.length,
      data: triggeredAlerts,
    });
  } catch (error) {
    console.error("Error fetching triggered alerts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch triggered alerts",
      error: error.message,
    });
  }
};


// Delete all alerts for a user
// export const deleteAllAlerts = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const result = await Alert.deleteMany({ userId });

//     res.status(200).json({
//       success: true,
//       message: "All alerts deleted successfully",
//       deletedCount: result.deletedCount,
//     });
//   } catch (error) {
//     console.error("Error deleting all alerts:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to delete all alerts",
//       error: error.message,
//     });
//   }
// };


// Delete alerts by category (alert/reminder)


export const deleteAlertsByCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.query; // 👈 from query

    // Validate category
    if (!category || !["alert", "reminder"].includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Valid category (alert/reminder) is required",
      });
    }

    const result = await Alert.deleteMany({
      userId,
      category,
    });

    res.status(200).json({
      success: true,
      message: `All ${category} deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting alerts by category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete alerts",
      error: error.message,
    });
  }
};



// Delete multiple alerts by IDs
export const deleteMultipleAlerts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { alertIds } = req.body;

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "alertIds array is required",
      });
    }

    const result = await Alert.deleteMany({
      _id: { $in: alertIds },
      userId,
    });

    res.status(200).json({
      success: true,
      message: "Selected alerts deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting multiple alerts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete alerts",
      error: error.message,
    });
  }
};
