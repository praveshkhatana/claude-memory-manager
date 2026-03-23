#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  console.log('=== Test: Using .exec() instead of .run() ===\n');

  // Test 1: Create table
  console.log('1. Create table');
  db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY Key AUTOINCREMENT, name TEXT)');
  console.log('✓ Table created');

  // Test 2: Insert using .exec()
  console.log('\n2. Insert using .exec()');
  try {
    const result = db.exec('INSERT INTO test (id, name) VALUES (?, ?)', [1, 'test-name']);
    console.log('Exec result:', result);
    console.log('✓ Insert succeeded');
  } catch (err) {
    console.log('✗ Insert failed:', err.message);
  }

  // Test 3: Select using .exec()
  console.log('\n3. Select using .exec()');
  try {
    const result = db.exec('SELECT * FROM test WHERE id = ?', [1]);
    console.log('Exec result:', result);
    if (result && result.length > 0 && result[0].values.length > 0) {
      console.log('First row:', result[0].values[0]);
    }
  } catch (err) {
    console.log('✗ Select failed:', err.message);
  }

  // Test 4: Try .get()
  console.log('\n4. Try .get()');
  const stmt = db.prepare('SELECT * FROM test WHERE id = ?');
  const result = stmt.get(1);
  console.log('Result:', result);

  console.log('\n✅ Tests complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});