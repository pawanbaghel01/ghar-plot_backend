#!/usr/bin/env node
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

async function testAssignmentAPI() {
  try {
    console.log('🔧 Testing assignment API with proper admin token...\n');

    // First get available employees
    console.log('👥 Getting available employees...');
    
    // Create a simple admin token (we'll use the employee's ID as admin for testing)
    const adminToken = jwt.sign({ id: '6912fbdd423aa1aad79f0020', isAdmin: true }, '1234');
    
    const employeesResponse = await fetch('http://localhost:4000/admin/leads/available-employees', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const employeesData = await employeesResponse.json();
    console.log('📋 Employees response:', employeesData);

    if (employeesData.success && employeesData.data.length > 0) {
      const employee = employeesData.data[0];
      console.log(`✅ Found employee: ${employee.name} (${employee._id})`);

      // Get enquiries
      const enquiryResponse = await fetch('http://localhost:4000/api/inquiry/get-enquiries');
      const enquiryData = await enquiryResponse.json();
      
      if (enquiryData.data && enquiryData.data.length > 0) {
        const enquiry = enquiryData.data[0];
        console.log(`📝 Found enquiry: ${enquiry._id}`);

        // Create assignment
        const assignmentData = {
          employeeId: employee._id,
          enquiries: [{ enquiryId: enquiry._id, enquiryType: "Inquiry" }],
          priority: "medium",
          notes: "Test assignment"
        };

        console.log('\n📤 Creating assignment...');
        const assignResponse = await fetch('http://localhost:4000/admin/leads/assign', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(assignmentData)
        });

        const assignResult = await assignResponse.json();
        console.log('📋 Assignment result:', assignResult);

        // Test if assignment shows up
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const testResponse = await fetch('http://localhost:4000/api/inquiry/get-enquiries');
        const testData = await testResponse.json();
        
        const updatedEnquiry = testData.data.find(e => e._id === enquiry._id);
        console.log('\n🔍 Updated enquiry assignment:');
        console.log(updatedEnquiry?.assignment || 'No assignment found');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAssignmentAPI();