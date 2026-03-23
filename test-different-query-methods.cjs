#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  console.log('=== Testing Different Query Methods ===\n');

  // Setup test data
  db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');

  // Test 1: Insert and get with .get()
  console.log('1. Insert and query with .get()');
  db.run('INSERT INTO test (name) VALUES (?)', ['test1']);
  const stmt1 = db.prepare('SELECT * FROM test');
  const result1 = stmt1.get();
  console.log('Result with .get():', result1);
  console.log('Type:', typeof result1);

  // Test 2: Insert and query with .exec() and check values
  console.log('\n2. Insert and query with .exec()');
  db.run('INSERT INTO test (name) VALUES (?)', ['test2']);
  const result2 = db.exec('SELECT * FROM test');
  console.log('Result with .exec():', result2);

  // Test 3: Query with .exec() and iterate
  console.log('\n3. Iterate through exec results');
  const result3 = db.exec('SELECT * FROM test');
  console.log('Number of result sets:', result3.length);
  
  for (let i = 0; i < result3.length; i++) {
    const resultSet = result3[i];
    console.log(`\nResultSet ${i}:`);
    console.log('  Columns:', resultSet.columns);
    console.log('  Values length:', resultSet.values.length);
    
    for (let j = 0; j < resultSet.values.length; j++) {
      const row = resultSet.values[j];
      console.log(`  Row ${j}:`, row);
    }
  }

  // Test 4: Prepare with .get() and check if it works
  console.log('\n4. Prepare and query with .get()');
  const stmt4 = db.prepare('SELECT * FROM test WHERE name = ?');
  const result4 = stmt4.get('test1');
  console.log('Result:', result4);

  // Test 5: Try .all() method if it exists
  console.log('\n5. Try .all() method');
  const stmt5 = db.prepare('SELECT * FROM test');
  const result5 = stmt5.all();
  console.log('Result with .all():', result5);

  // Test 6: Check database file
  console.log('\n6. Export and check database');
  const data = db.export();
  console.log('Database size:', data.length, 'bytes');

  // Test 7: Create in-memory database to compare
  console.log('\n7. Test with in-memory database');
  const db2 = new SQL.Database();
  db2.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY Key AUTOINCREMENT, name TEXT)');
  db2.run('INSERT INTO test (name) VALUES (?)', ['in-mem']);
  const stmt7 = db2.prepare('SELECT * FROM test');
  const result7 = stmt7.get();
  console.log('In-memory result:', result7);

  console.log('\n✅ Tests complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
