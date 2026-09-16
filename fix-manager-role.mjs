import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from './models/roleSchema.js';

dotenv.config();

async function fixManagerRole() {
  try {
    await mongoose.connect(process.env.MONGO_CONN);
    console.log('✅ Connected to MongoDB\n');
    
    // Find Manager role
    const managerRole = await Role.findOne({ name: 'Manager' });
    
    if (!managerRole) {
      console.log('❌ Manager role not found');
      process.exit(1);
    }
    
    console.log('📋 Current Manager Role Permissions:');
    console.log(JSON.stringify(managerRole.permissions, null, 2));
    
    // Check if roles permission already exists
    const hasRolesPermission = managerRole.permissions.some(p => p.module === 'roles');
    const hasEmployeesPermission = managerRole.permissions.some(p => p.module === 'employees');
    
    if (hasRolesPermission && hasEmployeesPermission) {
      console.log('\n✅ Manager role already has roles and employees permissions');
      process.exit(0);
    }
    
    // Add roles permission if not exists
    if (!hasRolesPermission) {
      managerRole.permissions.push({
        module: 'roles',
        actions: ['read', 'create', 'update', 'delete']
      });
      console.log('\n✅ Added "roles" permission to Manager role');
    }
    
    // Add employees permission if not exists
    if (!hasEmployeesPermission) {
      managerRole.permissions.push({
        module: 'employees',
        actions: ['read', 'create', 'update', 'delete']
      });
      console.log('✅ Added "employees" permission to Manager role');
    }
    
    // Save updated role
    await managerRole.save();
    
    console.log('\n📋 Updated Manager Role Permissions:');
    console.log(JSON.stringify(managerRole.permissions, null, 2));
    
    console.log('\n✅ Manager role updated successfully!');
    console.log('\n🔄 Employee with Manager role can now access:');
    console.log('   - Role Management (create, read, update, delete)');
    console.log('   - Employee Management (create, read, update, delete)');
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixManagerRole();
