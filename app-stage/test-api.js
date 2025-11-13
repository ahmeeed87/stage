const http = require('http');

const data = JSON.stringify({
  username: 'testuser3',
  email: 'test3@example.com',
  password: 'test123',
  firstName: 'Test',
  lastName: 'User',
  centerName: 'Test Center'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:', body);
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error);
  process.exit(1);
});

req.write(data);
req.end();
