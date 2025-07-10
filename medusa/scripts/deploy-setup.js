#!/usr/bin/env node

const crypto = require('crypto');

console.log('🔧 Medusa Deployment Setup');
console.log('==========================\n');

// Generate random secrets
const jwtSecret = crypto.randomBytes(32).toString('hex');
const cookieSecret = crypto.randomBytes(32).toString('hex');

console.log('📋 Environment Variables for Production:');
console.log('========================================\n');

console.log('Required Variables:');
console.log('-------------------');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`COOKIE_SECRET=${cookieSecret}`);
console.log('NODE_ENV=production');
console.log('DATABASE_URL=<your-postgresql-connection-string>');
console.log('REDIS_URL=<your-redis-connection-string>');
console.log('');

console.log('Optional Variables (but recommended):');
console.log('-------------------------------------');
console.log('BACKEND_URL=<your-backend-url>');
console.log('STOREFRONT_URL=<your-frontend-url>');
console.log('STORE_CORS=<your-frontend-url>');
console.log('ADMIN_CORS=<your-admin-url>');
console.log('AUTH_CORS=<your-frontend-url>');
console.log('');

console.log('📝 Deployment Steps:');
console.log('====================');
console.log('1. Create a Render account at https://render.com');
console.log('2. Create a new Web Service');
console.log('3. Connect your GitHub repository');
console.log('4. Set the environment variables above');
console.log('5. Create a PostgreSQL database in Render');
console.log('6. Create a Redis instance in Render');
console.log('7. Link the database and Redis to your web service');
console.log('8. Deploy!');
console.log('');

console.log('🔗 Useful Links:');
console.log('================');
console.log('- Render: https://render.com');
console.log('- Medusa Docs: https://docs.medusajs.com');
console.log('- Deployment Guide: https://docs.medusajs.com/deployments'); 