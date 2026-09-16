import Role from "../models/roleSchema.js";
import Employee from "../models/employeeSchema.js";

// Create new role
export const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    // Check if role name already exists
    const existingRole = await Role.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: "Role with this name already exists"
      });
    }

    // Create new role
    const newRole = new Role({
      name,
      description,
      permissions,
      createdBy: req.user?.id || null
    });

    const savedRole = await newRole.save();

    res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: savedRole
    });
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get all roles
export const getAllRoles = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", isActive } = req.query;
    
    const query = {};
    
    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Add active filter
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const roles = await Role.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Role.countDocuments(query);

    res.status(200).json({
      success: true,
      data: roles,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRoles: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get role by ID
export const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id).populate('createdBy', 'name email');
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found"
      });
    }

    res.status(200).json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error("Error fetching role:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Update role
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, isActive } = req.body;

    // Check if role exists
    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found"
      });
    }

    // Check if new name conflicts with existing roles (excluding current role)
    if (name && name !== role.name) {
      const existingRole = await Role.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id }
      });
      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: "Role with this name already exists"
        });
      }
    }

    // Update role
    const updatedRole = await Role.findByIdAndUpdate(
      id,
      {
        name,
        description,
        permissions,
        isActive,
        updatedAt: Date.now()
      },
      { new: true }
    ).populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: updatedRole
    });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Delete role
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if role exists
    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found"
      });
    }

    // Check if any employees are assigned to this role
    const employeeCount = await Employee.countDocuments({ role: id });
    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role. ${employeeCount} employee(s) are assigned to this role.`
      });
    }

    await Role.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Role deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get available permissions/modules
export const getAvailablePermissions = async (req, res) => {
  try {
    const modules = [
      { value: 'dashboard', label: 'Dashboard', description: 'Access to main dashboard and analytics' },
      { value: 'properties', label: 'Properties', description: 'Manage property listings and details' },
      { value: 'users', label: 'Users', description: 'Manage user accounts and profiles' },
      { value: 'categories', label: 'Categories', description: 'Manage property categories' },
      { value: 'recent', label: 'Recent Activities', description: 'View recent system activities' },
      { value: 'bought-property', label: 'Bought Properties', description: 'Manage purchased properties' },
      { value: 'settings', label: 'Settings', description: 'System configuration and settings' },
      { value: 'security', label: 'Security', description: 'Security settings and permissions' },
      { value: 'reports-complaints', label: 'Reports & Complaints', description: 'Handle reports and complaints' },
      { value: 'service-management', label: 'Service Management', description: 'Manage services and providers' },
      { value: 'enquiries', label: 'Enquiries', description: 'Handle customer enquiries' },
      { value: 'roles', label: 'Role Management', description: 'Create and manage user roles' },
      { value: 'employees', label: 'Employee Management', description: 'Manage employee accounts' }
    ];

    const actions = [
      { value: 'create', label: 'Create', description: 'Add new records' },
      { value: 'read', label: 'Read', description: 'View and access records' },
      { value: 'update', label: 'Update', description: 'Modify existing records' },
      { value: 'delete', label: 'Delete', description: 'Remove records' }
    ];

    res.status(200).json({
      success: true,
      data: {
        modules,
        actions
      }
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};