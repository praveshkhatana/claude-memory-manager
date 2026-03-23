#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  console.log('=== Comparing Query Methods ===\n');

  // Create table and insert
  console.log('1. Create table and insert data\n');
  db.run('CREATE TABLE test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');
  db.run('INSERT INTO test (name) VALUES (?)', ['test-name']);
  console.log('✓ Insert succeeded\n');

  // Test different query methods
  console.log('2. Method 1: db.exec() with SELECT\n');
  const result1 = db.exec('SELECT * FROM test');
  console.log('Result:', result1);
  console.log('First row:', result1[0]?.values[0]);
  console.log('Values type:', typeof result1[0]?.values[0]);

  console.log('\n3. Method 2: db.exec() with SELECT COUNT\n');
  const result2 = db.exec('SELECT COUNT(*) FROM test');
  console.log('Result:', result2);
  console.log('Count:', result2[0]?.values[0][0]);

  console.log('\n4. Method 3: db.prepare().get()\n');
  const stmt = db.prepare('SELECT * FROM test');
  const result3 = stmt.get();
  console.log('Result:', result3);
  console.log('Is empty array:', Array.isArray(result3) && result3.length === 0);

  console.log('\n5. Method 4: db.prepare() with exec()\n');
  const stmt2 = db.prepare('SELECT * FROM test');
  const result4 = stmt2.exec();
  console.log('Result:', result4);
  console.log('First row:', result4[0]?.values[0]);

  console.log('\n6. Method 5: db.exec() with SELECT as text\n');
  const result5 = db.exec('SELECT name FROM test');
  console.log('Result:', result5);
  console.log('First row:', result5[0]?.values[0]);

  console.log('\n7. Check database content\n');
  const fs = require('fs');
  const data = db.export();
  console.log('Exported:', data.length, 'bytes');
  console.log('Can export to text:', Buffer.from(data).toString('utf-8').substring(0, 200));

  console.log('\n✅ Query method comparison complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
