#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  console.log('=== Debugging Tag Insert ===\n');

  // Create table
  db.run('CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY Key AUTOINCREMENT, name TEXT UNIQUE, created_at TEXT)');
  console.log('✓ Table created');

  // Test INSERT OR IGNORE
  console.log('\n1. Testing INSERT OR IGNORE:');
  db.run('INSERT OR IGNORE INTO tags (name, created_at) VALUES (?, datetime("now"))', ['test-tag']);
  console.log('✓ Insert executed');

  // Test SELECT
  console.log('\n2. Testing SELECT:');
  const stmt = db.prepare('SELECT * FROM tags WHERE name = ?');
  const result = stmt.get('test-tag');
  console.log('Result:', result);
  console.log('Type:', typeof result);
  console.log('Is array?', Array.isArray(result));
  console.log('Length:', Array.isArray(result) ? result.length : 'N/A');

  // Try COUNT
  console.log('\n3. Testing COUNT:');
  const countStmt = db.prepare('SELECT COUNT(*) FROM tags WHERE name = ?');
  const count = countStmt.get('test-tag');
  console.log('Count:', count);
  console.log('Count array?', Array.isArray(count));
  console.log('Count value:', Array.isArray(count) ? count[0] : 'N/A');

  // Try SELECT with LIMIT
  console.log('\n4. Testing SELECT with LIMIT 1:');
  const limitStmt = db.prepare('SELECT * FROM tags WHERE name = ? LIMIT 1');
  const limitResult = limitStmt.get('test-tag');
  console.log('Result:', limitResult);

  // Test INSERT OR REPLACE
  console.log('\n5. Testing INSERT OR REPLACE:');
  db.run('INSERT OR REPLACE INTO tags (name, created_at) VALUES (?, datetime("now"))', ['test-tag2']);
  const replaceStmt = db.prepare('SELECT * FROM tags WHERE name = ?');
  const replaceResult = replaceStmt.get('test-tag2');
  console.log('Result:', replaceResult);

  // Test using .exec to insert
  console.log('\n6. Testing INSERT via .exec():');
  db.exec('INSERT INTO tags (name, created_at) VALUES (?, datetime("now"))', ['test-tag3']);
  const execStmt = db.prepare('SELECT * FROM tags WHERE name = ?');
  const execResult = execStmt.get('test-tag3');
  console.log('Result:', execResult);

  console.log('\n✅ Debug complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
