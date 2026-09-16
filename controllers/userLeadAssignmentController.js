import UserLeadAssignment from "../models/userLeadAssignmentSchema.js";
import Employee from "../models/employeeSchema.js";
import User from "../models/user.js";

// Assign multiple users to an employee
export const assignUsersToEmployee = async (req, res) => {
  try {
    // Sub-admin cannot assign users - only Super Admin
    if (req.isAdminEmployee) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Super Admin can assign users."
      });
    }

    const { employeeId, userIds, priority, dueDate, notes } = req.body;
    const adminId = req.user?.id || req.user?._id; // Admin who is assigning

    console.log('User assignment request received:', {
      employeeId,
      userIds,
      priority,
      dueDate,
      notes,
      adminId,
      userObject: req.user
    });

    if (!employeeId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Employee ID and user IDs are required"
      });
    }

    // Verify employee exists and is active
    console.log('🔍 Looking up employee:', employeeId);
    const employee = await Employee.findById(employeeId).populate('role');
    console.log('Employee found:', employee ? `${employee.name} (${employee._id})` : 'NOT FOUND');
    
    if (!employee) {
      console.log('❌ Employee not found, returning 404');
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    // For now, allow all active employees to be assigned user leads
    if (!employee.isActive) {
      console.log('❌ Employee is inactive, returning 400');
      return res.status(400).json({
        success: false,
        message: "Employee is inactive"
      });
    }

    console.log('✅ Employee validated, starting assignment loop...');
    console.log('Processing', userIds.length, 'users');

    const assignments = [];
    const errors = [];

    // Process each user
    console.log('🔄 Entering user processing loop');
    for (const userId of userIds) {
      console.log(`\n🔍 Processing user: ${userId}`);
      try {
        // Check if user exists
        console.log('  📝 Looking up user in database...');
        const user = await User.findById(userId);
        console.log('  User found:', user ? `${user.fullName || user.email} (${user._id})` : 'NOT FOUND');
        
        if (!user) {
          console.log('  ❌ User not found, skipping');
          errors.push({
            userId,
            error: "User not found"
          });
          continue;
        }

        // Check if user is already assigned to this employee with active status
        console.log('  🔍 Checking for existing assignment...');
        const existingAssignment = await UserLeadAssignment.findOne({
          userId,
          employeeId,
          status: 'active'
        });
        console.log('  Existing assignment:', existingAssignment ? 'YES - SKIPPING' : 'NO - PROCEEDING');

        if (existingAssignment) {
          console.log('  ⚠️ User already assigned, skipping');
          errors.push({
            userId,
            error: "User already assigned to this employee"
          });
          continue;
        }

        // Create new assignment
        console.log('  ✨ Creating new assignment...');
        const assignment = new UserLeadAssignment({
          employeeId,
          userId,
          assignedBy: adminId,
          priority: priority || 'medium',
          dueDate: dueDate ? new Date(dueDate) : undefined,
          notes: notes || '',
          status: 'active'
        });

        console.log('  💾 Saving assignment to database...');
        await assignment.save();
        console.log('  ✅ Assignment saved successfully!');
        assignments.push(assignment);

        console.log(`✅ User ${userId} assigned to employee ${employeeId}`);
        console.log('Assignment created:', assignment);
      } catch (error) {
        console.error(`❌ Error assigning user ${userId}:`, error);
        console.error('Error stack:', error.stack);
        errors.push({
          userId,
          error: error.message
        });
      }
    }
    
    console.log('\n🏁 Finished processing all users');

    console.log(`\n📊 Assignment Summary:`);
    console.log(`   ✅ Successful: ${assignments.length}`);
    console.log(`   ❌ Failed: ${errors.length}`);

    res.status(200).json({
      success: true,
      message: `${assignments.length} user leads assigned successfully`,
      data: {
        assignments,
        errors,
        employee: {
          id: employee._id,
          name: employee.name,
          email: employee.email
        }
      }
    });

  } catch (error) {
    console.error("Error assigning user leads:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign user leads",
      error: error.message
    });
  }
};

// Get user leads assigned to an employee
export const getEmployeeUserLeads = async (req, res) => {
  try {
    const employeeId = req.params.employeeId || req.employee?._id || req.user?.id;
    const { status, priority, page = 1, limit = 10 } = req.query;

    const filter = { employeeId };
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const skip = (page - 1) * limit;

    const assignments = await UserLeadAssignment.find(filter)
      .populate('employeeId', 'name email phone')
      .populate('assignedBy', 'fullName email')
      .populate('userId', 'fullName email phone state city street pinCode avatar photosAndVideo lastLogin isEmailVerified isPhoneVerified createdAt updatedAt')
      .sort({ assignedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await UserLeadAssignment.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        assignments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error("Error getting employee user leads:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get employee user leads",
      error: error.message
    });
  }
};

// Get all user lead assignments (admin view)
export const getAllUserLeadAssignments = async (req, res) => {
  try {
    const { employeeId, status, priority, page = 1, limit = 10 } = req.query;
    const adminId = req.user?.id || req.user?._id;

    const filter = {};
    
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Sub-admin restriction: only show user leads for managed employees
    if (req.isAdminEmployee) {
      const subAdmin = await Employee.findById(adminId).select('giveAdminAccess managedEmployees');
      if (subAdmin && subAdmin.giveAdminAccess) {
        const managedIds = subAdmin.managedEmployees || [];
        if (managedIds.length === 0) {
          return res.status(200).json({
            success: true,
            data: { assignments: [], employeeStats: [],
              pagination: { currentPage: 1, totalPages: 0, total: 0, hasNext: false, hasPrev: false }
            }
          });
        }
        // If specific employeeId is requested, verify it's in managedEmployees
        if (filter.employeeId) {
          const isManaged = managedIds.some(id => id.toString() === filter.employeeId.toString());
          if (!isManaged) {
            return res.status(403).json({ success: false, message: "Access denied. Employee not in your managed list." });
          }
        } else {
          // Restrict to only managed employees
          filter.employeeId = { $in: managedIds };
        }
      }
    }

    const skip = (page - 1) * limit;

    const assignments = await UserLeadAssignment.find(filter)
      .populate('employeeId', 'name email phone')
      .populate('assignedBy', 'fullName email')
      .populate('userId', 'fullName email phone state city street pinCode avatar photosAndVideo lastLogin isEmailVerified isPhoneVerified createdAt updatedAt')
      .sort({ assignedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get employee statistics
    const employeeStats = await UserLeadAssignment.aggregate([
      {
        $group: {
          _id: '$employeeId',
          totalAssigned: { $sum: 1 },
          activeLeads: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          completedLeads: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    const total = await UserLeadAssignment.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        assignments,
        employeeStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error("Error getting all user lead assignments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user lead assignments",
      error: error.message
    });
  }
};

// Update user lead assignment status
export const updateUserLeadStatus = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status, notes, action } = req.body;
    const employeeId = req.user.id;

    const assignment = await UserLeadAssignment.findById(assignmentId)
      .populate('userId', 'fullName email phone state city street pinCode avatar photosAndVideo lastLogin isEmailVerified isPhoneVerified createdAt updatedAt');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found"
      });
    }

    // Verify the assignment belongs to this employee (for employee access)
    if (assignment.employeeId.toString() !== employeeId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this assignment"
      });
    }

    // Update status
    assignment.status = status;
    
    // Add completion date if completed
    if (status === 'completed') {
      assignment.completedDate = new Date();
    }

    // Add follow-up notes if provided
    if (notes) {
      assignment.followUps.push({
        notes,
        addedBy: employeeId,
        date: new Date()
      });
    }

    await assignment.save();

    res.status(200).json({
      success: true,
      message: "User lead status updated successfully",
      data: assignment
    });

  } catch (error) {
    console.error("Error updating user lead status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user lead status",
      error: error.message
    });
  }
};

// Unassign user leads from employee
export const unassignUserLeads = async (req, res) => {
  try {
    // Sub-admin cannot unassign users - only Super Admin
    if (req.isAdminEmployee) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Super Admin can unassign users."
      });
    }

    const { assignmentIds } = req.body;
    const adminId = req.user.id;

    if (!assignmentIds || !Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Assignment IDs are required"
      });
    }

    const result = await UserLeadAssignment.deleteMany({
      _id: { $in: assignmentIds }
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} user lead assignments removed successfully`,
      data: {
        deletedCount: result.deletedCount
      }
    });

  } catch (error) {
    console.error("Error unassigning user leads:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unassign user leads",
      error: error.message
    });
  }
};

// Get available employees for user assignment
export const getAvailableEmployeesForUserLeads = async (req, res) => {
  try {
    console.log('Fetching available employees for user lead assignment...');
    
    // Get all active employees except admin
    const employees = await Employee.find({ 
      isActive: true 
    })
    .populate('role', 'name permissions isActive')
    .select('name email phone role isActive')
    .sort({ name: 1 });

    // Filter out admin accounts and inactive roles
    const availableEmployees = employees.filter(employee => {
      // Check if employee has active role
      if (!employee.role || !employee.role.isActive) {
        return false;
      }
      
      // Filter out admin role (you can adjust this condition based on your admin role setup)
      return employee.role.name !== 'Admin' && employee.role.name !== 'Super Admin';
    });

    console.log('Found employees:', availableEmployees.length);
    console.log('Employees data:', availableEmployees);

    res.status(200).json({
      success: true,
      data: availableEmployees,
      message: `${availableEmployees.length} employees available for user assignment`
    });

  } catch (error) {
    console.error("Error getting available employees for user leads:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get available employees",
      error: error.message
    });
  }
};

// Get available users for assignment (users not currently assigned to any employee)
export const getAvailableUsers = async (req, res) => {
  try {
    console.log('Fetching available users for assignment...');
    
    // Get all active users
    const allUsers = await User.find({ 
      // Add any filters you want, e.g., active users only
    })
    .select('fullName email mobileNumber createdAt')
    .sort({ fullName: 1 });

    console.log('Found users:', allUsers.length);

    res.status(200).json({
      success: true,
      data: allUsers,
      message: `${allUsers.length} users available for assignment`
    });

  } catch (error) {
    console.error("Error getting available users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get available users",
      error: error.message
    });
  }
};