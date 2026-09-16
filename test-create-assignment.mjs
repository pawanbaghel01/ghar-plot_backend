import mongoose from 'mongoose';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

// Connect to database
await mongoose.connect('mongodb://localhost:27017/amincrmghar');

// Models
const Inquiry = mongoose.model('Inquiry', {
  name: String,
  email: String,
  phone: String,
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  message: String,
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'contacted', 'closed'], default: 'pending' }
});

const Employee = mongoose.model('Employee', {
  name: String,
  email: String,
  password: String,
  role: { type: String, enum: ['employee', 'manager'], default: 'employee' },
  isActive: { type: Boolean, default: true }
});

const LeadAssignment = mongoose.model('LeadAssignment', {
  enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
  notes: String
});

console.log('🔍 Testing Lead Assignment Creation...\n');

try {
  // Step 1: Find an available inquiry
  const availableInquiry = await Inquiry.findOne({ status: 'pending' }).populate('property');
  if (!availableInquiry) {
    console.log('❌ No available inquiries found. Creating test inquiry...');
    
    // Create a test inquiry if none exist
    const testInquiry = new Inquiry({
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '1234567890',
      message: 'Interested in property details',
      status: 'pending'
    });
    await testInquiry.save();
    console.log('✅ Created test inquiry:', testInquiry._id);
  } else {
    console.log('✅ Found available inquiry:', availableInquiry._id, availableInquiry.name);
  }

  // Step 2: Get or create employee to assign to
  let employee = await Employee.findOne({ email: 'garvita@gmail.com' });
  if (!employee) {
    console.log('❌ Employee not found. Creating test employee...');
    
    // Import bcryptjs for password hashing
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    employee = new Employee({
      name: 'Garvita Test',
      email: 'garvita@gmail.com',
      password: hashedPassword,
      role: 'employee',
      isActive: true
    });
    
    await employee.save();
    console.log('✅ Created test employee:', employee.name, employee._id);
  } else {
    console.log('✅ Found employee:', employee.name, employee._id);
  }

  // Step 3: Create admin token for API call
  const adminToken = jwt.sign(
    { id: '675dc71bb9f6b3e72134a7a7', email: 'admin@example.com', isAdmin: true },
    '1234'
  );

  // Step 4: Use the inquiry we found or just created
  const inquiryToAssign = availableInquiry || await Inquiry.findOne({ name: 'Test Customer' });
  
  // Step 5: Make API call to assign lead
  const assignmentData = {
    enquiryId: inquiryToAssign._id.toString(),
    employeeId: employee._id.toString(),
    notes: 'Testing lead assignment flow'
  };

  console.log('📤 Assigning lead via API...');
  const response = await fetch('http://localhost:4000/admin/leads/assign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(assignmentData)
  });

  const result = await response.json();
  console.log('📋 Assignment API Response:', response.status, result);

  if (response.ok) {
    // Step 6: Check if assignment was created in database
    const assignment = await LeadAssignment.findOne({ 
      enquiryId: inquiryToAssign._id,
      employeeId: employee._id 
    });
    
    if (assignment) {
      console.log('✅ Lead assignment created in DB:', assignment._id);
      
      // Step 7: Test if employee can now see the lead
      const employeeToken = jwt.sign(
        { id: employee._id.toString(), email: employee.email, isEmployee: true },
        '1234'
      );

      const leadsResponse = await fetch('http://localhost:4000/api/employee/leads/my-leads', {
        headers: {
          'Authorization': `Bearer ${employeeToken}`
        }
      });

      const leadsData = await leadsResponse.json();
      console.log('📋 Employee leads after assignment:', leadsResponse.status);
      
      if (leadsData.success && leadsData.data?.assignments?.length > 0) {
        console.log(`✅ Success! Employee now has ${leadsData.data.assignments.length} assigned leads`);
        
        const newAssignment = leadsData.data.assignments.find(a => 
          a.enquiry._id === inquiryToAssign._id.toString()
        );
        
        if (newAssignment) {
          console.log('✅ New assignment visible to employee:', newAssignment.enquiry.name);
        } else {
          console.log('⚠️  Assignment exists but not in employee response');
        }
      } else {
        console.log('❌ Employee still has no leads or API error');
        console.log('Response data:', JSON.stringify(leadsData, null, 2));
      }
    } else {
      console.log('❌ Assignment not found in database');
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