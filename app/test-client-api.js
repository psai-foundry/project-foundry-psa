
const bcrypt = require('bcryptjs');

// Simple test to check if API endpoints are accessible
async function testClientAPI() {
  try {
    console.log('🧪 Starting Client Management UAT Testing...\n');
    
    // Test 1: Check if clients API is accessible (without auth - should get 401)
    console.log('Test 1: Testing unauthorized access to clients API');
    const response1 = await fetch('http://localhost:3001/api/clients');
    console.log(`Status: ${response1.status} - ${response1.status === 401 ? '✅ PASS' : '❌ FAIL'} (Expected 401 Unauthorized)`);
    
    // Test 2: Check client contacts API (without auth - should get 401)  
    console.log('\nTest 2: Testing unauthorized access to client contacts API');
    const response2 = await fetch('http://localhost:3001/api/client-contacts');
    console.log(`Status: ${response2.status} - ${response2.status === 401 ? '✅ PASS' : '❌ FAIL'} (Expected 401 Unauthorized)`);
    
    // Test 3: Check admin clients API (without auth - should get 401)
    console.log('\nTest 3: Testing unauthorized access to admin clients API');
    const response3 = await fetch('http://localhost:3001/api/admin/clients');
    console.log(`Status: ${response3.status} - ${response3.status === 401 ? '✅ PASS' : '❌ FAIL'} (Expected 401 Unauthorized)`);
    
    // Test 4: Test invalid client ID endpoint
    console.log('\nTest 4: Testing invalid client ID endpoint');
    const response4 = await fetch('http://localhost:3001/api/clients/invalid-id');
    console.log(`Status: ${response4.status} - ${response4.status === 401 ? '✅ PASS' : '❌ FAIL'} (Expected 401 Unauthorized)`);
    
    console.log('\n🏁 Basic API endpoint accessibility tests completed.');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

testClientAPI();
