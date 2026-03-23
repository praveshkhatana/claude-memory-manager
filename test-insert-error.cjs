#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  console.log('=== Test: Insert with error checking ===\n');

  // Test 1: Create table
  console.log('1. Create table');
  db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');
  console.log('✓ Table created');

  // Test 2: Insert
  console.log('\n2. Insert row');
  try {
    const result = db.run('INSERT INTO test (id, name) VALUES (?, ?)', [1, 'test-name']);
    console.log('Insert result:', result);
    console.log('✓ Insert succeeded');
  } catch (err) {
    console.log('✗ Insert failed:', err.message);
  }

  // Test 3: Check if row was inserted
  console.log('\n3. Check if row exists');
  const stmt = db.prepare('SELECT COUNT(*) FROM test');
  const count = stmt.get();
  console.log('Count:', count);

  // Test 4: Try to get the row
  console.log('\n4. Try to get the row');
  const stmt2 = db.prepare('SELECT * FROM test WHERE id = ?');
  const result = stmt2.get(1);
  console.log('Result:', result);

  console.log('\n✅ Tests complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});