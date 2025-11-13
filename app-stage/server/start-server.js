const { spawn } = require('child_process');
const path = require('path');

// Start the Express server
const server = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
  process.exit(0);
});