import Employee from "../models/employeeSchema.js";
import Role from "../models/roleSchema.js";

// Simple test to create a sample employee if none exist
export const createTestEmployee = async (req, res) => {
  try {
    // Check if any employees exist
    const existingEmployees = await Employee.find({});
    console.log('Existing employees count:', existingEmployees.length);
    
    if (existingEmployees.length === 0) {
      // Create a test role first
      let testRole = await Role.findOne({ name: 'Employee' });
      
      if (!testRole) {
        testRole = new Role({
          name: 'Employee',
          permissions: [
            {
              module: 'enquiries',
              actions: ['read', 'update']
            },
            {
              module: 'leads',
              actions: ['read', 'update']
            }
          ]
        });
        await testRole.save();
        console.log('Created test role');
      }
      
      // Create a test employee
      const testEmployee = new Employee({
        name: 'John Doe',
        email: 'john.doe@company.com',
        phone: '9876543210',
        password: 'password123', // In real app, this should be hashed
        role: testRole._id,
        isActive: true
      });
      
      await testEmployee.save();
      console.log('Created test employee');
      
      res.json({
        success: true,
        message: 'Test employee created',
        employee: {
          name: testEmployee.name,
          email: testEmployee.email,
          phone: testEmployee.phone
        }
      });
    } else {
      res.json({
        success: true,
        message: 'Employees already exist',
        count: existingEmployees.length,
        employees: existingEmployees.map(emp => ({
          name: emp.name,
          email: emp.email,
          isActive: emp.isActive
        }))
      });
    }
    
  } catch (error) {
    console.error('Error in createTestEmployee:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating test employee',
      error: error.message
    });
  }
};