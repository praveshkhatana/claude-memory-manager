#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  // Create table
  db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');

  // Test 1: Insert
  console.log('=== Test 1: Insert row ===');
  const insert = db.prepare('INSERT INTO test (id, name) VALUES (?, ?)');
  insert.run(1, 'test-name');
  insert.free();
  console.log('✓ Inserted row');

  // Test 2: Select
  console.log('\n=== Test 2: Select row ===');
  const select = db.prepare('SELECT * FROM test WHERE id = ?');
  const result = select.get(1);
  console.log('Result:', result);
  console.log('Result === null:', result === null);

  // Test 3: Select non-existent
  console.log('\n=== Test 3: Select non-existent ===');
  const select2 = db.prepare('SELECT * FROM test WHERE id = ?');
  const result2 = select2.get(999);
  console.log('Result:', result2);
  console.log('Result === null:', result2 === null);

  // Test 4: Try to access property
  console.log('\n=== Test 4: Try to access property ===');
  if (result) {
    console.log('result.id:', result['id']);
  }

  console.log('\n✅ Tests complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});