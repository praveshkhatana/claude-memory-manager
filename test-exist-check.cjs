#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  // Create table
  db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');

  console.log('=== Test: Check if row exists using different methods ===\n');

  // Method 1: Insert
  console.log('1. Insert row with id=1');
  const insert = db.prepare('INSERT INTO test (id, name) VALUES (?, ?)');
  insert.run(1, 'test-name');
  insert.free();

  // Method 2: Check if exists using .get() and type check
  console.log('\n2. Try to retrieve row and check type');
  const stmt = db.prepare('SELECT * FROM test WHERE id = ?');
  const result = stmt.get(1);
  console.log('Result:', result);
  console.log('Result type:', typeof result);
  console.log('Result instanceof Array:', result instanceof Array);
  console.log('Result.length:', result.length);
  console.log('Result[0]:', result[0]);

  // Method 3: Use .exec() to check
  console.log('\n3. Try .exec() to check existence');
  const execResult = db.exec('SELECT * FROM test WHERE id = ?', [1]);
  console.log('execResult:', execResult);

  // Method 4: Try prepareRow
  console.log('\n4. Try prepareRow');
  const stmt2 = db.prepare('SELECT * from test WHERE id = ?');
  const row = stmt2.getRow();
  console.log('row:', row);

  console.log('\n✅ Tests complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});