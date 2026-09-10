#!/usr/bin/env node

/**
 * Secure Password Reset Script for Sadaat Travels
 * 
 * This script uses the Supabase Admin API with service-role key to reset
 * a user's password. The service-role key must NEVER be exposed to the browser.
 * 
 * USAGE:
 * 1. Ensure you have the following environment variables set in your .env file:
 *    - SUPABASE_URL (your Supabase project URL)
 *    - SUPABASE_SERVICE_ROLE_KEY (your service-role key - KEEP THIS SECRET)
 *    - TARGET_USER_EMAIL (email of the user to reset)
 *    - NEW_PASSWORD (the new password to set)
 * 
 * 2. Run this script:
 *    node scripts/reset-password.js
 * 
 * 3. After successful execution, you can log in with the new password.
 * 
 * SECURITY:
 * - This script should only be run locally or in a secure environment
 * - Never commit .env file with service-role key to Git
 * - Delete this script after use if it's a one-time operation
 * - The service-role key has full admin access - treat it like a master key
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Validate required environment variables
const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TARGET_USER_EMAIL',
  'NEW_PASSWORD'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease add these to your .env file and try again.');
  process.exit(1);
}

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TARGET_USER_EMAIL,
  NEW_PASSWORD
} = process.env;

// Validate password strength
if (NEW_PASSWORD.length < 6) {
  console.error('❌ Password must be at least 6 characters long');
  process.exit(1);
}

console.log('🔐 Sadaat Travels - Secure Password Reset');
console.log('==========================================\n');
console.log(`Target User: ${TARGET_USER_EMAIL}`);
console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log('');

// Create Supabase client with service-role key
// This key has full admin access and should NEVER be exposed to the browser
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function resetPassword() {
  try {
    console.log('🔍 Looking up user...');
    
    // List all users and find the target user
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }
    
    const targetUser = users.find(u => u.email === TARGET_USER_EMAIL);
    
    if (!targetUser) {
      throw new Error(`User with email ${TARGET_USER_EMAIL} not found`);
    }
    
    console.log(`✅ Found user: ${targetUser.email} (ID: ${targetUser.id})`);
    console.log('');
    console.log('🔄 Updating password...');
    
    // Update the user's password
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      { password: NEW_PASSWORD }
    );
    
    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }
    
    console.log('✅ Password updated successfully!');
    console.log('');
    console.log('📋 User Details:');
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   ID: ${updatedUser.id}`);
    console.log(`   Created: ${updatedUser.created_at}`);
    console.log(`   Last Sign In: ${updatedUser.last_sign_in_at || 'Never'}`);
    console.log('');
    console.log('🎉 You can now log in with:');
    console.log(`   Email: ${TARGET_USER_EMAIL}`);
    console.log(`   Password: ${NEW_PASSWORD}`);
    console.log('');
    console.log('⚠️  SECURITY REMINDER:');
    console.log('   - Delete this script if it was a one-time operation');
    console.log('   - Never commit .env file with service-role key to Git');
    console.log('   - Keep your service-role key secret and secure');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Please check:');
    console.error('1. Your .env file has all required variables');
    console.error('2. The service-role key is correct');
    console.error('3. The target user email exists in Supabase');
    console.error('');
    process.exit(1);
  }
}

// Execute the password reset
resetPassword();
