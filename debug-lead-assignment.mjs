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

const Inquiry = mongoose.model('Inquiry', {
  fullName: String,
  email: String,
  contactNumber: String,
  address: String,
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: String,
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['open', 'in-progress', 'closed'], default: 'open' }
});

const LeadAssignment = mongoose.model('LeadAssignment', {
  enquiryId: { type: mongoose.Schema.Types.ObjectId, required: true },
  enquiryType: { type: String, enum: ['Inquiry', 'ManualInquiry'], required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  notes: String
});

console.log('🔍 Testing Lead Assignment Flow...\n');

try {
  // Step 1: Find an employee
  const employee = await Employee.findOne({ isActive: true }).populate('role');
  if (!employee) {
    console.log('❌ No active employee found');
    process.exit(1);
  }
  console.log('✅ Found employee:', employee.name, employee.email, employee._id);

  // Step 2: Find an inquiry
  const inquiry = await Inquiry.findOne({ status: 'open' });
  if (!inquiry) {
    console.log('❌ No open inquiries found. Creating test inquiry...');
    
    // Create a test inquiry
    const testInquiry = new Inquiry({
      fullName: 'Test Customer Lead Assignment',
      email: 'testlead@example.com',
      contactNumber: '1234567890',
      message: 'Testing lead assignment system',
      status: 'open'
    });
    await testInquiry.save();
    console.log('✅ Created test inquiry:', testInquiry._id);
  } else {
    console.log('✅ Found inquiry:', inquiry.fullName, inquiry.email, inquiry._id);
  }

  const inquiryToAssign = inquiry || await Inquiry.findOne({ fullName: 'Test Customer Lead Assignment' });

  // Step 3: Find or create admin and create valid token
  const Admin = mongoose.model('Admin', {
    fullName: String,
    email: String,
    password: String,
    role: { type: String, default: 'admin' }
  });

  let admin = await Admin.findOne({ role: 'admin' });
  if (!admin) {
    console.log('❌ No admin found. Creating test admin...');
    admin = new Admin({
      fullName: 'Test Admin',
      email: 'admin@test.com',
      password: 'hashedpassword',
      role: 'admin'
    });
    await admin.save();
    console.log('✅ Created test admin:', admin._id);
  } else {
    console.log('✅ Found admin:', admin.fullName, admin.email, admin._id);
  }

  const adminToken = jwt.sign(
    { id: admin._id.toString() },
    '1234'
  );

  // Step 4: Test lead assignment API
  const assignmentData = {
    employeeId: employee._id.toString(),
    enquiries: [{
      enquiryId: inquiryToAssign._id.toString(),
      enquiryType: 'Inquiry'
    }],
    priority: 'medium',
    notes: 'Testing lead assignment flow - Debug'
  };

  console.log('📤 Assigning lead via API...');
  console.log('Assignment data:', JSON.stringify(assignmentData, null, 2));

  const response = await fetch('http://localhost:4000/admin/leads/assign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(assignmentData)
  });

  const result = await response.json();
  console.log('📋 Assignment API Response:', response.status, JSON.stringify(result, null, 2));

  if (response.ok) {
    // Step 5: Check if assignment was created in database
    const assignment = await LeadAssignment.findOne({ 
      enquiryId: inquiryToAssign._id,
      employeeId: employee._id,
      enquiryType: 'Inquiry'
    });
    
    if (assignment) {
      console.log('✅ Lead assignment created in DB:', assignment._id);
      console.log('Assignment details:', {
        enquiryId: assignment.enquiryId,
        enquiryType: assignment.enquiryType,
        employeeId: assignment.employeeId,
        status: assignment.status,
        priority: assignment.priority,
        assignedDate: assignment.assignedDate
      });
      
      // Step 6: Test employee leads API
      const employeeToken = jwt.sign(
        { id: employee._id.toString(), email: employee.email, isEmployee: true },
        '1234'
      );

      console.log('🔍 Testing employee leads API...');
      const leadsResponse = await fetch('http://localhost:4000/employee/leads/my-leads', {
        headers: {
          'Authorization': `Bearer ${employeeToken}`
        }
      });

      const leadsData = await leadsResponse.json();
      console.log('📋 Employee leads API Response:', leadsResponse.status);
      console.log('Response data:', JSON.stringify(leadsData, null, 2));
      
      if (leadsData.success && leadsData.data?.assignments?.length > 0) {
        console.log(`✅ SUCCESS! Employee now has ${leadsData.data.assignments.length} assigned leads`);
        
        const newAssignment = leadsData.data.assignments.find(a => 
          a.enquiryId === inquiryToAssign._id.toString() || 
          a.enquiry?._id === inquiryToAssign._id.toString()
        );
        
        if (newAssignment) {
          console.log('✅ New assignment visible in employee response:');
          console.log('- Assignment ID:', newAssignment._id);
          console.log('- Enquiry:', newAssignment.enquiry?.fullName || 'N/A');
          console.log('- Status:', newAssignment.status);
          console.log('- Priority:', newAssignment.priority);
        } else {
          console.log('⚠️  Assignment exists in DB but not visible in employee API response');
          console.log('All assignments in response:');
          leadsData.data.assignments.forEach((a, i) => {
            console.log(`  ${i + 1}. ID: ${a._id}, EnquiryID: ${a.enquiryId}, EnquiryName: ${a.enquiry?.fullName || 'N/A'}`);
          });
        }
      } else {
        console.log('❌ Employee has no leads in API response');
        console.log('Response structure:', Object.keys(leadsData));
        if (leadsData.data) {
          console.log('Data structure:', Object.keys(leadsData.data));
        }
      }
    } else {
      console.log('❌ Assignment not found in database');
      
      // Check all assignments for this employee
      const allAssignments = await LeadAssignment.find({ employeeId: employee._id });
      console.log(`Employee has ${allAssignments.length} total assignments:`);
      allAssignments.forEach(a => {
        console.log(`- ${a._id}: EnquiryID ${a.enquiryId}, Type: ${a.enquiryType}, Status: ${a.status}`);
      });
    }
  } else {
    console.log('❌ Lead assignment API failed');
  }

} catch (error) {
  console.error('❌ Error during test:', error.message);
} finally {
  await mongoose.disconnect();
  process.exit(0);
}