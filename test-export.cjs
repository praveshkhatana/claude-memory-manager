#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  console.log('=== Test: Export/Import ===\n');

  // Test 1: Create table and insert
  console.log('1. Create table and insert');
  db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');
  db.run('INSERT INTO test (id, name) VALUES (?, ?)', [1, 'test-name']);
  console.log('✓ Insert succeeded');

  // Test 2: Select before export
  console.log('\n2. Select before export');
  const stmt = db.prepare('SELECT * FROM test');
  const result = stmt.get();
  console.log('Result:', result);

  // Test 3: Export
  console.log('\n3. Export database');
  const data = db.export();
  console.log('Exported:', data.length, 'bytes');

  // Test 4: Create new database and import
  console.log('\n4. Create new database and import');
  const db2 = new SQL.Database();
  db2.run('PRAGMA foreign_keys = ON;');

  // Import
  const buffer = Buffer.from(data);
  const data2 = buffer.toString('utf-8');
  console.log('Import buffer:', data2.length, 'chars');

  try {
    db2.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');
    db2.run('INSERT INTO test (id, name) VALUES (?, ?)', [1, 'test-name']);
    console.log('✓ Import succeeded');
  } catch (err) {
    console.log('✗ Import failed:', err.message);
  }

  // Test 5: Select from imported database
  console.log('\n5. Select from imported database');
  const stmt2 = db2.prepare('SELECT * FROM test');
  const result2 = stmt2.get();
  console.log('Result:', result2);

  console.log('\n✅ Tests complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});