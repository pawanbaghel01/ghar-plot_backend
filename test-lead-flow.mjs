// Test lead assignment flow end-to-end
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Employee from "./models/employeeSchema.js";
import Role from "./models/roleSchema.js";
import Inquiry from "./models/inquirySchema.js";
import LeadAssignment from "./models/leadAssignmentSchema.js";
import dotenv from "dotenv";
import fetch from 'node-fetch';

dotenv.config();

async function testLeadFlow() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_CONN);
    console.log("✅ Connected to MongoDB");

    // Get first active employee
    const employee = await Employee.findOne({ isActive: true }).populate('role');
    if (!employee) {
      console.log("❌ No active employee found");
      return;
    }

    console.log(`\n📋 Testing with Employee: ${employee.name} (${employee.email})`);
    console.log(`   Role: ${employee.role?.name}`);
    console.log(`   Permissions:`, employee.role?.permissions?.map(p => `${p.module}:${p.actions.join(',')}`));

    // Generate employee token
    const token = jwt.sign(
      { id: employee._id, email: employee.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Check existing lead assignments for this employee
    const existingAssignments = await LeadAssignment.find({ employeeId: employee._id })
      .populate({
        path: 'enquiryId',
        refPath: 'enquiryType',
        select: 'fullName email contactNumber'
      })
      .sort({ assignedDate: -1 });

    console.log(`\n📊 Existing Lead Assignments for ${employee.name}: ${existingAssignments.length}`);
    existingAssignments.forEach((assignment, index) => {
      console.log(`   ${index + 1}. Inquiry: ${assignment.enquiryId?.fullName} (${assignment.enquiryId?.email})`);
      console.log(`      Status: ${assignment.status}, Assigned: ${assignment.assignedDate}, Type: ${assignment.enquiryType}`);
    });

    // Check total inquiries in system
    const totalInquiries = await Inquiry.countDocuments();
    console.log(`\n📈 Total Inquiries in System: ${totalInquiries}`);

    // Test employee leads endpoint
    console.log(`\n🔍 Testing Employee Leads API: /employee/leads/my-leads`);
    const response = await fetch(`http://localhost:4000/employee/leads/my-leads`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Response Status: ${response.status}`);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log(`   ✅ Success: Found ${data.data ? data.data.length : 'N/A'} leads`);
      if (data.data && data.data.length > 0) {
        console.log(`   First lead: ${data.data[0].inquiryId?.fullName || 'N/A'}`);
      }
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Error: ${errorText}`);
    }

    // Test user leads endpoint too
    console.log(`\n🔍 Testing User Leads API: /employee/user-leads/my-leads`);
    const userLeadsResponse = await fetch(`http://localhost:4000/employee/user-leads/my-leads`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Response Status: ${userLeadsResponse.status}`);
    
    if (userLeadsResponse.status === 200) {
      const userData = await userLeadsResponse.json();
      console.log(`   ✅ Success: Found ${userData.data ? userData.data.length : 'N/A'} user leads`);
      if (userData.data && userData.data.length > 0) {
        console.log(`   First user lead: ${userData.data[0].userId?.name || 'N/A'}`);
      }
    } else {
      const errorText = await userLeadsResponse.text();
      console.log(`   ❌ Error: ${errorText}`);
    }

    // If no assignments exist, let's check if there are unassigned inquiries
    if (existingAssignments.length === 0) {
      const unassignedInquiries = await Inquiry.find({});
      console.log(`\n🔍 Checking for Unassigned Inquiries: ${unassignedInquiries.length} total inquiries found`);
      
      if (unassignedInquiries.length > 0) {
        const sampleInquiry = unassignedInquiries[0];
        console.log(`   Sample Inquiry: ${sampleInquiry.fullName} (${sampleInquiry.email})`);
        console.log(`   Created: ${sampleInquiry.createdAt}`);
        
        // Check if this inquiry has any assignments
        const assignments = await LeadAssignment.find({ 
          enquiryId: sampleInquiry._id, 
          enquiryType: 'Inquiry' 
        });
        console.log(`   Assignments for this inquiry: ${assignments.length}`);
      }
    }

    mongoose.disconnect();
    console.log("\n✅ Test completed");

  } catch (error) {
    console.error("❌ Test failed:", error);
    mongoose.disconnect();
  }
}

testLeadFlow();