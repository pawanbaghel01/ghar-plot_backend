// Test API calls with employee token
import fetch from 'node-fetch';

const employeeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MTJmYmRkNDIzYWExYWFkNzlmMDAyMCIsImVtYWlsIjoiZ2Fydml0YUBjcm0uY29tIiwiaWF0IjoxNzYzMjA2OTY5LCJleHAiOjE3NjMyOTMzNjl9.7Pl74GIOhSzaG4alvW6Brkd6KXr8dRI-4pLzC9cF5EA';

async function testEmployeeAPI() {
  console.log('Testing employee dashboard APIs...');
  
  const endpoints = [
    '/employee/dashboard/properties/all',
    '/employee/dashboard/properties/recent',
    '/employee/dashboard/properties/bought',
    '/employee/dashboard/properties/rent',
    '/employee/leads/my-leads',
    '/employee/user-leads/my-client-leads'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting: ${endpoint}`);
      const response = await fetch(`http://localhost:4000${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${employeeToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.status === 200) {
        const data = await response.json();
        console.log(`Success: Found ${data.data ? data.data.length : 'N/A'} items`);
      } else {
        const errorText = await response.text();
        console.log(`Error: ${errorText}`);
      }
    } catch (error) {
      console.error(`Network error: ${error.message}`);
    }
  }
}

testEmployeeAPI();