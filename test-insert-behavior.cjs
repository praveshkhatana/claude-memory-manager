#!/usr/bin/env node

const initSqlJs = require('sql.js');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  // Create tables
  db.run('CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, created_at TEXT)');

  // Test: Insert tag
  console.log('=== Test: Insert tag ===');
  const insert = db.prepare('INSERT INTO tags (name, created_at) VALUES (?, datetime("now"))');
  insert.run('test-tag');

  // Test: Try to get it
  console.log('\n=== Test: Get tag ===');
  const stmt = db.prepare('SELECT id FROM tags WHERE name = ?');
  const result = stmt.get('test-tag');
  console.log('Result:', result);
  console.log('Result type:', typeof result);

  // Test: Count rows
  console.log('\n=== Test: Count rows ===');
  const countStmt = db.prepare('SELECT COUNT(*) FROM tags');
  const count = countStmt.get();
  console.log('Count:', count);

  console.log('\n✅ Tests complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});