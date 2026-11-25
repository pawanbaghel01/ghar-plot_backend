import Attendance from "../models/attendanceSchema.js";
import Shift from "../models/shiftSchema.js";
import Employee from "../models/employeeSchema.js";

// Helper to format Date into 12-hour IST string (e.g. "12:55 PM")
const format12Hour = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d
    .toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();
};

// Helper to extract IST date & time parts regardless of server timezone (UTC on cloud)
const getISTParts = (targetDate = new Date()) => {
  const d = new Date(targetDate);
  const istMs = d.getTime() + 5.5 * 60 * 60 * 1000;
  const ist = new Date(istMs);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth() + 1;
  const day = ist.getUTCDate();
  const hour = ist.getUTCHours();
  const minute = ist.getUTCMinutes();
  const dayOfWeek = ist.getUTCDay();
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const minutesOfDay = hour * 60 + minute;
  return { year, month, day, hour, minute, dayOfWeek, dateStr, minutesOfDay };
};

// Helper to parse "HH:mm" into minutes from midnight
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 9 * 60 + 30; // 09:30 AM default
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
};

// Helper to get effective shift for an employee
const getEffectiveShift = async (employee) => {
  // 1. Check custom employee override
  if (employee?.customShift?.startTime && employee?.customShift?.endTime) {
    return {
      name: "Custom Shift",
      startTime: employee.customShift.startTime,
      endTime: employee.customShift.endTime,
      gracePeriodMinutes: employee.customShift.gracePeriodMinutes || 15,
      halfDayThresholdHours: 4.5,
      fullDayHours: 8.0,
    };
  }

  // 2. Check assigned shift
  if (employee?.assignedShift) {
    const shift = await Shift.findById(employee.assignedShift);
    if (shift) return shift;
  }

  // 3. Fallback to default shift from DB or seed one
  let defaultShift = await Shift.findOne({ isDefault: true });
  if (!defaultShift) {
    defaultShift = await Shift.findOne();
  }
  if (!defaultShift) {
    defaultShift = await Shift.create({
      name: "General Day Shift",
      startTime: "09:30",
      endTime: "18:30",
      gracePeriodMinutes: 15,
      halfDayThresholdHours: 4.5,
      fullDayHours: 8.0,
      isDefault: true,
      workDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    });
  }

  return defaultShift;
};

// Helper to get formatted YYYY-MM-DD in IST
const getDateParts = (targetDate = new Date()) => {
  const { year, month, day, dateStr } = getISTParts(targetDate);
  return { year, month, day, dateStr };
};

// ==========================================
// 1. SHIFT MANAGEMENT CONTROLLERS (ADMIN)
// ==========================================

export const getShifts = async (req, res) => {
  try {
    let shifts = await Shift.find().sort({ createdAt: -1 });
    if (!shifts || shifts.length === 0) {
      const defaultShift = await Shift.create({
        name: "General Day Shift",
        startTime: "09:30",
        endTime: "18:30",
        gracePeriodMinutes: 15,
        halfDayThresholdHours: 4.5,
        fullDayHours: 8.0,
        isDefault: true,
        workDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      });
      shifts = [defaultShift];
    }
    res.status(200).json({ success: true, data: shifts });
  } catch (error) {
    console.error("Error fetching shifts:", error);
    res.status(500).json({ success: false, message: "Failed to fetch shifts", error: error.message });
  }
};

export const createShift = async (req, res) => {
  try {
    const { name, startTime, endTime, gracePeriodMinutes = 15, halfDayThresholdHours = 4.5, workDays, isDefault, description } = req.body;
    if (!name || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: "Shift Name, Start Time, and End Time are required" });
    }

    if (isDefault) {
      await Shift.updateMany({}, { isDefault: false });
    }

    const shift = await Shift.create({
      name: name.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      gracePeriodMinutes: Number(gracePeriodMinutes) || 15,
      halfDayThresholdHours: Number(halfDayThresholdHours) || 4.5,
      workDays: workDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      isDefault: Boolean(isDefault),
      description: description?.trim() || "",
    });

    res.status(201).json({ success: true, message: "Shift created successfully", data: shift });
  } catch (error) {
    console.error("Error creating shift:", error);
    res.status(500).json({ success: false, message: "Failed to create shift", error: error.message });
  }
};

export const updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, gracePeriodMinutes, halfDayThresholdHours, workDays, isDefault, description } = req.body;

    const shift = await Shift.findById(id);
    if (!shift) {
      return res.status(404).json({ success: false, message: "Shift not found" });
    }

    if (isDefault) {
      await Shift.updateMany({ _id: { $ne: id } }, { isDefault: false });
      shift.isDefault = true;
    }

    if (name) shift.name = name.trim();
    if (startTime) shift.startTime = startTime.trim();
    if (endTime) shift.endTime = endTime.trim();
    if (gracePeriodMinutes !== undefined) shift.gracePeriodMinutes = Number(gracePeriodMinutes);
    if (halfDayThresholdHours !== undefined) shift.halfDayThresholdHours = Number(halfDayThresholdHours);
    if (workDays) shift.workDays = workDays;
    if (description !== undefined) shift.description = description.trim();

    await shift.save();
    res.status(200).json({ success: true, message: "Shift updated successfully", data: shift });
  } catch (error) {
    console.error("Error updating shift:", error);
    res.status(500).json({ success: false, message: "Failed to update shift", error: error.message });
  }
};

export const assignShiftToEmployee = async (req, res) => {
  try {
    const { employeeId, shiftId, customShift } = req.body;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: "Employee ID is required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    if (shiftId) {
      employee.assignedShift = shiftId;
    }
    if (customShift) {
      employee.customShift = {
        startTime: customShift.startTime || null,
        endTime: customShift.endTime || null,
        gracePeriodMinutes: Number(customShift.gracePeriodMinutes) || 15,
      };
    }

    await employee.save();
    res.status(200).json({ success: true, message: "Employee shift assigned successfully", data: employee });
  } catch (error) {
    console.error("Error assigning shift to employee:", error);
    res.status(500).json({ success: false, message: "Failed to assign shift", error: error.message });
  }
};

// ==========================================
// 2. DAILY PUNCH / CHECK-IN & CHECK-OUT (EMPLOYEE)
// ==========================================

export const checkIn = async (req, res) => {
  try {
    const employeeId = req.user?.id || req.user?._id;
    if (!employeeId) {
      return res.status(401).json({ success: false, message: "Unauthorized employee" });
    }

    const employee = await Employee.findById(employeeId).populate("assignedShift");
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee record not found" });
    }

    const now = new Date();
    const { year, month, day, dateStr, minutesOfDay: arrivalMins } = getISTParts(now);

    // Check if already checked in today
    let attendance = await Attendance.findOne({ employeeId, dateStr });
    if (attendance && attendance.checkIn && attendance.checkIn.time) {
      return res.status(200).json({
        success: true,
        alreadyCheckedIn: true,
        message: `Already checked in today at ${format12Hour(attendance.checkIn.time) || attendance.checkIn.timeStr}`,
        data: attendance,
      });
    }

    const shift = await getEffectiveShift(employee);
    const shiftStartMins = parseTimeToMinutes(shift.startTime);
    const graceMins = shift.gracePeriodMinutes ?? 15;

    let status = "Present";
    let lateMinutes = 0;

    // Evaluate Late vs On-Time (using IST minutes of day)
    if (arrivalMins > shiftStartMins + graceMins) {
      status = "Late";
      lateMinutes = arrivalMins - shiftStartMins;
    }

    const { location, deviceInfo, lateReason, reason, notes } = req.body || {};
    const finalLateReason = String(lateReason || reason || notes || "").trim();

    if (status === "Late" && !finalLateReason) {
      return res.status(400).json({
        success: false,
        requiresReason: true,
        lateMinutes,
        message: `Grace period (${graceMins} mins) has passed. Please add a reason for late check-in.`,
      });
    }

    if (!attendance) {
      attendance = new Attendance({
        employeeId,
        dateStr,
        year,
        month,
        day,
        checkIn: {
          time: now,
          timeStr: format12Hour(now),
          location: location || null,
          deviceInfo: deviceInfo || "",
        },
        status,
        lateMinutes,
        lateReason: finalLateReason,
        notes: finalLateReason,
        shiftName: shift.name || "General Day Shift",
        shiftStartTime: shift.startTime,
        shiftEndTime: shift.endTime,
      });
    } else {
      attendance.checkIn = {
        time: now,
        timeStr: format12Hour(now),
        location: location || null,
        deviceInfo: deviceInfo || "",
      };
      attendance.status = status;
      attendance.lateMinutes = lateMinutes;
      attendance.lateReason = finalLateReason;
      attendance.notes = finalLateReason;
      attendance.shiftName = shift.name || "General Day Shift";
      attendance.shiftStartTime = shift.startTime;
      attendance.shiftEndTime = shift.endTime;
    }

    await attendance.save();

    res.status(200).json({
      success: true,
      message: status === "Late" ? `Checked in: Marked LATE (${lateMinutes} mins late)` : "Checked in on-time!",
      data: attendance,
    });
  } catch (error) {
    console.error("Error during check-in:", error);
    res.status(500).json({ success: false, message: "Check-in failed", error: error.message });
  }
};

export const checkOut = async (req, res) => {
  try {
    const employeeId = req.user?.id || req.user?._id;
    if (!employeeId) {
      return res.status(401).json({ success: false, message: "Unauthorized employee" });
    }

    const now = new Date();
    const { dateStr } = getDateParts(now);

    const attendance = await Attendance.findOne({ employeeId, dateStr });
    if (!attendance || !attendance.checkIn || !attendance.checkIn.time) {
      return res.status(400).json({ success: false, message: "No check-in record found for today. Please check in first." });
    }

    const checkInTime = new Date(attendance.checkIn.time);
    const diffMs = now.getTime() - checkInTime.getTime();
    const hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

    const employee = await Employee.findById(employeeId).populate("assignedShift");
    const shift = await getEffectiveShift(employee);

    // Calculate early departure if any (IST minutes)
    const shiftEndMins = parseTimeToMinutes(shift.endTime);
    const { minutesOfDay: departureMins } = getISTParts(now);
    let earlyExitMinutes = 0;
    if (departureMins < shiftEndMins) {
      earlyExitMinutes = shiftEndMins - departureMins;
    }

    // Evaluate Day Status based on actual working hours vs shift thresholds
    const shiftStartMins = parseTimeToMinutes(shift.startTime);
    const shiftDurationHours = Math.max(1, (shiftEndMins - shiftStartMins) / 60);
    const halfDayThreshold = shift.halfDayThresholdHours || Math.round((shiftDurationHours / 2) * 10) / 10;
    const fullDayThreshold = Math.min(shift.fullDayHours || 8.0, Math.max(halfDayThreshold, shiftDurationHours - 0.5));

    if (hoursWorked < halfDayThreshold) {
      attendance.status = "Absent";
    } else if (hoursWorked < fullDayThreshold) {
      attendance.status = "Half Day";
    } else {
      attendance.status = attendance.lateMinutes > 0 ? "Late" : "Present";
    }

    const totalWorkedMins = Math.max(0, Math.round(diffMs / 60000));
    const workedDisplay =
      totalWorkedMins < 60
        ? `${totalWorkedMins} mins`
        : `${Math.floor(totalWorkedMins / 60)}h ${totalWorkedMins % 60}m`;

    const { location, deviceInfo } = req.body || {};

    attendance.checkOut = {
      time: now,
      timeStr: format12Hour(now),
      location: location || null,
      deviceInfo: deviceInfo || "",
    };
    attendance.totalWorkingHours = hoursWorked;
    attendance.earlyExitMinutes = earlyExitMinutes;

    await attendance.save();

    res.status(200).json({
      success: true,
      message: `Checked out successfully! Today's Status: ${attendance.status} (${workedDisplay})`,
      data: attendance,
    });
  } catch (error) {
    console.error("Error during check-out:", error);
    res.status(500).json({ success: false, message: "Check-out failed", error: error.message });
  }
};

export const getTodayAttendance = async (req, res) => {
  try {
    const employeeId = req.user?.id || req.user?._id;
    if (!employeeId) {
      return res.status(401).json({ success: false, message: "Unauthorized employee" });
    }

    const now = new Date();
    const { dateStr, dayOfWeek } = getISTParts(now);

    const employee = await Employee.findById(employeeId).populate("assignedShift");
    const shift = await getEffectiveShift(employee);

    const attendance = await Attendance.findOne({ employeeId, dateStr });

    const isCheckedIn = Boolean(attendance?.checkIn?.time);
    const isCheckedOut = Boolean(attendance?.checkOut?.time);

    res.status(200).json({
      success: true,
      data: {
        dateStr,
        isCheckedIn,
        isCheckedOut,
        checkInTime: attendance?.checkIn?.time || null,
        checkOutTime: attendance?.checkOut?.time || null,
        checkInTimeStr: attendance?.checkIn?.time ? format12Hour(attendance.checkIn.time) : (attendance?.checkIn?.timeStr || ""),
        checkOutTimeStr: attendance?.checkOut?.time ? format12Hour(attendance.checkOut.time) : (attendance?.checkOut?.timeStr || ""),
        status: attendance?.status || (dayOfWeek === 0 ? "Week Off" : "Not Checked In"),
        lateMinutes: attendance?.lateMinutes || 0,
        lateReason: attendance?.lateReason || attendance?.notes || "",
        totalWorkingHours: attendance?.totalWorkingHours || 0,
        shift: {
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
          gracePeriodMinutes: shift.gracePeriodMinutes,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching today attendance:", error);
    res.status(500).json({ success: false, message: "Failed to fetch today attendance", error: error.message });
  }
};

// ==========================================
// 3. EMPLOYEE MONTHLY ATTENDANCE VIEW
// ==========================================

export const getEmployeeMonthlyAttendance = async (req, res) => {
  try {
    const employeeId = req.params.employeeId || req.user?.id || req.user?._id;
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);

    const employee = await Employee.findById(employeeId).select("name employeeCode department assignedShift customShift");
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const shift = await getEffectiveShift(employee);

    // Days in this month
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    // Query records for this month
    const records = await Attendance.find({
      employeeId,
      year,
      month,
    }).sort({ day: 1 });

    const recordMap = {};
    records.forEach((r) => {
      recordMap[r.day] = r;
    });

    let presentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let weekOffCount = 0;
    let totalHours = 0;

    const calendar = [];

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const isSunday = dateObj.getDay() === 0;
      const isFuture = dateObj > now;
      const dateString = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      if (recordMap[d]) {
        const rec = recordMap[d];
        calendar.push({
          day: d,
          dateStr: dateString,
          status: rec.status,
          checkIn: rec.checkIn?.time ? format12Hour(rec.checkIn.time) : (rec.checkIn?.timeStr || ""),
          checkOut: rec.checkOut?.time ? format12Hour(rec.checkOut.time) : (rec.checkOut?.timeStr || ""),
          lateMinutes: rec.lateMinutes || 0,
          lateReason: rec.lateReason || rec.notes || "",
          totalWorkingHours: rec.totalWorkingHours || 0,
          shiftTiming: `${rec.shiftStartTime} - ${rec.shiftEndTime}`,
        });

        if (rec.status === "Present") presentCount++;
        else if (rec.status === "Late") lateCount++;
        else if (rec.status === "Half Day") halfDayCount++;
        else if (rec.status === "Absent") absentCount++;

        totalHours += rec.totalWorkingHours || 0;
      } else {
        let defaultStatus = "Absent";
        if (isSunday) {
          defaultStatus = "Week Off";
          weekOffCount++;
        } else if (isFuture) {
          defaultStatus = "Upcoming";
        } else {
          absentCount++;
        }

        calendar.push({
          day: d,
          dateStr: dateString,
          status: defaultStatus,
          checkIn: "",
          checkOut: "",
          lateMinutes: 0,
          totalWorkingHours: 0,
          shiftTiming: `${shift.startTime} - ${shift.endTime}`,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        employee: {
          id: employee._id,
          name: employee.name,
          employeeCode: employee.employeeCode,
          department: employee.department,
        },
        month,
        year,
        summary: {
          totalDays: totalDaysInMonth,
          presentCount,
          lateCount,
          halfDayCount,
          absentCount,
          weekOffCount,
          totalWorkingHours: Math.round(totalHours * 10) / 10,
        },
        calendar,
      },
    });
  } catch (error) {
    console.error("Error fetching employee monthly attendance:", error);
    res.status(500).json({ success: false, message: "Failed to fetch monthly attendance", error: error.message });
  }
};

// ==========================================
// 4. ADMIN MONTHLY ATTENDANCE MATRIX & SUMMARY
// ==========================================

export const getAdminMonthlyMatrix = async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);
    const { department, search } = req.query;

    const empFilter = { isActive: true };
    if (department) empFilter.department = { $regex: new RegExp(`^${department}$`, "i") };
    if (search) {
      empFilter.$or = [
        { name: { $regex: new RegExp(search, "i") } },
        { employeeCode: { $regex: new RegExp(search, "i") } },
        { email: { $regex: new RegExp(search, "i") } },
      ];
    }

    const employees = await Employee.find(empFilter)
      .select("name employeeCode department assignedShift customShift phone")
      .sort({ name: 1 });

    const totalDaysInMonth = new Date(year, month, 0).getDate();

    // Fetch all attendance for this month
    const allAttendance = await Attendance.find({ year, month });
    const attendanceMap = {};

    allAttendance.forEach((rec) => {
      const key = `${rec.employeeId.toString()}_${rec.day}`;
      attendanceMap[key] = rec;
    });

    // Today's summary KPI
    const { dateStr: todayStr } = getDateParts(now);
    const todayRecords = await Attendance.find({ dateStr: todayStr });
    const todayPresent = todayRecords.filter((r) => r.status === "Present").length;
    const todayLate = todayRecords.filter((r) => r.status === "Late").length;
    const todayHalfDay = todayRecords.filter((r) => r.status === "Half Day").length;
    const todayCheckedIn = todayRecords.length;
    const todayAbsent = Math.max(0, employees.length - todayCheckedIn);

    const matrix = employees.map((emp) => {
      const days = [];
      let present = 0;
      let late = 0;
      let halfDay = 0;
      let absent = 0;
      let totalHrs = 0;

      for (let d = 1; d <= totalDaysInMonth; d++) {
        const key = `${emp._id.toString()}_${d}`;
        const rec = attendanceMap[key];
        const dateObj = new Date(year, month - 1, d);
        const isSunday = dateObj.getDay() === 0;
        const isFuture = dateObj > now;

        if (rec) {
          days.push({
            day: d,
            status: rec.status,
            checkIn: rec.checkIn?.time ? format12Hour(rec.checkIn.time) : (rec.checkIn?.timeStr || ""),
            checkOut: rec.checkOut?.time ? format12Hour(rec.checkOut.time) : (rec.checkOut?.timeStr || ""),
            lateMinutes: rec.lateMinutes || 0,
            lateReason: rec.lateReason || rec.notes || "",
            hours: rec.totalWorkingHours || 0,
            shiftTiming: rec.shiftStartTime && rec.shiftEndTime ? `${rec.shiftStartTime} - ${rec.shiftEndTime}` : "",
          });

          if (rec.status === "Present") present++;
          else if (rec.status === "Late") late++;
          else if (rec.status === "Half Day") halfDay++;
          else if (rec.status === "Absent") absent++;

          totalHrs += rec.totalWorkingHours || 0;
        } else {
          let s = "A";
          if (isSunday) s = "OFF";
          else if (isFuture) s = "-";
          else absent++;

          days.push({
            day: d,
            status: s,
            checkIn: "",
            checkOut: "",
            lateMinutes: 0,
            hours: 0,
          });
        }
      }

      return {
        employeeId: emp._id,
        name: emp.name,
        code: emp.employeeCode || "EMP",
        department: emp.department || "General",
        summary: {
          present,
          late,
          halfDay,
          absent,
          totalHours: Math.round(totalHrs * 10) / 10,
        },
        days,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        month,
        year,
        totalDays: totalDaysInMonth,
        todayKpi: {
          totalEmployees: employees.length,
          present: todayPresent,
          late: todayLate,
          halfDay: todayHalfDay,
          absent: todayAbsent,
        },
        matrix,
      },
    });
  } catch (error) {
    console.error("Error fetching admin attendance matrix:", error);
    res.status(500).json({ success: false, message: "Failed to fetch attendance matrix", error: error.message });
  }
};

// ==========================================
// 5. REGULARIZE / OVERRIDE ATTENDANCE (ADMIN)
// ==========================================

export const regularizeAttendance = async (req, res) => {
  try {
    const { employeeId, dateStr, status, checkInTimeStr, checkOutTimeStr, workingHours, reason } = req.body;
    if (!employeeId || !dateStr || !status) {
      return res.status(400).json({ success: false, message: "Employee, Date and Status are required" });
    }

    const parts = dateStr.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    let attendance = await Attendance.findOne({ employeeId, dateStr });
    if (!attendance) {
      attendance = new Attendance({
        employeeId,
        dateStr,
        year,
        month,
        day,
      });
    }

    attendance.status = status;
    if (checkInTimeStr) {
      attendance.checkIn = {
        time: attendance.checkIn?.time || new Date(),
        timeStr: checkInTimeStr,
      };
    }
    if (checkOutTimeStr) {
      attendance.checkOut = {
        time: attendance.checkOut?.time || new Date(),
        timeStr: checkOutTimeStr,
      };
    }
    if (workingHours !== undefined) {
      attendance.totalWorkingHours = Number(workingHours);
    }

    attendance.isRegularized = true;
    attendance.regularizeReason = reason || "Adjusted by Admin";
    attendance.regularizedBy = req.user?.id || req.user?._id;

    await attendance.save();

    res.status(200).json({
      success: true,
      message: `Attendance for ${dateStr} regularized successfully!`,
      data: attendance,
    });
  } catch (error) {
    console.error("Error regularizing attendance:", error);
    res.status(500).json({ success: false, message: "Regularize failed", error: error.message });
  }
};
