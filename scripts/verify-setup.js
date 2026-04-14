#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n=== AI Database Agent Setup Verification ===\n');

// Check .env.local exists
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found at:', envPath);
  console.error('   Please create .env.local with your credentials');
  process.exit(1);
}

console.log('✓ .env.local file found');

// Read .env.local
const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');
const env = {};
lines.forEach((line) => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

// Check required variables
const required = [
  'GROQ_API_KEY',
  'MYSQL_HOST',
  'MYSQL_USER',
  'MYSQL_PASSWORD',
  'MYSQL_DATABASE',
];

console.log('\n--- Environment Variables ---');
let allValid = true;

required.forEach((key) => {
  if (env[key]) {
    const value = env[key];
    const hidden =
      key === 'GROQ_API_KEY' ? value.substring(0, 20) + '...' : value;
    console.log(`✓ ${key}: ${hidden}`);
  } else {
    console.error(`❌ ${key}: NOT SET`);
    allValid = false;
  }
});

console.log('\n--- Validation ---');
if (!allValid) {
  console.error('\n❌ Some required environment variables are missing!');
  console.error('   Please add them to .env.local');
  process.exit(1);
}

// Check MySQL password
if (env.MYSQL_PASSWORD === 'your_password') {
  console.warn(
    '⚠  MYSQL_PASSWORD is still set to "your_password"\n   Please update it with your actual MySQL password'
  );
}

// Check if node_modules exists
const nmPath = path.join(__dirname, '..', 'node_modules');
if (!fs.existsSync(nmPath)) {
  console.error('\n❌ node_modules not found');
  console.error('   Run: npm install');
  process.exit(1);
}

console.log('✓ node_modules found');

console.log('\n✓ Setup verification passed!');
console.log('\nNext steps:');
console.log('  1. Update MYSQL_PASSWORD in .env.local if needed');
console.log('  2. Run: npm run db:test (to test database connection)');
console.log('  3. Run: npm run dev (to start development server)');
console.log('  4. Open: http://localhost:3000\n');
