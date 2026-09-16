import mongoose from 'mongoose';

// Connect to database
await mongoose.connect('mongodb://localhost:27017/amincrmghar');

const Employee = mongoose.model('Employee', {
  name: String,
  email: String,
  password: String,
  role: { type: String, enum: ['employee', 'manager'], default: 'employee' },
  isActive: { type: Boolean, default: true }
});

console.log('📋 Available employees:');
const employees = await Employee.find({});
employees.forEach(emp => {
  console.log(`- ${emp.name} (${emp.email}) - ID: ${emp._id}`);
});

await mongoose.disconnect();