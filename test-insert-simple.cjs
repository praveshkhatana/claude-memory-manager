#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  console.log('=== Test: Direct INSERT ===\n');

  // Test 1: Simple insert
  console.log('1. Try simple INSERT');
  try {
    db.run('INSERT INTO tags (name, created_at) VALUES (?, datetime("now"))', ['test-tag']);
    console.log('✓ Insert succeeded');
  } catch (err) {
    console.log('✗ Insert failed:', err.message);
  }

  // Test 2: Select
  console.log('\n2. Try SELECT');
  const stmt = db.prepare('SELECT * FROM tags');
  const result = stmt.get();
  console.log('Result:', result);

  // Test 3: Check count
  console.log('\n3. Try COUNT');
  const count = db.prepare('SELECT COUNT(*) FROM tags');
  const countResult = count.get();
  console.log('Count:', countResult);

  console.log('\n✅ Tests complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});