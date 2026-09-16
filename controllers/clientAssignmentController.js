import Employee from "../models/employeeSchema.js";
import Role from "../models/roleSchema.js";

// Assign client to employee (placeholder functionality)
export const assignClientToEmployee = async (req, res) => {
  try {
    const { employeeId, clientId, clientData } = req.body;

    // Verify employee exists
    const employee = await Employee.findById(employeeId)
      .populate('role', 'name permissions');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    // Check if employee has permission to handle clients
    const hasClientPermission = employee.role.permissions.some(perm => 
      (perm.module === 'users' || perm.module === 'enquiries') && 
      perm.actions.includes('read')
    );

    if (!hasClientPermission) {
      return res.status(403).json({
        success: false,
        message: "Employee does not have permission to handle clients"
      });
    }

    // For now, just return success (you can extend this with actual client assignment logic)
    res.status(200).json({
      success: true,
      message: "Client assigned successfully",
      data: {
        employeeId,
        clientId,
        employeeName: employee.name,
        assignedAt: new Date()
      }
    });
  } catch (error) {
    console.error("Error assigning client:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get assignments for an employee
export const getEmployeeAssignments = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Verify employee exists
    const employee = await Employee.findById(employeeId)
      .populate('role', 'name permissions');
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    // For now, return empty assignments (you can extend this with actual assignment data)
    res.status(200).json({
      success: true,
      data: {
        employee: {
          id: employee._id,
          name: employee.name,
          email: employee.email,
          role: employee.role.name
        },
        assignments: [] // This would contain actual client assignments
      }
    });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Unassign client from employee
export const unassignClient = async (req, res) => {
  try {
    const { employeeId, clientId } = req.body;

    // For now, just return success (you can extend this with actual unassignment logic)
    res.status(200).json({
      success: true,
      message: "Client unassigned successfully",
      data: {
        employeeId,
        clientId,
        unassignedAt: new Date()
      }
    });
  } catch (error) {
    console.error("Error unassigning client:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};