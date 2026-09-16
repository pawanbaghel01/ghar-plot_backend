#!/usr/bin/env node
import fetch from 'node-fetch';

async function createTestAssignment() {
  try {
    console.log('🧪 Creating test assignment...\n');

    // Get the first enquiry and first manual enquiry
    const enquiryResponse = await fetch('http://localhost:4000/api/inquiry/get-enquiries');
    const enquiryData = await enquiryResponse.json();
    
    const manualResponse = await fetch('http://localhost:4000/api/inquiry/all');
    const manualData = await manualResponse.json();

    if (!enquiryData.data || enquiryData.data.length === 0) {
      console.log('❌ No regular enquiries found');
      return;
    }

    if (!manualData.data || manualData.data.length === 0) {
      console.log('❌ No manual enquiries found');
      return;
    }

    const enquiry = enquiryData.data[0];
    const manualEnquiry = manualData.data[0];
    
    console.log('📝 Found enquiries to assign:');
    console.log(`   Regular: ${enquiry._id} (${enquiry.buyerId?.fullName || 'N/A'})`);
    console.log(`   Manual: ${manualEnquiry._id} (${manualEnquiry.clientName})`);

    // Create assignment using a simple admin token
    const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MTJmYmRkNDIzYWExYWFkNzlmMDAxZiIsImVtYWlsIjoiZ2Fydml0YUBjcm0uY29tIiwiaXNBZG1pbiI6dHJ1ZSwiaWF0IjoxNzMwODkzNTI0fQ.8_mEzedsObKcciPxmoNJKhYBr1lJE6j8HVZJRmqjpLg';

    const assignmentData = {
      employeeId: "6912fbdd423aa1aad79f0020", // garvita's ID
      enquiries: [
        { enquiryId: enquiry._id, enquiryType: "Inquiry" },
        { enquiryId: manualEnquiry._id, enquiryType: "ManualInquiry" }
      ],
      priority: "high",
      notes: "Test assignment for display feature"
    };

    console.log('\n📤 Creating assignment...');
    const response = await fetch('http://localhost:4000/admin/leads/assign', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(assignmentData)
    });

    const result = await response.json();
    console.log('📋 Assignment result:', result);

    if (result.success) {
      console.log('\n✅ Assignment created! Now testing API responses...');
      
      // Wait a moment for database to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test regular enquiry API
      const testEnquiryResponse = await fetch('http://localhost:4000/api/inquiry/get-enquiries');
      const testEnquiryData = await testEnquiryResponse.json();
      
      const assignedEnquiry = testEnquiryData.data.find(e => e._id === enquiry._id);
      console.log('\n🔍 Regular Enquiry Assignment:');
      if (assignedEnquiry && assignedEnquiry.assignment) {
        console.log(`   ✅ Assigned to: ${assignedEnquiry.assignment.employeeName}`);
        console.log(`   Status: ${assignedEnquiry.assignment.status}`);
        console.log(`   Priority: ${assignedEnquiry.assignment.priority}`);
      } else {
        console.log('   ❌ No assignment found');
      }

      // Test manual enquiry API
      const testManualResponse = await fetch('http://localhost:4000/api/inquiry/all');
      const testManualData = await testManualResponse.json();
      
      const assignedManual = testManualData.data.find(e => e._id === manualEnquiry._id);
      console.log('\n🔍 Manual Enquiry Assignment:');
      if (assignedManual && assignedManual.assignment) {
        console.log(`   ✅ Assigned to: ${assignedManual.assignment.employeeName}`);
        console.log(`   Status: ${assignedManual.assignment.status}`);
        console.log(`   Priority: ${assignedManual.assignment.priority}`);
      } else {
        console.log('   ❌ No assignment found');
      }

      console.log('\n🌐 Frontend Test:');
      console.log('   Open: http://localhost:5174/enquiries');
      console.log('   Look for the "Assigned Employee" column to see employee names');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTestAssignment();