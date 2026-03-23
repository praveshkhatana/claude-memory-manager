#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  console.log('=== Test: Insert with explicit ID ===\n');

  // Test 1: Create table
  console.log('1. Create table');
  db.run('CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, created_at TEXT)');

  // Test 2: Insert with explicit ID
  console.log('\n2. Insert with explicit id=1');
  try {
    db.run('INSERT INTO tags (id, name, created_at) VALUES (?, ?, datetime("now"))', [1, 'test-tag']);
    console.log('✓ Insert succeeded');
  } catch (err) {
    console.log('✗ Insert failed:', err.message);
  }

  // Test 3: Select
  console.log('\n3. Select all');
  const stmt = db.prepare('SELECT * FROM tags');
  const result = stmt.get();
  console.log('Result:', result);

  // Test 4: Select by id
  console.log('\n4. Select by id=1');
  const stmt2 = db.prepare('SELECT * from tags WHERE id = ?');
  const result2 = stmt2.get(1);
  console.log('Result:', result2);

  console.log('\n✅ Tests complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});