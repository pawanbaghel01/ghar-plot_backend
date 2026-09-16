#!/usr/bin/env node

// Test script to validate employee dashboard permission system
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Employee Dashboard Permission System...\n');

// Test 1: Check if employeeDashboardRoute.js has correct structure
try {
  const routeFile = readFileSync(path.join(__dirname, 'routes', 'employeeDashboardRoute.js'), 'utf8');
  
  console.log('✅ Route file exists');
  
  // Check if it uses verifyEmployeeToken
  if (routeFile.includes('verifyEmployeeToken')) {
    console.log('✅ Uses verifyEmployeeToken middleware');
  } else {
    console.log('❌ Missing verifyEmployeeToken middleware');
  }
  
  // Check if it uses checkPermission
  if (routeFile.includes('checkPermission("dashboard", "read")')) {
    console.log('✅ Uses dashboard read permission check');
  } else {
    console.log('❌ Missing dashboard read permission check');
  }
  
  // Check required endpoints
  const requiredEndpoints = [
    '/properties/all',
    '/properties/bought', 
    '/properties/rent',
    '/properties/recent',
    '/subcategory-counts',
    '/revenue'
  ];
  
  requiredEndpoints.forEach(endpoint => {
    if (routeFile.includes(`"${endpoint}"`)) {
      console.log(`✅ Has endpoint: ${endpoint}`);
    } else {
      console.log(`❌ Missing endpoint: ${endpoint}`);
    }
  });
  
} catch (error) {
  console.log('❌ Could not read route file:', error.message);
}

// Test 2: Check if server.js includes the new route
try {
  const serverFile = readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  
  if (serverFile.includes('employeeDashboardRoute')) {
    console.log('✅ Server imports employeeDashboardRoute');
  } else {
    console.log('❌ Server missing employeeDashboardRoute import');
  }
  
  if (serverFile.includes('"/employee/dashboard"')) {
    console.log('✅ Server mounts /employee/dashboard route');
  } else {
    console.log('❌ Server missing /employee/dashboard route mount');
  }
  
} catch (error) {
  console.log('❌ Could not read server file:', error.message);
}

console.log('\n🔧 Permission System Architecture:');
console.log('Frontend: usePermissions → hasPermission("dashboard", "read")');
console.log('Backend: verifyEmployeeToken → checkPermission("dashboard", "read")');
console.log('API Flow: Frontend calls /employee/dashboard/* → Backend validates token & permissions');

console.log('\n📝 Summary:');
console.log('The employee dashboard permission system should now work with:');
console.log('1. Frontend permission checks in DashboardPage.jsx');
console.log('2. Backend permission middleware on /employee/dashboard/* routes');  
console.log('3. AdminContext.jsx using employee-specific endpoints when employee token detected');