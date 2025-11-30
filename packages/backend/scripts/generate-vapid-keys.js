#!/usr/bin/env node
/**
 * Generate VAPID keys for web push notifications
 *
 * Run this script once to generate your VAPID keys:
 *   node scripts/generate-vapid-keys.js
 *
 * Then add the generated keys to your .env file:
 *   VAPID_PUBLIC_KEY=<public key>
 *   VAPID_PRIVATE_KEY=<private key>
 *   VAPID_SUBJECT=mailto:your-email@example.com
 */

const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\\n=== VAPID Keys Generated ===\\n');
console.log('Add these to your .env file:\\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:admin@petcheck.me');
console.log('\\n============================\\n');
