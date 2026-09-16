import Reminder from "../models/reminderSchema.js";
import Employee from "../models/employeeSchema.js";

// Get all reminders for a specific employee (Admin view)
export const getEmployeeReminders = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status, assignmentType, page = 1, limit = 20 } = req.query;
    const adminId = req.user?.id || req.user?._id;

    // Sub-admin restriction: check if requested employee is in managed list
    if (req.isAdminEmployee) {
      const subAdmin = await Employee.findById(adminId).select('giveAdminAccess managedEmployees');
      if (subAdmin && subAdmin.giveAdminAccess) {
        const managedIds = (subAdmin.managedEmployees || []).map(id => id.toString());
        const isSelf = adminId.toString() === employeeId.toString();
        if (!isSelf && !managedIds.includes(employeeId.toString())) {
          return res.status(403).json({
            success: false,
            message: "Access denied. Employee not in your managed list."
          });
        }
      }
    }

    // Verify employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    const filter = { employeeId };

    if (status) filter.status = status;
    if (assignmentType) filter.assignmentType = assignmentType;

    const skip = (page - 1) * limit;

    const reminders = await Reminder.find(filter)
      .sort({ reminderDateTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Reminder.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: reminders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Error fetching employee reminders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employee reminders",
      error: error.message
    });
  }
};

// Get due reminders for a specific employee (Admin view)
export const getEmployeeDueReminders = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const adminId = req.user?.id || req.user?._id;

    // Sub-admin restriction: check if requested employee is in managed list
    if (req.isAdminEmployee) {
      const subAdmin = await Employee.findById(adminId).select('giveAdminAccess managedEmployees');
      if (subAdmin && subAdmin.giveAdminAccess) {
        const managedIds = (subAdmin.managedEmployees || []).map(id => id.toString());
        const isSelf = adminId.toString() === employeeId.toString();
        if (!isSelf && !managedIds.includes(employeeId.toString())) {
          return res.status(403).json({
            success: false,
            message: "Access denied. Employee not in your managed list."
          });
        }
      }
    }

    // Verify employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    const dueReminders = await Reminder.getDueReminders(employeeId);

    res.status(200).json({
      success: true,
      count: dueReminders.length,
      data: dueReminders
    });

  } catch (error) {
    console.error("Error fetching due reminders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch due reminders",
      error: error.message
    });
  }
};

// Get due reminders for all employees with popup enabled (Admin popup)
// OR for sub-admin: get reminders only for managed employees
export const getAllDueRemindersForAdmin = async (req, res) => {
  try {
    const adminId = req.user.id || req.user._id;

    // Check if this is a sub-admin employee
    let isSubAdmin = false;
    let managedEmployeeIds = [];

    if (req.isAdminEmployee) {
      // This is an employee with admin access (sub-admin)
      const subAdmin = await Employee.findById(adminId).select('giveAdminAccess managedEmployees');

      if (subAdmin && subAdmin.giveAdminAccess) {
        isSubAdmin = true;
        managedEmployeeIds = subAdmin.managedEmployees || [];

        if (managedEmployeeIds.length === 0) {
          return res.status(200).json({
            success: true,
            message: "No employees assigned to this sub-admin",
            data: [],
            count: 0,
            isSubAdmin: true
          });
        }
      }
    }

    let targetEmployees;

    if (isSubAdmin) {
      // Sub-admin: get reminders for managed employees + their own reminders
      // Include the sub-admin's own ID in the list
      const employeeIdsToFetch = [...new Set([adminId, ...managedEmployeeIds])]; // Remove duplicates

      targetEmployees = await Employee.find({
        _id: { $in: employeeIdsToFetch },
        isActive: true
      }).select('_id name email department');

      console.log(`📊 Sub-admin ${adminId} managing ${managedEmployeeIds.length} employees + their own reminders (Total: ${targetEmployees.length})`);
    } else {
      // Super Admin: get all employees with adminReminderPopupEnabled = true
      targetEmployees = await Employee.find({
        adminReminderPopupEnabled: true,
        isActive: true
      }).select('_id name email department');

      console.log(`📊 Super admin fetching reminders for ${targetEmployees.length} employees with popup enabled`);
    }

    if (targetEmployees.length === 0) {
      return res.status(200).json({
        success: true,
        message: isSubAdmin
          ? "No active managed employees found"
          : "No employees have admin reminder popup enabled",
        data: [],
        count: 0,
        isSubAdmin
      });
    }

    const employeeIds = targetEmployees.map(emp => emp._id);

    // Get due reminders for all these employees
    const now = new Date();

    const dueReminders = await Reminder.find({
      employeeId: { $in: employeeIds },
      isActive: true,
      cronFired: { $ne: true }, // 🔥 Exclude already-processed reminders (prevents repeat admin popups)
      status: { $nin: ['completed', 'dismissed'] },
      $or: [
        {
          status: 'pending',
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
    })
      .populate('employeeId', 'name email phone department')
      .sort({ reminderDateTime: 1 });

    // Group reminders by employee
    const remindersByEmployee = {};
    dueReminders.forEach(reminder => {
      const empId = reminder.employeeId._id.toString();
      if (!remindersByEmployee[empId]) {
        remindersByEmployee[empId] = {
          employee: reminder.employeeId,
          reminders: []
        };
      }
      remindersByEmployee[empId].reminders.push(reminder);
    });

    res.status(200).json({
      success: true,
      count: dueReminders.length,
      totalEmployees: Object.keys(remindersByEmployee).length,
      isSubAdmin,
      data: Object.values(remindersByEmployee)
    });

  } catch (error) {
    console.error("Error fetching admin due reminders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin due reminders",
      error: error.message
    });
  }
};

// Toggle admin reminder popup for an employee
export const toggleEmployeeReminderPopup = async (req, res) => {
  try {
    // Sub-admin cannot toggle reminder popup settings - only Super Admin
    if (req.isAdminEmployee) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Super Admin can change reminder popup settings."
      });
    }

    const { employeeId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "enabled field must be a boolean value"
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    employee.adminReminderPopupEnabled = enabled;
    await employee.save();

    res.status(200).json({
      success: true,
      message: `Admin reminder popup ${enabled ? 'enabled' : 'disabled'} for employee`,
      data: {
        employeeId: employee._id,
        name: employee.name,
        email: employee.email,
        adminReminderPopupEnabled: employee.adminReminderPopupEnabled
      }
    });

  } catch (error) {
    console.error("Error toggling reminder popup:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle reminder popup",
      error: error.message
    });
  }
};

// Get all employees with their reminder popup status
export const getAllEmployeesReminderStatus = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const adminId = req.user?.id || req.user?._id;

    const query = { isActive: true };

    // Sub-admin restriction: only show managed employees
    if (req.isAdminEmployee) {
      const subAdmin = await Employee.findById(adminId).select('giveAdminAccess managedEmployees');
      if (subAdmin && subAdmin.giveAdminAccess) {
        const managedIds = subAdmin.managedEmployees || [];
        if (managedIds.length === 0) {
          return res.status(200).json({
            success: true,
            data: [],
            pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: parseInt(limit) }
          });
        }
        // Restrict to only managed employees + self
        query._id = { $in: [...managedIds, adminId] };
      }
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const employees = await Employee.find(query)
      .select('name email phone department adminReminderPopupEnabled isActive')
      .populate('role', 'name')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Employee.countDocuments(query);

    // Get reminder counts for each employee
    const employeesWithCounts = await Promise.all(
      employees.map(async (employee) => {
        const reminderCount = await Reminder.countDocuments({
          employeeId: employee._id,
          status: 'pending',
          isActive: true
        });

        const dueReminderCount = await Reminder.countDocuments({
          employeeId: employee._id,
          status: 'pending',
          isActive: true,
          reminderDateTime: { $lte: new Date() }
        });

        return {
          ...employee.toObject(),
          reminderStats: {
            totalPending: reminderCount,
            currentlyDue: dueReminderCount
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      data: employeesWithCounts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Error fetching employees reminder status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch employees reminder status",
      error: error.message
    });
  }
};

// Get reminder statistics for admin dashboard
export const getAdminReminderStats = async (req, res) => {
  try {
    const adminId = req.user?.id || req.user?._id;

    // Sub-admin: build employee filter for managed employees only
    let employeeFilter = { isActive: true };
    let reminderEmployeeFilter = null;

    if (req.isAdminEmployee) {
      const subAdmin = await Employee.findById(adminId).select('giveAdminAccess managedEmployees');
      if (subAdmin && subAdmin.giveAdminAccess) {
        const managedIds = subAdmin.managedEmployees || [];
        const allIds = [...new Set([adminId.toString(), ...managedIds.map(id => id.toString())])];
        employeeFilter._id = { $in: allIds };
        reminderEmployeeFilter = { $in: allIds };
      }
    }

    const totalEmployees = await Employee.countDocuments(employeeFilter);
    const employeesWithPopupEnabled = await Employee.countDocuments({
      ...employeeFilter,
      adminReminderPopupEnabled: true
    });

    const reminderBase = reminderEmployeeFilter
      ? { isActive: true, employeeId: reminderEmployeeFilter }
      : { isActive: true };

    const totalReminders = await Reminder.countDocuments(reminderBase);
    const pendingReminders = await Reminder.countDocuments({ ...reminderBase, status: 'pending' });
    const completedReminders = await Reminder.countDocuments({ ...(reminderEmployeeFilter ? { employeeId: reminderEmployeeFilter } : {}), status: 'completed' });

    const now = new Date();
    const dueReminders = await Reminder.countDocuments({
      ...reminderBase,
      status: 'pending',
      reminderDateTime: { $lte: now }
    });

    // Get reminders by status (scoped to managed employees for sub-admin)
    const statusMatchStage = reminderEmployeeFilter
      ? { employeeId: reminderEmployeeFilter }
      : {};
    const remindersByStatus = await Reminder.aggregate([
      { $match: statusMatchStage },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Get top 5 employees with most reminders (scoped to managed employees for sub-admin)
    const topMatchStage = reminderEmployeeFilter
      ? { isActive: true, employeeId: reminderEmployeeFilter }
      : { isActive: true };
    const topEmployees = await Reminder.aggregate([
      { $match: topMatchStage },
      { $group: { _id: "$employeeId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "employees",
          localField: "_id",
          foreignField: "_id",
          as: "employee"
        }
      },
      { $unwind: "$employee" },
      {
        $project: {
          employeeId: "$_id",
          name: "$employee.name",
          email: "$employee.email",
          reminderCount: "$count"
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        employees: {
          total: totalEmployees,
          withPopupEnabled: employeesWithPopupEnabled
        },
        reminders: {
          total: totalReminders,
          pending: pendingReminders,
          completed: completedReminders,
          currentlyDue: dueReminders,
          byStatus: remindersByStatus
        },
        topEmployees
      }
    });

  } catch (error) {
    console.error("Error fetching admin reminder stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin reminder statistics",
      error: error.message
    });
  }
};

// Get reminders report by date range (Admin view) - for "All Reports" tab
export const getRemindersReport = async (req, res) => {
  try {
    const { startDate, endDate, employeeId, status, page = 1, limit = 50 } = req.query;
    const adminId = req.user?.id || req.user?._id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required"
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Build base filter by creation date range
    const filter = {
      createdAt: { $gte: start, $lte: end }
    };

    // Sub-admin: restrict to managed employees only
    if (req.isAdminEmployee) {
      const subAdmin = await Employee.findById(adminId).select('giveAdminAccess managedEmployees');
      if (subAdmin && subAdmin.giveAdminAccess) {
        const managedIds = subAdmin.managedEmployees || [];
        const allIds = [...new Set([adminId.toString(), ...managedIds.map(id => id.toString())])];
        filter.employeeId = { $in: allIds };
      }
    }

    // Filter by specific employee if provided
    if (employeeId) {
      filter.employeeId = employeeId;
    }

    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reminders = await Reminder.find(filter)
      .populate('employeeId', 'name email phone department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Populate manualInquiryId if present for client profile link
    for (const reminder of reminders) {
      if (reminder.manualInquiryId) {
        try {
          await reminder.populate({
            path: 'manualInquiryId',
            select: 'clientName contactNumber location s_No ClientCode caseStatus source'
          });
        } catch (e) { /* ignore populate error */ }
      }
    }

    const total = await Reminder.countDocuments(filter);

    // Summary stats
    const statusSummary = await Reminder.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const summaryMap = { pending: 0, completed: 0, snoozed: 0, dismissed: 0 };
    statusSummary.forEach(s => { if (s._id) summaryMap[s._id] = s.count; });

    res.status(200).json({
      success: true,
      data: reminders,
      summary: {
        total,
        ...summaryMap
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Error fetching reminders report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reminders report",
      error: error.message
    });
  }
};

// ─────────────────────────────────────────────────────────────────
// Daily Reminder Summary Report
// Returns for a given date:
//   • placed    – reminders CREATED on that date (any employee)
//   • due       – reminders that were SCHEDULED to fire on that date
//   • completed – of the due ones, status = 'completed'
//   • pending   – still pending (not yet done at EOD)
//   • snoozed   – snoozed at EOD
//   • dismissed – dismissed
//   + per-employee breakdown
// ─────────────────────────────────────────────────────────────────
export const getDailyReminderSummary = async (req, res) => {
  try {
    const { date } = req.query; // YYYY-MM-DD
    const adminId = req.user?.id || req.user?._id;

    // Default: today (IST-aware)
    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Sub-admin scope
    let employeeScope = null;
    if (req.isAdminEmployee) {
      const subAdmin = await Employee.findById(adminId).select('giveAdminAccess managedEmployees');
      if (subAdmin && subAdmin.giveAdminAccess) {
        const managedIds = subAdmin.managedEmployees || [];
        const allIds = [...new Set([adminId.toString(), ...managedIds.map(id => id.toString())])];
        employeeScope = { $in: allIds };
      }
    }

    const scopeFilter = employeeScope ? { employeeId: employeeScope } : {};

    // 1️⃣ Reminders PLACED (created) on this day
    const placedFilter = {
      ...scopeFilter,
      createdAt: { $gte: dayStart, $lte: dayEnd }
    };
    const placedCount = await Reminder.countDocuments(placedFilter);

    // 2️⃣ Reminders DUE on this day (reminderDateTime falls on this day)
    const dueFilter = {
      ...scopeFilter,
      reminderDateTime: { $gte: dayStart, $lte: dayEnd }
    };
    const dueReminders = await Reminder.find(dueFilter)
      .populate('employeeId', 'name email department')
      .sort({ reminderDateTime: 1 });

    const dueCount = dueReminders.length;

    // Status breakdown of due reminders
    const statusBreakdown = { completed: 0, pending: 0, snoozed: 0, dismissed: 0 };
    dueReminders.forEach(r => {
      const s = r.status || 'pending';
      if (statusBreakdown[s] !== undefined) statusBreakdown[s]++;
      else statusBreakdown.pending++;
    });

    // 3️⃣ Employee-wise breakdown for DUE reminders
    const empMap = {};
    dueReminders.forEach(r => {
      const emp = r.employeeId;
      const empId = emp?._id?.toString() || 'unknown';
      if (!empMap[empId]) {
        empMap[empId] = {
          employeeId: empId,
          employeeName: emp?.name || 'Unknown',
          employeeEmail: emp?.email || '',
          department: emp?.department || '',
          due: 0, completed: 0, pending: 0, snoozed: 0, dismissed: 0,
          reminders: []
        };
      }
      empMap[empId].due++;
      const s = r.status || 'pending';
      if (empMap[empId][s] !== undefined) empMap[empId][s]++;
      empMap[empId].reminders.push({
        _id: r._id,
        title: r.title,
        clientName: r.clientName,
        phone: r.phone,
        comment: r.comment,
        status: r.status,
        reminderDateTime: r.reminderDateTime,
      });
    });

    // 4️⃣ Placed reminders — per employee
    const placedReminders = await Reminder.find(placedFilter)
      .populate('employeeId', 'name email department')
      .sort({ createdAt: 1 });

    const placedEmpMap = {};
    placedReminders.forEach(r => {
      const emp = r.employeeId;
      const empId = emp?._id?.toString() || 'unknown';
      if (!placedEmpMap[empId]) {
        placedEmpMap[empId] = {
          employeeId: empId,
          employeeName: emp?.name || 'Unknown',
          count: 0
        };
      }
      placedEmpMap[empId].count++;
    });

    res.status(200).json({
      success: true,
      date: dayStart.toISOString().split('T')[0],
      summary: {
        placed: placedCount,
        due: dueCount,
        completed: statusBreakdown.completed,
        pending: statusBreakdown.pending,
        snoozed: statusBreakdown.snoozed,
        dismissed: statusBreakdown.dismissed,
        handledRate: dueCount > 0
          ? Math.round((statusBreakdown.completed / dueCount) * 100)
          : 0
      },
      dueByEmployee: Object.values(empMap),
      placedByEmployee: Object.values(placedEmpMap),
    });

  } catch (error) {
    console.error("Error fetching daily reminder summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch daily reminder summary",
      error: error.message
    });
  }
};

