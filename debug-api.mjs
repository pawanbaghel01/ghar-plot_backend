// Debug API response format
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Employee from "./models/employeeSchema.js";
import Role from "./models/roleSchema.js";
import dotenv from "dotenv";
import fetch from 'node-fetch';

dotenv.config();

async function debugAPIResponse() {
  try {
    await mongoose.connect(process.env.MONGO_CONN);
    console.log("✅ Connected to MongoDB");

    const employee = await Employee.findOne({ isActive: true });
    console.log(`\n📋 Testing with Employee: ${employee.name}`);

    const token = jwt.sign(
      { id: employee._id, email: employee.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Test the API and log the full response
    const response = await fetch(`http://localhost:4000/employee/leads/my-leads`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`\n🔍 API Response Debug:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`   Raw Response: ${responseText}`);
    
    try {
      const jsonData = JSON.parse(responseText);
      console.log(`   Parsed JSON:`, JSON.stringify(jsonData, null, 2));
      
      if (jsonData.data) {
        console.log(`   Data structure:`, Object.keys(jsonData.data));
        if (jsonData.data.assignments) {
          console.log(`   Assignments length:`, jsonData.data.assignments.length);
        }
      }
    } catch (e) {
      console.log(`   JSON Parse Error: ${e.message}`);
    }

    mongoose.disconnect();

  } catch (error) {
    console.error("❌ Test failed:", error);
    mongoose.disconnect();
  }
}

debugAPIResponse();