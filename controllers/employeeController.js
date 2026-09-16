import Employee from "../models/employeeSchema.js";
import Role from "../models/roleSchema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Create new employee
export const createEmployee = async (req, res) => {
  try {
    const { name, email, phone, role, password, department, address, giveAdminAccess } = req.body;

    // Check if employee with email already exists
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: "Employee with this email already exists"
      });
    }

    // Verify role exists
    const roleExists = await Role.findById(role);
    if (!roleExists) {
      return res.status(400).json({
        success: false,
        message: "Invalid role selected"
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Handle admin access - store the flag, admin access will be handled by frontend logic
    let finalRole = role;

    // Create new employee
    const newEmployee = new Employee({
      name,
      email,
      phone,
      role: finalRole,
      password: hashedPassword,
      department,
      address,
      giveAdminAccess: giveAdminAccess || false,
      createdBy: req.user?.id || null
    });

    const savedEmployee = await newEmployee.save();

    // Populate role information
    await savedEmployee.populate('role', 'name permissions');

    // Remove password from response
    const employeeResponse = savedEmployee.toObject();
    delete employeeResponse.password;

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: employeeResponse
    });
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get all employees
export const getAllEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", roleFilter, isActive, department } = req.query;

    const query = {};

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Add role filter
    if (roleFilter) {
      query.role = roleFilter;
    }

    // Add active filter
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Add department filter
    if (department) {
      query.department = { $regex: department, $options: 'i' };
    }

    const employees = await Employee.find(query)
      .populate('role', 'name permissions')
      .populate('createdBy', 'name email')
      .select('-password') // Exclude password from results
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Employee.countDocuments(query);

    res.status(200).json({
      success: true,
      data: employees,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalEmployees: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id)
      .populate('role', 'name permissions')
      .populate('createdBy', 'name email')
      .select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Update employee
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, department, address, isActive, giveAdminAccess, adminReminderPopupEnabled } = req.body;

    // Check if employee exists
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    // Check if new email conflicts with existing employees (excluding current employee)
    if (email && email !== employee.email) {
      const existingEmployee = await Employee.findOne({
        email,
        _id: { $ne: id }
      });
      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          message: "Employee with this email already exists"
        });
      }
    }

    // Handle admin access - store the flag, admin access will be handled by frontend logic
    let finalRole = role;

    // Verify role exists if role is being updated
    if (finalRole && finalRole !== employee.role.toString()) {
      const roleExists = await Role.findById(finalRole);
      if (!roleExists) {
        return res.status(400).json({
          success: false,
          message: "Invalid role selected"
        });
      }
    }

    // Prepare update data
    const updateData = {
      name,
      email,
      phone,
      role: finalRole,
      department,
      address,
      isActive,
      giveAdminAccess: giveAdminAccess || false,
      updatedAt: Date.now()
    };

    // Include adminReminderPopupEnabled if provided
    if (adminReminderPopupEnabled !== undefined) {
      updateData.adminReminderPopupEnabled = adminReminderPopupEnabled;
    }

    // Update employee
    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('role', 'name permissions').select('-password');

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: updatedEmployee
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if employee exists
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    await Employee.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Employee deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Update employee password
export const updateEmployeePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, currentPassword } = req.body;

    // Check if employee exists
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    // Verify current password if provided
    if (currentPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, employee.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect"
        });
      }
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await Employee.findByIdAndUpdate(id, {
      password: hashedPassword,
      updatedAt: Date.now()
    });

    res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Employee login
export const employeeLogin = async (req, res) => {
  try {
    const { email, password, fcmToken, deviceId, deviceInfo } = req.body;

    // Check if employee exists and is active
    const employee = await Employee.findOne({ email, isActive: true })
      .populate('role', 'name permissions isActive');

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials or account inactive"
      });
    }

    // Check if role is active
    if (!employee.role.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your role has been deactivated. Please contact administrator."
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, employee.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Update last login timestamp
    employee.lastLogin = new Date();

    // Update multi-device FCM session if fcmToken provided (Actual Login Event)
    if (fcmToken) {
      if ((!employee.fcmTokens || employee.fcmTokens.length === 0) && employee.fcmToken) {
        employee.fcmTokens = [{
          token: employee.fcmToken,
          deviceId: "",
          deviceInfo: "",
          lastLogin: employee.lastLogin || new Date(),
          updatedAt: new Date()
        }];
      }
      if (!employee.fcmTokens) employee.fcmTokens = [];

      const currentDeviceId = deviceId || "";
      const currentDeviceInfo = deviceInfo || req.headers["user-agent"] || "";

      let existingIndex = -1;
      if (currentDeviceId) {
        existingIndex = employee.fcmTokens.findIndex(e => e.deviceId && e.deviceId === currentDeviceId);
      }
      if (existingIndex === -1) {
        existingIndex = employee.fcmTokens.findIndex(e => e.token === fcmToken);
      }

      if (existingIndex !== -1) {
        employee.fcmTokens[existingIndex].token = fcmToken;
        employee.fcmTokens[existingIndex].lastLogin = new Date();
        employee.fcmTokens[existingIndex].updatedAt = new Date();
        if (currentDeviceId) employee.fcmTokens[existingIndex].deviceId = currentDeviceId;
        if (currentDeviceInfo) employee.fcmTokens[existingIndex].deviceInfo = currentDeviceInfo;
      } else {
        employee.fcmTokens.push({
          token: fcmToken,
          deviceId: currentDeviceId,
          deviceInfo: currentDeviceInfo,
          lastLogin: new Date(),
          updatedAt: new Date()
        });
      }

      // Sort strictly by lastLogin descending to maintain latest 2 devices
      employee.fcmTokens.sort((a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0));
      employee.fcmTokens = employee.fcmTokens.slice(0, 2);

      // Primary token is the latest active device
      employee.fcmToken = employee.fcmTokens[0].token;
      console.log(`✅ FCM token & multi-device session updated on login for employee ${employee._id} (${employee.fcmTokens.length} active devices)`);
    }

    await employee.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: employee._id,
        email: employee.email,
        role: employee.role._id,
        permissions: employee.role.permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const employeeResponse = employee.toObject();
    delete employeeResponse.password;

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        employee: employeeResponse,
        token
      }
    });
  } catch (error) {
    console.error("Error during employee login:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get employee dashboard stats
export const getEmployeeDashboardStats = async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ isActive: true });
    const inactiveEmployees = await Employee.countDocuments({ isActive: false });
    const totalRoles = await Role.countDocuments();

    // Get employees by department
    const employeesByDepartment = await Employee.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        totalRoles,
        employeesByDepartment
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get employee profile (own profile)
export const getEmployeeProfile = async (req, res) => {
  try {
    const employeeId = req.employee.id; // From JWT token

    const employee = await Employee.findById(employeeId)
      .populate('role', 'name permissions')
      .select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error("Error fetching employee profile:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get employees with admin access
export const getEmployeesWithAdminAccess = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const query = { giveAdminAccess: true };

    const employees = await Employee.find(query)
      .populate('role', 'name permissions')
      .populate('createdBy', 'name email')
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Employee.countDocuments(query);

    res.status(200).json({
      success: true,
      data: employees,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalEmployees: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching employees with admin access:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Assign employees to a sub-admin for reminder monitoring
 * Admin can specify which employees' reminders the sub-admin can view
 */
export const assignEmployeesToSubAdmin = async (req, res) => {
  try {
    const { subAdminId } = req.params;
    const { employeeIds } = req.body; // Array of employee IDs to assign

    // Protection: Only Original Admin can assign employees to sub-admins
    if (req.isAdminEmployee) {
      return res.status(403).json({
        success: false,
        message: "Authority Denied: Only Original Admin can assign monitoring access for reminders."
      });
    }

    // Validate sub-admin exists and has admin access
    const subAdmin = await Employee.findById(subAdminId);
    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        message: "Sub-admin not found"
      });
    }

    if (!subAdmin.giveAdminAccess) {
      return res.status(400).json({
        success: false,
        message: "This employee does not have admin access. Please enable giveAdminAccess first."
      });
    }

    // Validate employee IDs - allow empty array to clear all assignments
    if (!Array.isArray(employeeIds)) {
      return res.status(400).json({
        success: false,
        message: "employeeIds must be an array"
      });
    }

    let validEmployees = [];

    if (employeeIds.length > 0) {
      // Validate all employee IDs exist and are active
      validEmployees = await Employee.find({
        _id: { $in: employeeIds },
        isActive: true
      }).select('_id name email');

      if (validEmployees.length !== employeeIds.length) {
        return res.status(400).json({
          success: false,
          message: "Some employee IDs are invalid or inactive"
        });
      }
    }

    // Update sub-admin's managedEmployees list (empty array clears all)
    subAdmin.managedEmployees = employeeIds;
    await subAdmin.save();

    res.status(200).json({
      success: true,
      message: employeeIds.length === 0
        ? `Cleared all managed employees from sub-admin`
        : `Successfully assigned ${employeeIds.length} employee(s) to sub-admin`,
      data: {
        subAdminId: subAdmin._id,
        subAdminName: subAdmin.name,
        managedEmployees: validEmployees.map(emp => ({
          id: emp._id,
          name: emp.name,
          email: emp.email
        }))
      }
    });

  } catch (error) {
    console.error("Error assigning employees to sub-admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign employees",
      error: error.message
    });
  }
};

/**
 * Add specific employees to sub-admin's managed list (without replacing existing)
 */
export const addEmployeesToSubAdmin = async (req, res) => {
  try {
    const { subAdminId } = req.params;
    const { employeeIds } = req.body;

    // Protection: Only Original Admin can manage sub-admin lists
    if (req.isAdminEmployee) {
      return res.status(403).json({
        success: false,
        message: "Authority Denied: Only Original Admin can manage monitoring access."
      });
    }

    const subAdmin = await Employee.findById(subAdminId);
    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        message: "Sub-admin not found"
      });
    }

    if (!subAdmin.giveAdminAccess) {
      return res.status(400).json({
        success: false,
        message: "This employee does not have admin access"
      });
    }

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "employeeIds must be a non-empty array"
      });
    }

    // Validate employees exist
    const validEmployees = await Employee.find({
      _id: { $in: employeeIds },
      isActive: true
    }).select('_id name email');

    if (validEmployees.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid employees found"
      });
    }

    // Add to existing managedEmployees (avoid duplicates)
    const currentManaged = subAdmin.managedEmployees || [];
    const newEmployeeIds = validEmployees.map(emp => emp._id);

    const uniqueEmployees = [...new Set([
      ...currentManaged.map(id => id.toString()),
      ...newEmployeeIds.map(id => id.toString())
    ])];

    subAdmin.managedEmployees = uniqueEmployees;
    await subAdmin.save();

    res.status(200).json({
      success: true,
      message: `Added ${validEmployees.length} employee(s) to sub-admin's managed list`,
      data: {
        subAdminId: subAdmin._id,
        subAdminName: subAdmin.name,
        totalManagedEmployees: uniqueEmployees.length,
        addedEmployees: validEmployees.map(emp => ({
          id: emp._id,
          name: emp.name,
          email: emp.email
        }))
      }
    });

  } catch (error) {
    console.error("Error adding employees to sub-admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add employees",
      error: error.message
    });
  }
};

/**
 * Remove specific employees from sub-admin's managed list
 */
export const removeEmployeesFromSubAdmin = async (req, res) => {
  try {
    const { subAdminId } = req.params;
    const { employeeIds } = req.body;

    // Protection: Only Original Admin can manage sub-admin lists
    if (req.isAdminEmployee) {
      return res.status(403).json({
        success: false,
        message: "Authority Denied: Only Original Admin can manage monitoring access."
      });
    }

    const subAdmin = await Employee.findById(subAdminId);
    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        message: "Sub-admin not found"
      });
    }

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "employeeIds must be a non-empty array"
      });
    }

    // Remove specified employees from managedEmployees
    const currentManaged = subAdmin.managedEmployees || [];
    const removeIdsStr = employeeIds.map(id => id.toString());

    subAdmin.managedEmployees = currentManaged.filter(
      empId => !removeIdsStr.includes(empId.toString())
    );

    await subAdmin.save();

    res.status(200).json({
      success: true,
      message: `Removed ${employeeIds.length} employee(s) from sub-admin's managed list`,
      data: {
        subAdminId: subAdmin._id,
        subAdminName: subAdmin.name,
        remainingManagedEmployees: subAdmin.managedEmployees.length
      }
    });

  } catch (error) {
    console.error("Error removing employees from sub-admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove employees",
      error: error.message
    });
  }
};

/**
 * Get list of employees managed by a sub-admin
 */
export const getSubAdminManagedEmployees = async (req, res) => {
  try {
    const { subAdminId } = req.params;

    const subAdmin = await Employee.findById(subAdminId)
      .populate({
        path: 'managedEmployees',
        select: 'name email phone department isActive',
        populate: {
          path: 'role',
          select: 'name'
        }
      });

    if (!subAdmin) {
      return res.status(404).json({
        success: false,
        message: "Sub-admin not found"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        subAdmin: {
          id: subAdmin._id,
          name: subAdmin.name,
          email: subAdmin.email,
          giveAdminAccess: subAdmin.giveAdminAccess
        },
        managedEmployees: subAdmin.managedEmployees || [],
        totalManaged: (subAdmin.managedEmployees || []).length
      }
    });

  } catch (error) {
    console.error("Error fetching sub-admin managed employees:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch managed employees",
      error: error.message
    });
  }
};

/**
 * Get all sub-admins with their managed employees count
 */
export const getAllSubAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const subAdmins = await Employee.find({
      giveAdminAccess: true,
      isActive: true
    })
      .populate({
        path: 'managedEmployees',
        select: 'name email'
      })
      .populate('role', 'name')
      .select('name email phone department giveAdminAccess managedEmployees')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Employee.countDocuments({
      giveAdminAccess: true,
      isActive: true
    });

    const formattedData = subAdmins.map(admin => ({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      department: admin.department,
      role: admin.role,
      managedEmployeesCount: (admin.managedEmployees || []).length,
      managedEmployees: (admin.managedEmployees || []).map(emp => ({
        id: emp._id,
        name: emp.name,
        email: emp.email
      }))
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Error fetching sub-admins:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sub-admins",
      error: error.message
    });
  }
};