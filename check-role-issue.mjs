import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/employeeSchema.js';
import Role from './models/roleSchema.js';

dotenv.config();

async function checkRoleIssue() {
  try {
    await mongoose.connect(process.env.MONGO_CONN);
    console.log('✅ Connected to MongoDB\n');
    
    // Get all employees with their roles
    const employees = await Employee.find({}).populate('role');
    console.log('👥 Total Employees:', employees.length, '\n');
    
    for (const emp of employees) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('👤 Employee:', emp.name);
      console.log('📧 Email:', emp.email);
      console.log('✅ Active:', emp.isActive);
      console.log('🔑 Admin Access:', emp.giveAdminAccess || false);
      
      if (emp.role) {
        console.log('🎭 Role:', emp.role.name);
        console.log('   Role Active:', emp.role.isActive);
        console.log('   Total Permissions:', emp.role.permissions?.length || 0);
        
        // Check for roles permission specifically
        const rolesPermission = emp.role.permissions?.find(p => p.module === 'roles');
        if (rolesPermission) {
          console.log('   ✅ Has "roles" module permission');
          console.log('      Actions:', rolesPermission.actions.join(', '));
        } else {
          console.log('   ❌ NO "roles" module permission');
        }
        
        // Check for employees permission
        const employeesPermission = emp.role.permissions?.find(p => p.module === 'employees');
        if (employeesPermission) {
          console.log('   ✅ Has "employees" module permission');
          console.log('      Actions:', employeesPermission.actions.join(', '));
        } else {
          console.log('   ❌ NO "employees" module permission');
        }
      } else {
        console.log('❌ NO ROLE ASSIGNED');
      }
      console.log('');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRoleIssue();
