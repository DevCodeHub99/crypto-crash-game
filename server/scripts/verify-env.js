// Environment variable verification script
// Run this before starting the server to ensure all required variables are set

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

// Check if .env file exists (skip in production if env vars are set via platform)
const isProduction = process.env.NODE_ENV === 'production';
const hasEnvVars = process.env.MONGO_URI && process.env.API_KEY;

if (!existsSync(envPath) && !isProduction) {
  console.error('❌ ERROR: .env file not found!');
  console.error('');
  console.error('Please create a .env file:');
  console.error('  1. Copy the example: cp .env.example .env');
  console.error('  2. Add your credentials to .env');
  console.error('');
  console.error('See SECURITY.md for more information.');
  process.exit(1);
}

// Load environment variables from .env file if it exists
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (isProduction && hasEnvVars) {
  console.log('ℹ️  Running in production mode with platform environment variables');
} else {
  console.error('❌ ERROR: No environment configuration found!');
  console.error('');
  console.error('For production deployment:');
  console.error('  Set environment variables in your hosting platform dashboard');
  console.error('');
  process.exit(1);
}

// Required environment variables
const required = [
  'MONGO_URI',
  'API_KEY',
  'PORT',
  'FRONTEND_URL'
];

// Check for placeholder values
const placeholders = [
  'your_mongodb_connection_string',
  'your_coinmarketcap_api_key',
  'username:password@cluster',
];

let hasErrors = false;

console.log('🔍 Verifying environment variables...\n');

for (const varName of required) {
  const value = process.env[varName];
  
  if (!value) {
    console.error(`❌ Missing: ${varName}`);
    hasErrors = true;
  } else if (placeholders.some(placeholder => value.includes(placeholder))) {
    console.error(`❌ Placeholder detected in ${varName}`);
    console.error(`   Please replace with your actual credentials`);
    hasErrors = true;
  } else {
    // Mask sensitive values in output
    const masked = varName === 'MONGO_URI' || varName === 'API_KEY'
      ? value.substring(0, 10) + '...' + value.substring(value.length - 4)
      : value;
    console.log(`✅ ${varName}: ${masked}`);
  }
}

console.log('');

if (hasErrors) {
  console.error('❌ Environment validation failed!');
  console.error('');
  console.error('Please update your .env file with valid credentials:');
  console.error('  - MongoDB URI: https://www.mongodb.com/cloud/atlas');
  console.error('  - CoinMarketCap API: https://coinmarketcap.com/api/');
  console.error('');
  console.error('See SECURITY.md for detailed setup instructions.');
  process.exit(1);
}

console.log('✅ All environment variables are configured correctly!');
console.log('');
