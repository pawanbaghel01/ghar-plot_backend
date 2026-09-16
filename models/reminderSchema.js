// import mongoose from "mongoose";

// const reminderSchema = new mongoose.Schema(
//   {
//     // Reference to either enquiry or user lead assignment (optional for lead-based reminders)
//     assignmentId: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: false,
//       refPath: 'assignmentType'
//     },
//     assignmentType: {
//       type: String,
//       required: false,
//       enum: ['LeadAssignment', 'UserLeadAssignment', 'Lead', 'ManualInquiry']
//     },

//     // Reference to manual inquiry (when reminder is set from manual inquiry)
//     manualInquiryId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'ManualInquiry',
//       required: false
//     },

//     // Employee who created and is assigned to this reminder
//     employeeId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Employee',
//       required: true
//     },

//     // Reminder details
//     title: {
//       type: String,
//       required: true,
//       trim: true,
//       maxlength: 100
//     },
//     comment: {
//       type: String,
//       required: true,
//       // Allow HTML for rich text (color highlighting)
//     },
//     note: {
//       type: String,
//       trim: true,
//       maxlength: 500
//     },

//     // Edit history to track changes
//     editHistory: [{
//       oldContent: {
//         title: String,
//         comment: String,
//         reminderDateTime: Date,
//         note: String
//       },
//       newContent: {
//         title: String,
//         comment: String,
//         reminderDateTime: Date,
//         note: String
//       },
//       editedAt: {
//         type: Date,
//         default: Date.now
//       },
//       editedBy: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Employee'
//       }
//     }],

//     // Client information (for display in popups)
//     clientName: {
//       type: String,
//       trim: true
//     },
//     phone: {
//       type: String,
//       trim: true
//     },
//     email: {
//       type: String,
//       trim: true
//     },
//     location: {
//       type: String,
//       trim: true
//     },

//     // Scheduling
//     reminderDateTime: {
//       type: Date,
//       required: true
//     },
//     timezone: {
//       type: String,
//       default: 'UTC'
//     },

//     // Repeat settings
//     isRepeating: {
//       type: Boolean,
//       default: false
//     },
//     repeatType: {
//       type: String,
//       enum: ['daily', 'weekly', 'monthly'],
//       default: 'daily'
//     },
//     isActive: {
//       type: Boolean,
//       default: true
//     },

//     // Status tracking
//     status: {
//       type: String,
//       enum: ['pending', 'completed', 'snoozed', 'dismissed'],
//       default: 'pending'
//     },

//     // Completion details
//     completedAt: Date,
//     completionResponse: {
//       type: String,
//       trim: true,
//       maxlength: 1000
//     },
//     responseWordCount: {
//       type: Number,
//       default: 0
//     },
//     responseColor: {
//       type: String,
//       enum: ['red', 'yellow', 'green'],
//       default: 'red'
//     },

//     // Snooze functionality
//     snoozedUntil: Date,
//     snoozeCount: {
//       type: Number,
//       default: 0
//     },

//     // Tracking
//     lastTriggered: Date,
//     nextTrigger: Date,
//     // 🔒 Set to true ONLY by the cron after successfully sending admin+employee FCM
//     // This is the authoritative guard against double-triggering (immune to race conditions)
//     cronFired: {
//       type: Boolean,
//       default: false
//     },
//     triggerCount: {
//       type: Number,
//       default: 0
//     },

//     // Notification history
//     notifications: [{
//       triggeredAt: {
//         type: Date,
//         default: Date.now
//       },
//       acknowledged: {
//         type: Boolean,
//         default: false
//       },
//       acknowledgedAt: Date,
//       action: {
//         type: String,
//         enum: ['viewed', 'completed', 'snoozed', 'dismissed']
//       }
//     }]
//   },
//   {
//     timestamps: true,
//     indexes: [
//       { employeeId: 1, status: 1 },
//       { reminderDateTime: 1, isActive: 1 },
//       { nextTrigger: 1, isActive: 1 },
//       { assignmentId: 1, assignmentType: 1 }
//     ]
//   }
// );

// // Pre-save middleware to calculate response metrics
// reminderSchema.pre('save', function (next) {
//   if (this.completionResponse && this.isModified('completionResponse')) {
//     const wordCount = this.completionResponse.trim().split(/\s+/).filter(word => word.length > 0).length;
//     this.responseWordCount = wordCount;

//     // Set color based on word count
//     if (wordCount < 10) {
//       this.responseColor = 'red';
//     } else if (wordCount >= 10 && wordCount <= 20) {
//       this.responseColor = 'yellow';
//     } else {
//       this.responseColor = 'green';
//     }
//   }

//   // Set next trigger for repeating reminders if not set or timing changed
//   if (this.isRepeating && this.isActive && this.status === 'pending') {
//     if (!this.nextTrigger || this.isModified('reminderDateTime')) {
//       this.nextTrigger = new Date(this.reminderDateTime);
//     }
//   }

//   // 🔄 AUTHORITATIVE RESET: If timing fields or status are modified to a "due" state, 
//   // we MUST reset cronFired so the CRON job handles the new timing.
//   if (this.isModified('reminderDateTime') ||
//     this.isModified('snoozedUntil') ||
//     this.isModified('nextTrigger') ||
//     (this.isModified('status') && (this.status === 'pending' || this.status === 'snoozed')) ||
//     (this.isModified('isActive') && this.isActive === true)) {
//     this.cronFired = false;
//   }

//   next();
// });

// // Method to calculate next trigger time for repeating reminders
// reminderSchema.methods.calculateNextTrigger = function () {
//   if (!this.isRepeating || !this.isActive) {
//     this.nextTrigger = null;
//     return;
//   }

//   const now = new Date();
//   let nextTrigger = new Date(this.reminderDateTime);

//   switch (this.repeatType) {
//     case 'daily':
//       while (nextTrigger <= now) {
//         nextTrigger.setDate(nextTrigger.getDate() + 1);
//       }
//       break;
//     case 'weekly':
//       while (nextTrigger <= now) {
//         nextTrigger.setDate(nextTrigger.getDate() + 7);
//       }
//       break;
//     case 'monthly':
//       while (nextTrigger <= now) {
//         nextTrigger.setMonth(nextTrigger.getMonth() + 1);
//       }
//       break;
//   }

//   this.nextTrigger = nextTrigger;
// };

// // Method to complete reminder
// reminderSchema.methods.completeReminder = function (response) {
//   this.status = 'completed';
//   this.completedAt = new Date();
//   this.completionResponse = response;

//   // If it's a repeating reminder, calculate next trigger
//   if (this.isRepeating && this.isActive) {
//     this.calculateNextTrigger();
//     this.status = 'pending'; // Reset to pending for next occurrence
//   }

//   return this.save();
// };

// // Method to snooze reminder
// reminderSchema.methods.snoozeReminder = function (snoozeMinutes = 15) {
//   this.status = 'snoozed';
//   this.snoozedUntil = new Date(Date.now() + (snoozeMinutes * 60 * 1000));
//   this.snoozeCount += 1;

//   return this.save();
// };

// // Method to dismiss reminder
// reminderSchema.methods.dismissReminder = function () {
//   if (this.isRepeating) {
//     this.isActive = false;
//   } else {
//     this.status = 'dismissed';
//   }

//   return this.save();
// };

// // Static method to get due reminders
// reminderSchema.statics.getDueReminders = async function (employeeId) {
//   const now = new Date();

//   const reminders = await this.find({
//     employeeId,
//     isActive: true,
//     status: { $nin: ['completed', 'dismissed'] }, // Exclude completed and dismissed reminders
//     $or: [
//       {
//         status: 'pending',
//         isRepeating: { $ne: true },
//         reminderDateTime: { $lte: now }
//       },
//       {
//         status: 'snoozed',
//         snoozedUntil: { $lte: now }
//       },
//       {
//         isRepeating: true,
//         nextTrigger: { $lte: now }
//       }
//     ]
//   }).select('+clientName +phone +email +location +comment +title +note');

//   // Manually populate only for reminders that have assignmentId or manualInquiryId
//   for (const reminder of reminders) {
//     // Populate manual inquiry if present
//     if (reminder.manualInquiryId) {
//       try {
//         await reminder.populate({
//           path: 'manualInquiryId',
//           select: 'clientName contactNumber location s_No ClientCode ProjectCode productType caseStatus'
//         });
//       } catch (error) {
//         console.warn('Failed to populate manual inquiry for reminder:', reminder._id, error.message);
//       }
//     }

//     // Populate assignment if present
//     if (reminder.assignmentId && reminder.assignmentType && reminder.assignmentType !== 'Lead') {
//       try {
//         await reminder.populate({
//           path: 'assignmentId',
//           select: 'userId inquiryId createdAt status',
//           populate: {
//             path: 'userId',
//             select: 'fullName phone email city state street pinCode'
//           }
//         });
//       } catch (error) {
//         console.warn('Failed to populate assignment for reminder:', reminder._id, error.message);
//         // Continue without population for this reminder
//       }
//     }
//   }

//   return reminders;
// };

// export default mongoose.models.Reminder || mongoose.model("Reminder", reminderSchema);

import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
  {
    // Reference to either enquiry or user lead assignment (optional for lead-based reminders)
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      refPath: 'assignmentType'
    },
    assignmentType: {
      type: String,
      required: false,
      enum: ['LeadAssignment', 'UserLeadAssignment', 'Lead', 'ManualInquiry']
    },

    // Reference to manual inquiry (when reminder is set from manual inquiry)
    manualInquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ManualInquiry',
      required: false
    },

    // Employee who created and is assigned to this reminder
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },

    // Reminder details
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    comment: {
      type: String,
      required: true,
      // Allow HTML for rich text (color highlighting)
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500
    },

    // Edit history to track changes
    editHistory: [{
      oldContent: {
        title: String,
        comment: String,
        reminderDateTime: Date,
        note: String
      },
      newContent: {
        title: String,
        comment: String,
        reminderDateTime: Date,
        note: String
      },
      editedAt: {
        type: Date,
        default: Date.now
      },
      editedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
      }
    }],

    // Client information (for display in popups)
    clientName: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },

    // Scheduling
    reminderDateTime: {
      type: Date,
      required: true
    },
    timezone: {
      type: String,
      default: 'UTC'
    },

    // Repeat settings
    isRepeating: {
      type: Boolean,
      default: false
    },
    repeatType: {
      type: String,
      // enum: ['daily', 'weekly', 'monthly', 'custom'], // Commented to allow '1 min' string format too
      default: 'daily'
    },
    customRepeatMinutes: {
      type: Number, // Jo bhi custom minutes aap API se bhejenge (e.g. 5, 10, 15) wo yahan store hoga
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },

    // Status tracking
    status: {
      type: String,
      enum: ['pending', 'completed', 'snoozed', 'dismissed'],
      default: 'pending'
    },

    // Completion details
    completedAt: Date,
    completionResponse: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    responseWordCount: {
      type: Number,
      default: 0
    },
    responseColor: {
      type: String,
      enum: ['red', 'yellow', 'green'],
      default: 'red'
    },

    // Snooze functionality
    snoozedUntil: Date,
    snoozeCount: {
      type: Number,
      default: 0
    },

    // Tracking
    lastTriggered: Date,
    nextTrigger: Date,
    // 🔒 Set to true ONLY by the cron after successfully sending admin+employee FCM
    // This is the authoritative guard against double-triggering (immune to race conditions)
    cronFired: {
      type: Boolean,
      default: false
    },
    triggerCount: {
      type: Number,
      default: 0
    },

    // Notification history
    notifications: [{
      triggeredAt: {
        type: Date,
        default: Date.now
      },
      acknowledged: {
        type: Boolean,
        default: false
      },
      acknowledgedAt: Date,
      action: {
        type: String,
        enum: ['viewed', 'completed', 'snoozed', 'dismissed']
      }
    }]
  },
  {
    timestamps: true,
    indexes: [
      { employeeId: 1, status: 1 },
      { reminderDateTime: 1, isActive: 1 },
      { nextTrigger: 1, isActive: 1 },
      { assignmentId: 1, assignmentType: 1 }
    ]
  }
);

// Pre-save middleware to calculate response metrics
reminderSchema.pre('save', function (next) {
  if (this.completionResponse && this.isModified('completionResponse')) {
    const wordCount = this.completionResponse.trim().split(/\s+/).filter(word => word.length > 0).length;
    this.responseWordCount = wordCount;

    // Set color based on word count
    if (wordCount < 10) {
      this.responseColor = 'red';
    } else if (wordCount >= 10 && wordCount <= 20) {
      this.responseColor = 'yellow';
    } else {
      this.responseColor = 'green';
    }
  }

  // Set next trigger for repeating reminders if not set or timing changed
  if (this.isRepeating && this.isActive && this.status === 'pending') {
    if (!this.nextTrigger || this.isModified('reminderDateTime')) {
      this.nextTrigger = new Date(this.reminderDateTime);
    }
  }

  // 🔄 AUTHORITATIVE RESET: If timing fields or status are modified to a "due" state,
  // reset cronFired so the cron picks it up again.
  // ⚠️ IMPORTANT GUARD: Do NOT reset cronFired if the cron itself is explicitly
  // setting it to true in this same save operation. Without this guard, the pre-save
  // hook would override cronFired=true (set by the cron), causing the reminder to
  // re-fire on every subsequent cron tick (every 30 seconds = infinite notifications).
  if (!this.isModified('cronFired')) {
    if (this.isModified('reminderDateTime') ||
      this.isModified('snoozedUntil') ||
      this.isModified('nextTrigger') ||
      (this.isModified('status') && (this.status === 'pending' || this.status === 'snoozed')) ||
      (this.isModified('isActive') && this.isActive === true)) {
      this.cronFired = false;
    }
  }

  next();
});

// Method to calculate next trigger time for repeating reminders
reminderSchema.methods.calculateNextTrigger = function () {
  if (!this.isRepeating || !this.isActive) {
    this.nextTrigger = null;
    return;
  }

  const now = new Date();
  let nextTrigger = new Date(this.reminderDateTime);

  switch (this.repeatType) {
    case 'daily':
      while (nextTrigger <= now) {
        nextTrigger.setDate(nextTrigger.getDate() + 1);
      }
      break;
    case 'weekly':
      while (nextTrigger <= now) {
        nextTrigger.setDate(nextTrigger.getDate() + 7);
      }
      break;
    case 'monthly':
      while (nextTrigger <= now) {
        nextTrigger.setMonth(nextTrigger.getMonth() + 1);
      }
      break;
  }

  this.nextTrigger = nextTrigger;
};

// Method to complete reminder
reminderSchema.methods.completeReminder = function (response) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.completionResponse = response;

  // If it's a repeating reminder, calculate next trigger
  if (this.isRepeating && this.isActive) {
    this.calculateNextTrigger();
    this.status = 'pending'; // Reset to pending for next occurrence
  }

  return this.save();
};

// Method to snooze reminder
reminderSchema.methods.snoozeReminder = function (snoozeMinutes = 15) {
  this.status = 'snoozed';
  this.snoozedUntil = new Date(Date.now() + (snoozeMinutes * 60 * 1000));
  this.snoozeCount += 1;

  return this.save();
};

// Method to dismiss reminder
reminderSchema.methods.dismissReminder = function () {
  if (this.isRepeating) {
    this.isActive = false;
  } else {
    this.status = 'dismissed';
  }

  return this.save();
};

// Static method to get due reminders
reminderSchema.statics.getDueReminders = async function (employeeId) {
  const now = new Date();

  const reminders = await this.find({
    employeeId,
    isActive: true,
    status: { $nin: ['completed', 'dismissed'] }, // Exclude completed and dismissed reminders
    $or: [
      {
        status: 'pending',
        isRepeating: { $ne: true },
        reminderDateTime: { $lte: now }
      },
      {
        status: 'snoozed',
        snoozedUntil: { $lte: now }
      },
      {
        isRepeating: true,
        nextTrigger: { $lte: now }
      }
    ]
  }).select('+clientName +phone +email +location +comment +title +note');

  // Manually populate only for reminders that have assignmentId or manualInquiryId
  for (const reminder of reminders) {
    // Populate manual inquiry if present
    if (reminder.manualInquiryId) {
      try {
        await reminder.populate({
          path: 'manualInquiryId',
          select: 'clientName contactNumber location s_No ClientCode ProjectCode productType caseStatus'
        });
      } catch (error) {
        console.warn('Failed to populate manual inquiry for reminder:', reminder._id, error.message);
      }
    }

    // Populate assignment if present
    if (reminder.assignmentId && reminder.assignmentType && reminder.assignmentType !== 'Lead') {
      try {
        await reminder.populate({
          path: 'assignmentId',
          select: 'userId inquiryId createdAt status',
          populate: {
            path: 'userId',
            select: 'fullName phone email city state street pinCode'
          }
        });
      } catch (error) {
        console.warn('Failed to populate assignment for reminder:', reminder._id, error.message);
        // Continue without population for this reminder
      }
    }
  }

  return reminders;
};

export default mongoose.models.Reminder || mongoose.model("Reminder", reminderSchema);