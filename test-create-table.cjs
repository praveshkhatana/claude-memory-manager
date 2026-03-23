#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  console.log('=== Test: Create table and insert ===\n');

  // Test 1: Create table
  console.log('1. Create table');
  try {
    db.run('CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, created_at TEXT)');
    console.log('✓ Table created');
  } catch (err) {
    console.log('✗ Create table failed:', err.message);
  }

  // Test 2: Insert
  console.log('\n2. Insert row');
  try {
    db.run('INSERT INTO tags (name, created_at) VALUES (?, datetime("now"))', ['test-tag']);
    console.log('✓ Insert succeeded');
  } catch (err) {
    console.log('✗ Insert failed:', err.message);
  }

  // Test 3: Select
  console.log('\n3. Select row');
  try {
    const stmt = db.prepare('SELECT * FROM tags');
    const result = stmt.get();
    console.log('Result:', result);
  } catch (err) {
    console.log('✗ Select failed:', err.message);
  }

  console.log('\n✅ Tests complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});