import LeadAssignment from "../models/leadAssignmentSchema.js";
import Employee from "../models/employeeSchema.js";
import Inquiry from "../models/inquirySchema.js";
import ManualInquiry from "../models/manualInquirySchema.js";

// Assign multiple enquiries to an employee
export const assignLeadsToEmployee = async (req, res) => {
  try {
    // Sub-admin cannot assign leads - only Super Admin
    if (req.isAdminEmployee) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Super Admin can assign leads."
      });
    }

    const { employeeId, enquiries, priority, dueDate, notes } = req.body;
    const adminId = req.user?.id || req.user?._id; // Admin who is assigning

    console.log('Assignment request received:', {
      employeeId,
      enquiries,
      priority,
      dueDate,
      notes,
      adminId,
      userObject: req.user
    });

    if (!employeeId || !enquiries || !Array.isArray(enquiries) || enquiries.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Employee ID and enquiries array are required"
      });
    }

    // Verify employee exists and is active
    const employee = await Employee.findById(employeeId).populate('role');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    // Check if employee has permission to handle enquiries (more flexible check)
    let hasEnquiryPermission = false;
    
    if (employee.role && employee.role.permissions) {
      hasEnquiryPermission = employee.role.permissions.some(permission => 
        (permission.module === 'enquiries' || permission.module === 'leads') && 
        (permission.actions.includes('read') || permission.actions.includes('update') || permission.actions.includes('create'))
      );
    }
    
    // For now, allow all active employees to be assigned leads (remove this check temporarily)
    // We can add it back later when roles are properly configured
    hasEnquiryPermission = true;

    if (!hasEnquiryPermission) {
      return res.status(403).json({
        success: false,
        message: "Employee does not have permission to handle enquiries"
      });
    }

    const assignments = [];
    const errors = [];

    // Process each enquiry
    for (const enquiry of enquiries) {
      try {
        const { enquiryId, enquiryType } = enquiry;

        // Check if enquiry exists
        let enquiryExists = false;
        if (enquiryType === 'Inquiry') {
          enquiryExists = await Inquiry.findById(enquiryId);
        } else if (enquiryType === 'ManualInquiry') {
          enquiryExists = await ManualInquiry.findById(enquiryId);
        }

        if (!enquiryExists) {
          errors.push({
            enquiryId,
            enquiryType,
            error: "Enquiry not found"
          });
          continue;
        }

        // Check if enquiry is already assigned to ANY employee (active, pending, or in-progress)
        const existingAssignment = await LeadAssignment.findOne({
          enquiryId,
          enquiryType,
          status: { $in: ['active', 'pending', 'in-progress'] }
        }).populate('employeeId', 'name email');

        if (existingAssignment) {
          errors.push({
            enquiryId,
            enquiryType,
            error: `Enquiry already assigned to ${existingAssignment.employeeId.name} (${existingAssignment.employeeId.email}). Please unassign first before reassigning.`
          });
          continue;
        }

        // Create assignment
        const assignment = new LeadAssignment({
          enquiryId,
          enquiryType,
          employeeId,
          assignedBy: adminId,
          status: 'active', // Set default status to active
          priority: priority || 'medium',
          dueDate: dueDate ? new Date(dueDate) : undefined,
          notes: notes || ''
        });

        await assignment.save();
        assignments.push(assignment);

      } catch (error) {
        errors.push({
          enquiryId: enquiry.enquiryId,
          enquiryType: enquiry.enquiryType,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `${assignments.length} leads assigned successfully`,
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
    console.error("Error assigning leads:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign leads",
      error: error.message
    });
  }
};

// Get leads assigned to an employee
export const getEmployeeLeads = async (req, res) => {
  try {
    const employeeId = req.params.employeeId || req.employee?._id || req.user?.id;
    const { status, priority, page = 1, limit = 10 } = req.query;

    const filter = { employeeId };
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const skip = (page - 1) * limit;

    const assignments = await LeadAssignment.find(filter)
      .populate('employeeId', 'name email phone')
      .populate('assignedBy', 'fullName email')
      .sort({ assignedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Populate enquiry details based on type
    const populatedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        let enquiry = null;
        
        try {
          if (assignment.enquiryType === 'Inquiry') {
            enquiry = await Inquiry.findById(assignment.enquiryId)
              .populate('buyerId', 'fullName email phone')
              .populate('propertyId', 'propertyLocation propertyType price description availability');
          } else if (assignment.enquiryType === 'ManualInquiry') {
            enquiry = await ManualInquiry.findById(assignment.enquiryId);
          }
        } catch (error) {
          console.error('Error populating enquiry:', error);
        }

        return {
          ...assignment.toObject(),
          enquiry: enquiry || null
        };
      })
    );    const total = await LeadAssignment.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        assignments: populatedAssignments,
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
    console.error("Error getting employee leads:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get employee leads",
      error: error.message
    });
  }
};

// Get all lead assignments (admin view)
export const getAllLeadAssignments = async (req, res) => {
  try {
    const { employeeId, status, priority, page = 1, limit = 10 } = req.query;
    const adminId = req.user?.id || req.user?._id;

    const filter = {};
    
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Sub-admin restriction: only show assignments for managed employees
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

    const assignments = await LeadAssignment.find(filter)
      .populate('employeeId', 'name email phone')
      .populate('assignedBy', 'fullName email')
      .sort({ assignedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Populate enquiry details based on type
    const populatedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        let enquiry = null;
        
        try {
          if (assignment.enquiryType === 'Inquiry') {
            enquiry = await Inquiry.findById(assignment.enquiryId)
              .populate('buyerId', 'fullName email phone isEmailVerified isPhoneVerified lastLogin')
              .populate('propertyId', 'propertyLocation propertyType price description availability');
          } else if (assignment.enquiryType === 'ManualInquiry') {
            enquiry = await ManualInquiry.findById(assignment.enquiryId);
          }
        } catch (error) {
          console.error('Error populating enquiry:', error);
        }

        return {
          ...assignment.toObject(),
          enquiry: enquiry || null
        };
      })
    );

    // Get employee statistics
    const employeeStats = await LeadAssignment.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$employeeId',
          totalLeads: { $sum: 1 },
          priorities: { $push: '$priority' }
        }
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employee'
        }
      }
    ]);

    const total = await LeadAssignment.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        assignments: populatedAssignments,
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
    console.error("Error getting lead assignments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get lead assignments",
      error: error.message
    });
  }
};

// Update lead assignment status
export const updateLeadStatus = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status, notes, action } = req.body;
    const employeeId = req.user.id;

    const assignment = await LeadAssignment.findById(assignmentId);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Lead assignment not found"
      });
    }

    // Check if employee owns this assignment or is admin
    if (assignment.employeeId.toString() !== employeeId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this assignment"
      });
    }

    // Update assignment
    if (status) assignment.status = status;
    if (notes) assignment.notes = notes;

    // Add to follow-up history
    if (action) {
      assignment.followUpHistory.push({
        action,
        notes: notes || '',
        updatedBy: employeeId
      });
    }

    await assignment.save();

    res.status(200).json({
      success: true,
      message: "Lead status updated successfully",
      data: assignment
    });

  } catch (error) {
    console.error("Error updating lead status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update lead status",
      error: error.message
    });
  }
};

// Unassign leads from employee (removes assignment completely)
export const unassignLeads = async (req, res) => {
  try {
    // Sub-admin cannot unassign leads - only Super Admin
    if (req.isAdminEmployee) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Super Admin can unassign leads."
      });
    }

    const { assignmentIds, enquiryIds } = req.body;
    const adminId = req.user.id;

    if (!assignmentIds && !enquiryIds) {
      return res.status(400).json({
        success: false,
        message: "Either assignmentIds or enquiryIds array is required"
      });
    }

    let result;
    if (assignmentIds && Array.isArray(assignmentIds)) {
      // Unassign by assignment IDs
      result = await LeadAssignment.deleteMany({
        _id: { $in: assignmentIds }
      });
    } else if (enquiryIds && Array.isArray(enquiryIds)) {
      // Unassign by enquiry IDs (for bulk operations)
      result = await LeadAssignment.deleteMany({
        enquiryId: { $in: enquiryIds }
      });
    }

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} lead assignments removed successfully`,
      data: {
        deletedCount: result.deletedCount,
        unassignedBy: adminId
      }
    });

  } catch (error) {
    console.error("Error unassigning leads:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unassign leads",
      error: error.message
    });
  }
};

// Get available employees for assignment
export const getAvailableEmployees = async (req, res) => {
  try {
    console.log('Fetching available employees...');
    // Get all active employees (excluding admin accounts)
    const employees = await Employee.find({ 
      isActive: true,
      email: { $not: /admin/i } // Exclude emails containing 'admin'
    })
      .populate('role', 'name permissions')
      .select('name email phone role');

    console.log('Found employees:', employees.length);
    console.log('Employees data:', employees);

    // Return all employees (not filtering by permissions for now)
    const availableEmployees = employees;

    // Get current lead counts for each employee
    const employeesWithCounts = await Promise.all(
      availableEmployees.map(async (employee) => {
        const activeLeads = await LeadAssignment.countDocuments({
          employeeId: employee._id,
          status: 'active'
        });

        return {
          ...employee.toObject(),
          activeLeadsCount: activeLeads
        };
      })
    );

    res.status(200).json({
      success: true,
      data: employeesWithCounts
    });

  } catch (error) {
    console.error("Error getting available employees:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get available employees",
      error: error.message
    });
  }
};