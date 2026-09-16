#!/usr/bin/env node
import mongoose from 'mongoose';

// Import models
import './config/db.js';
import LeadAssignment from './models/leadAssignmentSchema.js';

console.log('🔍 Checking Lead Assignments in Database...\n');

async function checkAssignments() {
  try {
    await new Promise(resolve => {
      mongoose.connection.once('open', resolve);
    });

    const assignments = await LeadAssignment.find({})
      .populate('employeeId', 'name email')
      .populate('enquiryId');
    
    console.log(`📊 Total assignments found: ${assignments.length}`);
    
    assignments.forEach((assignment, index) => {
      console.log(`\n${index + 1}. Assignment ID: ${assignment._id}`);
      console.log(`   Employee: ${assignment.employeeId?.name || 'N/A'} (${assignment.employeeId?.email || 'N/A'})`);
      console.log(`   Enquiry ID: ${assignment.enquiryId}`);
      console.log(`   Enquiry Type: ${assignment.enquiryType}`);
      console.log(`   Status: ${assignment.status}`);
      console.log(`   Priority: ${assignment.priority}`);
      console.log(`   Assigned Date: ${assignment.assignedDate}`);
    });

    if (assignments.length === 0) {
      console.log('\n❌ No assignments found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

checkAssignments();