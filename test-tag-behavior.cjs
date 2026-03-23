#!/usr/bin/env node

const initSqlJs = require('sql.js');
const fs = require('fs');

initSqlJs().then(SQL => {
  const db = new SQL.Database();

  // Create tables
  db.run('CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, created_at TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS tag_relations (conversation_id TEXT, tag_id INTEGER, created_at TEXT, PRIMARY KEY (conversation_id, tag_id))');

  // Test 1: Insert a tag
  console.log('=== Test 1: Insert tag ===');
  const insert1 = db.prepare('INSERT INTO tags (name, created_at) VALUES (?, datetime("now"))');
  insert1.run('test-tag');
  insert1.free();
  console.log('✓ Inserted tag: test-tag');

  // Test 2: Get tag using .get()
  console.log('\n=== Test 2: Get tag using .get() ===');
  const stmt = db.prepare('SELECT id FROM tags WHERE name = ?');
  const result = stmt.get('test-tag');
  console.log('Result type:', typeof result);
  console.log('Result value:', result);
  console.log('Result === []:', result === []);
  console.log('!result:', !result);

  // Test 3: Try to create relation with result
  console.log('\n=== Test 3: Try to create relation ===');
  const tagId = result ? result['id'] : null;
  console.log('tagId:', tagId);
  console.log('tagId === null:', tagId === null);
  console.log('tagId == null:', tagId == null);

  // Test 4: Try to create relation if falsy
  console.log('\n=== Test 4: Falsy check ===');
  const falsyCheck = !result;
  console.log('falsyCheck (!result):', falsyCheck);

  // Test 5: Check undefined
  console.log('\n=== Test 5: Undefined vs null ===');
  console.log('undefined === undefined:', undefined === undefined);
  console.log('null === null:', null === null);
  console.log('undefined == null:', undefined == null);

  console.log('\n✅ Tests complete');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});