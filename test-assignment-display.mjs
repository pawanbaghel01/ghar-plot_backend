#!/usr/bin/env node
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Import models
import './config/db.js';
import Employee from './models/employeeSchema.js';
import Inquiry from './models/inquirySchema.js';
import ManualInquiry from './models/manualInquirySchema.js';
import LeadAssignment from './models/leadAssignmentSchema.js';

console.log('🧪 Testing Assignment Display Feature...\n');

async function testAssignmentDisplay() {
  try {
    // Step 1: Find an employee
    const employee = await Employee.findOne({}).populate('role');
    if (!employee) {
      console.log('❌ No employees found. Please create employees first.');
      return;
    }
    
    console.log(`👤 Found employee: ${employee.name} (${employee.email})`);

    // Step 2: Find a regular inquiry and manual inquiry to assign
    const inquiry = await Inquiry.findOne();
    const manualInquiry = await ManualInquiry.findOne();
    
    if (!inquiry && !manualInquiry) {
      console.log('❌ No enquiries found to assign.');
      return;
    }

    // Step 3: Create admin token for assignment
    const adminToken = jwt.sign(
      { id: 'admin123', email: 'admin@company.com', isAdmin: true },
      '1234'
    );

    // Step 4: Assign inquiries if they exist
    const assignmentData = {
      employeeId: employee._id,
      enquiries: [],
      priority: 'high',
      notes: 'Test assignment for display'
    };

    if (inquiry) {
      // Check if already assigned
      const existingAssignment = await LeadAssignment.findOne({
        enquiryId: inquiry._id,
        enquiryType: 'Inquiry',
        status: { $in: ['active', 'pending', 'in-progress'] }
      });
      
      if (!existingAssignment) {
        assignmentData.enquiries.push({
          enquiryId: inquiry._id,
          enquiryType: 'Inquiry'
        });
      }
    }

    if (manualInquiry) {
      // Check if already assigned
      const existingAssignment = await LeadAssignment.findOne({
        enquiryId: manualInquiry._id,
        enquiryType: 'ManualInquiry',
        status: { $in: ['active', 'pending', 'in-progress'] }
      });
      
      if (!existingAssignment) {
        assignmentData.enquiries.push({
          enquiryId: manualInquiry._id,
          enquiryType: 'ManualInquiry'
        });
      }
    }

    if (assignmentData.enquiries.length > 0) {
      console.log('\n📝 Assigning leads...');
      const assignResponse = await fetch('http://localhost:4000/admin/leads/assign', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(assignmentData)
      });

      const assignResult = await assignResponse.json();
      console.log('✅ Assignment result:', assignResult.success ? 'Success' : 'Failed');
      if (assignResult.message) console.log('   Message:', assignResult.message);
    } else {
      console.log('\n✅ All enquiries already assigned');
    }

    // Step 5: Test the APIs to see if assignment information is returned
    console.log('\n🔍 Testing API responses...');
    
    // Test regular enquiry API
    const enquiryResponse = await fetch('http://localhost:4000/api/inquiry/get-enquiries');
    const enquiryData = await enquiryResponse.json();
    
    console.log('\n📊 Regular Enquiry API Test:');
    if (enquiryData.data && enquiryData.data.length > 0) {
      const firstEnquiry = enquiryData.data[0];
      console.log('   Enquiry ID:', firstEnquiry._id);
      console.log('   Assignment:', firstEnquiry.assignment ? 
        `✅ Assigned to ${firstEnquiry.assignment.employeeName} (${firstEnquiry.assignment.status})` : 
        '❌ Not assigned'
      );
    } else {
      console.log('   ❌ No enquiries found');
    }

    // Test manual enquiry API
    const manualResponse = await fetch('http://localhost:4000/api/inquiry/all');
    const manualData = await manualResponse.json();
    
    console.log('\n📊 Manual Enquiry API Test:');
    if (manualData.data && manualData.data.length > 0) {
      const firstManual = manualData.data[0];
      console.log('   Manual Enquiry ID:', firstManual._id);
      console.log('   Assignment:', firstManual.assignment ? 
        `✅ Assigned to ${firstManual.assignment.employeeName} (${firstManual.assignment.status})` : 
        '❌ Not assigned'
      );
    } else {
      console.log('   ❌ No manual enquiries found');
    }

    // Step 6: Test frontend access
    console.log('\n🌐 Frontend Access:');
    console.log('   Dashboard URL: http://localhost:5174');
    console.log('   Enquiries Page: http://localhost:5174/enquiries');
    console.log('\n💡 Check the Enquiries page to see assignment information in the "Assigned Employee" column');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

testAssignmentDisplay();