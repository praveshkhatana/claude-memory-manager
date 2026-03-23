#!/usr/bin/env node

const initSqlJs = require('sql.js');
const fs = require('fs');

console.log('=== Token Usage Estimate ===\n');

// Open existing database
const DB_PATH = process.env.HOME + '/.claude/memory/memory.db';
const data = fs.readFileSync(DB_PATH);
const db = new SQL.Database(data);

// Count all conversations
const count = db.exec('SELECT COUNT(*) FROM conversations');
console.log('Total conversations in database:', count[0].values[0][0]);

// Get approximate token count per conversation
const samples = db.exec('SELECT LENGTH(user_message) FROM conversations LIMIT 1');
if (samples.length > 0 && samples[0].values.length > 0) {
  const avgLength = samples[0].values[0][0];
  console.log('Average message length:', avgLength, 'characters');
  console.log('Approximate tokens:', Math.round(avgLength / 4), 'tokens');
}

// Estimate total database size
const totalSize = fs.statSync(DB_PATH).size;
console.log('\nDatabase size:', totalSize, 'bytes');
console.log('Approximate token storage cost:', Math.round(totalSize / 4), 'tokens');

console.log('\nNote: This is an estimate. Actual token usage depends on:');
console.log('- Database export format');
console.log('- Embedding storage (1536 dimensions × 4 bytes)');
console.log('- Text compression');
