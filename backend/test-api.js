// Test script to verify API is working
const http = require('http');

console.log('Testing admin login...');

const data = JSON.stringify({
  email: 'admin@smartqueue.com',
  password: 'admin123'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(body);
      console.log('Response:');
      console.log(JSON.stringify(parsedData, null, 2));
      
      // Get the admin token for protected endpoint testing
      const adminToken = parsedData.token;
      
      // Test user login
      console.log('\nTesting user login...');
      testUserLogin(adminToken);
    } catch (e) {
      console.error('Error parsing response:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.write(data);
req.end();

function testUserLogin(adminToken) {
  const userData = JSON.stringify({
    email: 'john@example.com',
    password: 'user123'
  });
  
  const userOptions = {
    ...options,
    path: '/api/users/login'
  };
  
  userOptions.headers['Content-Length'] = userData.length;
  
  const userReq = http.request(userOptions, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      try {
        const parsedData = JSON.parse(body);
        console.log('Response:');
        console.log(JSON.stringify(parsedData, null, 2));
        
        const userToken = parsedData.token;
        
        // Test organization login
        console.log('\nTesting organization login...');
        testOrganizationLogin(adminToken, userToken);
      } catch (e) {
        console.error('Error parsing response:', e.message);
      }
    });
  });
  
  userReq.on('error', (e) => {
    console.error(`Error: ${e.message}`);
  });
  
  userReq.write(userData);
  userReq.end();
}

function testOrganizationLogin(adminToken, userToken) {
  const orgData = JSON.stringify({
    email: 'hospital@example.com',
    password: 'org123'
  });
  
  const orgOptions = {
    ...options,
    path: '/api/organizations/login'
  };
  
  orgOptions.headers['Content-Length'] = orgData.length;
  
  const orgReq = http.request(orgOptions, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      try {
        const parsedData = JSON.parse(body);
        console.log('Response:');
        console.log(JSON.stringify(parsedData, null, 2));
        
        const orgToken = parsedData.token;
        
        // Test protected endpoints
        console.log('\nTesting protected endpoints...');
        
        // 1. Admin viewing all users (should succeed)
        testAdminViewAllUsers(adminToken);
        
        // 2. User trying to access another user's profile (should fail)
        setTimeout(() => {
          testUserAccessOtherProfile(userToken);
        }, 1000);
        
        // 3. Organization updating its own profile (should succeed)
        setTimeout(() => {
          testOrgUpdateOwnProfile(orgToken);
        }, 2000);
      } catch (e) {
        console.error('Error parsing response:', e.message);
      }
    });
  });
  
  orgReq.on('error', (e) => {
    console.error(`Error: ${e.message}`);
  });
  
  orgReq.write(orgData);
  orgReq.end();
}

function testAdminViewAllUsers(adminToken) {
  const adminOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  };
  
  const adminReq = http.request(adminOptions, (res) => {
    console.log('\nAdmin viewing all users:');
    console.log(`Status Code: ${res.statusCode}`);
    
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      if (body) {
        try {
          const parsedData = JSON.parse(body);
          console.log(`Found ${parsedData.length} users (success)`);
        } catch (e) {
          console.error('Error parsing response:', e.message);
        }
      }
    });
  });
  
  adminReq.on('error', (e) => {
    console.error(`Error: ${e.message}`);
  });
  
  adminReq.end();
}

function testUserAccessOtherProfile(userToken) {
  // Try to access user ID 2 (which should be different from the logged in user)
  const userOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/users/profile/2',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  };
  
  const userReq = http.request(userOptions, (res) => {
    console.log('\nUser trying to access another user profile:');
    console.log(`Status Code: ${res.statusCode}`);
    
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      if (body) {
        try {
          const parsedData = JSON.parse(body);
          console.log('Response:', parsedData);
          if (res.statusCode === 403) {
            console.log('Permission check working correctly (access denied)');
          }
        } catch (e) {
          console.error('Error parsing response:', e.message);
        }
      }
    });
  });
  
  userReq.on('error', (e) => {
    console.error(`Error: ${e.message}`);
  });
  
  userReq.end();
}

function testOrgUpdateOwnProfile(orgToken) {
  const updateData = JSON.stringify({
    working_hours: '09:00-21:00'
  });
  
  const orgOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/organizations/profile/1',
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${orgToken}`,
      'Content-Type': 'application/json',
      'Content-Length': updateData.length
    }
  };
  
  const orgReq = http.request(orgOptions, (res) => {
    console.log('\nOrganization updating its own profile:');
    console.log(`Status Code: ${res.statusCode}`);
    
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    
    res.on('end', () => {
      if (body) {
        try {
          const parsedData = JSON.parse(body);
          console.log('Response:', parsedData);
          if (res.statusCode === 200) {
            console.log('Organization can update its own profile (success)');
          }
        } catch (e) {
          console.error('Error parsing response:', e.message);
        }
      }
      
      console.log('\nAPI testing completed!');
    });
  });
  
  orgReq.on('error', (e) => {
    console.error(`Error: ${e.message}`);
  });
  
  orgReq.write(updateData);
  orgReq.end();
} 