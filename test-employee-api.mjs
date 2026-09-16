import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

// Connect to database
await mongoose.connect('mongodb+srv://vikashchaudhary0475:IBZqeOzkxELsnfsl@clusters.fyjelmt.mongodb.net/99acer-db?retryWrites=true&w=majority&appName=99acer-backend');

// Models
const Role = mongoose.model('Role', {
  name: String,
  permissions: [{ module: String, actions: [String] }],
  isActive: { type: Boolean, default: true }
});

const Employee = mongoose.model('Employee', {
  name: String,
  email: String,
  password: String,
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  isActive: { type: Boolean, default: true }
});

console.log('🔍 Testing Employee Authentication and API...\n');

try {
  // Step 1: Get the employee that we assigned leads to
  const employee = await Employee.findOne({ email: 'garvita@crm.com' }).populate('role');
  if (!employee) {
    console.log('❌ Employee not found');
    process.exit(1);
  }
  console.log('✅ Found employee:', employee.name, employee.email, employee._id);

  // Step 2: Create employee token (this is what the frontend should use)
  const employeeToken = jwt.sign(
    { id: employee._id.toString(), email: employee.email, isEmployee: true },
    '1234'
  );
  console.log('✅ Created employee token');

  // Step 3: Test the employee leads endpoint (same as frontend calls)
  console.log('🔍 Testing Employee Leads API (Frontend endpoint)...');
  const response = await fetch('http://localhost:4000/employee/leads/my-leads', {
    headers: {
      'Authorization': `Bearer ${employeeToken}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  console.log('📋 API Response Status:', response.status);
  console.log('📋 API Response:', JSON.stringify(data, null, 2));

  if (data.success && data.data?.assignments?.length > 0) {
    console.log(`\n✅ SUCCESS! Found ${data.data.assignments.length} assigned leads:`);
    data.data.assignments.forEach((assignment, i) => {
      console.log(`${i + 1}. Assignment ID: ${assignment._id}`);
      console.log(`   Enquiry: ${assignment.enquiry?.fullName || 'N/A'} (${assignment.enquiry?.email || 'N/A'})`);
      console.log(`   Status: ${assignment.status}, Priority: ${assignment.priority}`);
      console.log(`   Assigned: ${assignment.assignedDate}`);
      console.log('');
    });
    
    console.log('💡 CONCLUSION: Backend API is working correctly!');
    console.log('💡 Issue must be in frontend token handling or page logic.');
    console.log('\n🔧 FRONTEND DEBUGGING STEPS:');
    console.log('1. Check if employee login creates proper employeeToken in localStorage');
    console.log('2. Verify LeadsPage.jsx is reading correct token for employee users');
    console.log('3. Check browser console for any JavaScript errors');
    console.log('4. Verify employee role detection in frontend');
  } else {
    console.log('❌ No leads found or API error');
    if (data.message) {
      console.log('Error message:', data.message);
    }
  }

} catch (error) {
  console.error('❌ Error during test:', error.message);
} finally {
  await mongoose.disconnect();
  process.exit(0);
}