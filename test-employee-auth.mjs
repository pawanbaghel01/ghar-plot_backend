// Test script to check employee token authentication
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Employee from "./models/employeeSchema.js";
import Role from "./models/roleSchema.js";
import dotenv from "dotenv";

dotenv.config();

async function testEmployeeAuth() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_CONN);
    console.log("Connected to MongoDB");

    // Get all employees
    const employees = await Employee.find({}).populate('role');
    console.log("Found employees:", employees.length);
    
    employees.forEach((emp, index) => {
      console.log(`Employee ${index + 1}:`);
      console.log(`  ID: ${emp._id}`);
      console.log(`  Name: ${emp.name}`);
      console.log(`  Email: ${emp.email}`);
      console.log(`  Active: ${emp.isActive}`);
      console.log(`  Role: ${emp.role?.name || 'No role'}`);
      console.log(`  Role Active: ${emp.role?.isActive || 'N/A'}`);
      console.log(`  Permissions:`, emp.role?.permissions || 'No permissions');
      console.log('---');
    });

    // Test JWT creation for first employee
    if (employees.length > 0) {
      const testEmployee = employees[0];
      const token = jwt.sign(
        { id: testEmployee._id, email: testEmployee.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      console.log("Generated test token:", token);

      // Test JWT decoding
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded);
    }

    mongoose.disconnect();
  } catch (error) {
    console.error("Test failed:", error);
    mongoose.disconnect();
  }
}

testEmployeeAuth();