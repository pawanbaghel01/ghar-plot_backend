// Check lead assignments in the database
import mongoose from "mongoose";
import dotenv from "dotenv";
import LeadAssignment from "./models/leadAssignmentSchema.js";
import UserLeadAssignment from "./models/userLeadAssignmentSchema.js";

dotenv.config();

async function checkLeadAssignments() {
  try {
    await mongoose.connect(process.env.MONGO_CONN);
    console.log("Connected to MongoDB");

    // Check enquiry lead assignments
    const enquiryLeads = await LeadAssignment.find({})
      .populate('employeeId', 'name email')
      .populate('assignedBy', 'fullName email')
      .sort({ assignedDate: -1 });
    
    console.log(`\n📋 Found ${enquiryLeads.length} Enquiry Lead Assignments:`);
    enquiryLeads.forEach((lead, index) => {
      console.log(`${index + 1}. Employee: ${lead.employeeId?.name || 'N/A'} (${lead.employeeId?.email || 'N/A'})`);
      console.log(`   Enquiry ID: ${lead.enquiryId}`);
      console.log(`   Type: ${lead.enquiryType}`);
      console.log(`   Status: ${lead.status}`);
      console.log(`   Priority: ${lead.priority}`);
      console.log(`   Assigned By: ${lead.assignedBy?.fullName || 'N/A'}`);
      console.log(`   Assigned Date: ${lead.assignedDate}`);
      console.log('---');
    });

    // Check user lead assignments
    const userLeads = await UserLeadAssignment.find({})
      .populate('employeeId', 'name email')
      .populate('assignedBy', 'fullName email')
      .populate('userId', 'fullName email')
      .sort({ assignedDate: -1 });
    
    console.log(`\n👥 Found ${userLeads.length} User Lead Assignments:`);
    userLeads.forEach((lead, index) => {
      console.log(`${index + 1}. Employee: ${lead.employeeId?.name || 'N/A'} (${lead.employeeId?.email || 'N/A'})`);
      console.log(`   User/Client: ${lead.userId?.fullName || 'N/A'} (${lead.userId?.email || 'N/A'})`);
      console.log(`   Status: ${lead.status}`);
      console.log(`   Priority: ${lead.priority}`);
      console.log(`   Assigned By: ${lead.assignedBy?.fullName || 'N/A'}`);
      console.log(`   Assigned Date: ${lead.assignedDate}`);
      console.log('---');
    });

    mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    mongoose.disconnect();
  }
}

checkLeadAssignments();