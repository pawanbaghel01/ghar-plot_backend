#!/usr/bin/env node
import mongoose from 'mongoose';

// Import models
import './config/db.js';
import LeadAssignment from './models/leadAssignmentSchema.js';

console.log('🔍 Testing Assignment Lookup...\n');

async function testLookup() {
  try {
    await new Promise(resolve => {
      mongoose.connection.once('open', () => {
        console.log('✅ Connected to database');
        resolve();
      });
    });

    // Test the exact lookup that the controller does
    const enquiryId = '6902f0fa96a219c4c6494afb';
    console.log(`🔍 Looking for assignment for enquiry: ${enquiryId}`);

    const assignment = await LeadAssignment.findOne({
      enquiryId: enquiryId,
      enquiryType: 'Inquiry',
      status: { $in: ['active', 'pending', 'in-progress'] }
    }).populate('employeeId', 'name email');

    console.log('\n📋 Assignment result:');
    if (assignment) {
      console.log('✅ Assignment found!');
      console.log('   Assignment ID:', assignment._id);
      console.log('   Employee ID:', assignment.employeeId._id);
      console.log('   Employee Name:', assignment.employeeId.name);
      console.log('   Employee Email:', assignment.employeeId.email);
      console.log('   Status:', assignment.status);
      console.log('   Priority:', assignment.priority);
      console.log('   Assigned Date:', assignment.assignedDate);
    } else {
      console.log('❌ No assignment found');
      
      // Let's check what assignments exist for this enquiry
      const allAssignments = await LeadAssignment.find({ enquiryId: enquiryId });
      console.log(`\n🔍 All assignments for this enquiry (${allAssignments.length}):`);
      allAssignments.forEach(a => {
        console.log(`   Status: ${a.status}, Type: ${a.enquiryType}, Employee: ${a.employeeId}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

// Add timeout
setTimeout(() => {
  console.log('⏰ Timeout - closing connection');
  mongoose.connection.close();
  process.exit(1);
}, 10000);

testLookup();