import USPEmployee from "../models/uspEmployeeSchema.js";
import USPCategory from "../models/uspCategorySchema.js";
import Employee from "../models/employeeSchema.js";

// Add employee to category by employee ID
export const addEmployeeByID = async (req, res) => {
  try {
    const { employeeId, categoryId, expertise, experienceYears, description } =
      req.body;

    if (!employeeId || !categoryId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID and Category ID are required",
      });
    }

    // Check if category exists
    const category = await USPCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Check if employee already exists in this category
    const existingEntry = await USPEmployee.findOne({
      employee: employeeId,
      category: categoryId,
    });

    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: "Employee already exists in this category",
      });
    }

    const uspEmployee = new USPEmployee({
      category: categoryId,
      employee: employeeId,
      employeeType: "system",
      expertise,
      experienceYears,
      description,
    });

    await uspEmployee.save();

    const populatedEmployee = await USPEmployee.findById(uspEmployee._id)
      .populate("category", "name description")
      .populate("employee", "name email phone");

    res.status(201).json({
      success: true,
      message: "Employee added to category successfully",
      data: populatedEmployee,
    });
  } catch (error) {
    console.error("Error adding employee to category:", error);
    res.status(500).json({
      success: false,
      message: "Error adding employee to category",
      error: error.message,
    });
  }
};

// Add employee manually to category
export const addEmployeeManually = async (req, res) => {
  try {
    const {
      categoryId,
      name,
      phone,
      expertise,
      experienceYears,
      description,
    } = req.body;

    if (!categoryId || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Category ID, Name, and Phone are required",
      });
    }

    // Check if category exists
    const category = await USPCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const uspEmployee = new USPEmployee({
      category: categoryId,
      manualName: name,
      manualPhone: phone,
      employeeType: "manual",
      expertise,
      experienceYears,
      description,
    });

    await uspEmployee.save();

    const populatedEmployee = await USPEmployee.findById(
      uspEmployee._id
    ).populate("category", "name description");

    res.status(201).json({
      success: true,
      message: "Employee added manually to category successfully",
      data: populatedEmployee,
    });
  } catch (error) {
    console.error("Error adding manual employee:", error);
    res.status(500).json({
      success: false,
      message: "Error adding manual employee",
      error: error.message,
    });
  }
};

// Get all USP employees
export const getAllUSPEmployees = async (req, res) => {
  try {
    const employees = await USPEmployee.find({ isActive: true })
      .populate("category", "name description")
      .populate("employee", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    console.error("Error fetching USP employees:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching USP employees",
      error: error.message,
    });
  }
};

// Get employees by category
export const getEmployeesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Check if category exists
    const category = await USPCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const employees = await USPEmployee.find({
      category: categoryId,
      isActive: true,
    })
      .populate("category", "name description")
      .populate("employee", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: employees.length,
      category: category.name,
      data: employees,
    });
  } catch (error) {
    console.error("Error fetching employees by category:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching employees by category",
      error: error.message,
    });
  }
};

// Get single USP employee by ID
export const getUSPEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await USPEmployee.findById(id)
      .populate("category", "name description")
      .populate("employee", "name email phone");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "USP Employee not found",
      });
    }

    res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Error fetching USP employee:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching USP employee",
      error: error.message,
    });
  }
};

// Update USP employee
export const updateUSPEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      categoryId,
      expertise,
      experienceYears,
      description,
      isActive,
      manualName,
      manualPhone,
    } = req.body;

    const uspEmployee = await USPEmployee.findById(id);

    if (!uspEmployee) {
      return res.status(404).json({
        success: false,
        message: "USP Employee not found",
      });
    }

    // If updating category, check if it exists
    if (categoryId) {
      const category = await USPCategory.findById(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
      uspEmployee.category = categoryId;
    }

    if (expertise !== undefined) uspEmployee.expertise = expertise;
    if (experienceYears !== undefined)
      uspEmployee.experienceYears = experienceYears;
    if (description !== undefined) uspEmployee.description = description;
    if (isActive !== undefined) uspEmployee.isActive = isActive;

    // Update manual fields only for manual employees
    if (uspEmployee.employeeType === "manual") {
      if (manualName) uspEmployee.manualName = manualName;
      if (manualPhone) uspEmployee.manualPhone = manualPhone;
    }

    await uspEmployee.save();

    const updatedEmployee = await USPEmployee.findById(id)
      .populate("category", "name description")
      .populate("employee", "name email phone");

    res.status(200).json({
      success: true,
      message: "USP Employee updated successfully",
      data: updatedEmployee,
    });
  } catch (error) {
    console.error("Error updating USP employee:", error);
    res.status(500).json({
      success: false,
      message: "Error updating USP employee",
      error: error.message,
    });
  }
};

// Delete employee from category
export const deleteUSPEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const uspEmployee = await USPEmployee.findById(id);

    if (!uspEmployee) {
      return res.status(404).json({
        success: false,
        message: "USP Employee not found",
      });
    }

    await USPEmployee.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Employee removed from category successfully",
    });
  } catch (error) {
    console.error("Error deleting USP employee:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting USP employee",
      error: error.message,
    });
  }
};

// Get categories with employee count
export const getCategoriesWithCount = async (req, res) => {
  try {
    const categories = await USPCategory.find({ isActive: true });

    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await USPEmployee.countDocuments({
          category: category._id,
          isActive: true,
        });

        return {
          _id: category._id,
          name: category.name,
          description: category.description,
          employeeCount: count,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: categoriesWithCount.length,
      data: categoriesWithCount,
    });
  } catch (error) {
    console.error("Error fetching categories with count:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching categories with count",
      error: error.message,
    });
  }
};
